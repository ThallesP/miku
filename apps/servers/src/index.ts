import os from "node:os";

import { api, type DeploymentStatus, type Doc } from "@miku/backend";
import { joinNetwork } from "@miku/network";
import * as restate from "@restatedev/restate-sdk";
import * as clients from "@restatedev/restate-sdk-clients";
import { ConvexClient } from "convex/browser";

import { deployer } from "./deployer.ts";

const serverName = process.env.SERVER_NAME ?? os.hostname();
const restatePort = Number(process.env.RESTATE_PORT ?? 9080);
const restateIngress =
	process.env.RESTATE_INGRESS_URL ?? "http://localhost:8080";
const restateAdmin = process.env.RESTATE_ADMIN_URL ?? "http://localhost:9070";
// how the Restate server (running in Docker) reaches this server's service, which
// listens on the host — host.docker.internal bridges container → host
const serviceUrl =
	process.env.RESTATE_SERVICE_URL ??
	`http://host.docker.internal:${restatePort}`;
const convexUrl = process.env.CONVEX_URL ?? "http://localhost:3210";

// the forServer query returns each row with its derived status stamped on
type Deployment = Doc<"deployments"> & { status: DeploymentStatus };

// 1. Join the tailnet. Tailscale stays purely server-side; nothing reaches back in.
const identity = await joinNetwork(serverName, {
	advertiseTags: ["tag:miku-server"],
});

// 2. Serve our local, durable deploy workflow and tell the Restate server about it.
restate.serve({ services: [deployer], port: restatePort });
console.log(`[restate] deployer serving on :${restatePort}`);
await registerWithRestate();

// 3. Find the control plane and self-register. Public mutation, no auth in v1 —
//    this single call replaces the old discover → approve → push-provision flow.
const convex = new ConvexClient(convexUrl);
const serverId = await convex.mutation(api.servers.register, {
	name: identity.name,
	address: identity.address,
	network: identity.network,
});
console.log(`[server] registered with control plane as ${serverId}`);

// 4. Heartbeat liveness.
setInterval(() => {
	void convex.mutation(api.servers.heartbeat, { serverId }).catch(() => {});
}, 5000);

// 5. Pull trigger: subscribe to the deployments assigned to us and reconcile each
//    by driving our OWN local Restate ingress (localhost) — zero reach-in.
const restateClient = clients.connect({ url: restateIngress });
// typed from the service definition value — gives us .run()/.stop()
const deployerClient = restateClient.serviceClient(deployer);
const inflight = new Set<string>();

convex.onUpdate(api.deployments.forServer, { serverId }, (deployments) => {
	for (const deployment of deployments) {
		void reconcile(deployment);
	}
});

async function reconcile(deployment: Deployment): Promise<void> {
	if (inflight.has(deployment._id)) {
		return;
	}

	// re-pick "pulling" too so a deploy interrupted by a crash resumes (the Restate
	// idempotency key makes the re-invocation collapse onto the same execution)
	const wantsRun =
		deployment.desiredState === "running" &&
		(deployment.status === "pending" || deployment.status === "pulling");
	const wantsStop =
		deployment.desiredState === "stopped" && deployment.status !== "stopped";

	if (!wantsRun && !wantsStop) {
		return;
	}

	inflight.add(deployment._id);
	try {
		if (wantsRun) {
			await convex.mutation(api.deployments.markPulling, {
				id: deployment._id,
			});

			try {
				const { containerId } = await deployerClient.run(
					{
						name: deployment._id,
						image: deployment.image,
						env: deployment.env,
						ports: deployment.ports,
					},
					clients.rpc.opts({ idempotencyKey: deployment._id }),
				);

				await report(() =>
					convex.mutation(api.deployments.markRunning, {
						id: deployment._id,
						containerId,
					}),
				);
			} catch (error) {
				await report(() =>
					convex.mutation(api.deployments.markFailed, {
						id: deployment._id,
						message: errorMessage(error),
					}),
				);
			}
		} else {
			try {
				await deployerClient.stop(
					{ name: deployment._id },
					clients.rpc.opts({ idempotencyKey: `${deployment._id}:stop` }),
				);

				await report(() =>
					convex.mutation(api.deployments.markStopped, {
						id: deployment._id,
					}),
				);
			} catch (error) {
				await report(() =>
					convex.mutation(api.deployments.markFailed, {
						id: deployment._id,
						message: errorMessage(error),
					}),
				);
			}
		}
	} catch (error) {
		console.warn(
			`[server] could not reconcile deployment ${deployment._id}`,
			error,
		);
	} finally {
		inflight.delete(deployment._id);
	}
}

// status reports are best-effort: a failed report must not be mistaken for a
// failed deploy (the deploy already happened), so we swallow + log.
async function report(op: () => Promise<unknown>) {
	try {
		await op();
	} catch (error) {
		console.warn("[server] could not report deployment status", error);
	}
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

// Register our service endpoint with the local Restate server (retrying while it
// boots) so the ingress can route invocations to our handlers.
async function registerWithRestate(attempt = 0): Promise<void> {
	try {
		const response = await fetch(`${restateAdmin}/deployments`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ uri: serviceUrl, force: true }),
		});

		if (!response.ok) {
			throw new Error(
				`admin responded ${response.status}: ${await response.text()}`,
			);
		}

		console.log(`[restate] registered deployment ${serviceUrl}`);
	} catch (error) {
		if (attempt >= 15) {
			throw new Error(
				`[restate] could not register deployment after ${attempt + 1} attempts: ${errorMessage(error)}`,
			);
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
		return registerWithRestate(attempt + 1);
	}
}
