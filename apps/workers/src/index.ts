import os from "node:os";

import { api, type Doc } from "@miku/backend";
import { joinNetwork } from "@miku/network";
import * as restate from "@restatedev/restate-sdk";
import * as clients from "@restatedev/restate-sdk-clients";
import { ConvexClient } from "convex/browser";

import { deployer } from "./deployer.ts";

const workerName = process.env.WORKER_NAME ?? os.hostname();
const restatePort = Number(process.env.RESTATE_PORT ?? 9080);
const restateIngress =
	process.env.RESTATE_INGRESS_URL ?? "http://localhost:8080";
const restateAdmin = process.env.RESTATE_ADMIN_URL ?? "http://localhost:9070";
// how the Restate server (running in Docker) reaches this worker's service, which
// listens on the host — host.docker.internal bridges container → host
const serviceUrl =
	process.env.RESTATE_SERVICE_URL ??
	`http://host.docker.internal:${restatePort}`;
const convexUrl = process.env.CONVEX_URL ?? "http://localhost:3210";

type DeploymentStatusUpdate = {
	id: Doc<"deployments">["_id"];
	status: Doc<"deployments">["status"];
	containerId?: string;
	message?: string;
};

// 1. Join the tailnet. Tailscale stays purely worker-side; nothing reaches back in.
const identity = await joinNetwork(workerName, {
	advertiseTags: ["tag:miku-worker"],
});

// 2. Serve our local, durable deploy workflow and tell the Restate server about it.
restate.serve({ services: [deployer], port: restatePort });
console.log(`[restate] deployer serving on :${restatePort}`);
await registerWithRestate();

// 3. Find the control plane and self-register. Public mutation, no auth in v1 —
//    this single call replaces the old discover → approve → push-provision flow.
const convex = new ConvexClient(convexUrl);
const workerId = await convex.mutation(api.workers.register, {
	name: identity.name,
	address: identity.address,
	network: identity.network,
});
console.log(`[worker] registered with control plane as ${workerId}`);

// 4. Heartbeat liveness.
setInterval(() => {
	void convex.mutation(api.workers.heartbeat, { workerId }).catch(() => {});
}, 5000);

// 5. Pull trigger: subscribe to the deployments assigned to us and reconcile each
//    by driving our OWN local Restate ingress (localhost) — zero reach-in.
const restateClient = clients.connect({ url: restateIngress });
// typed from the service definition value — gives us .run()/.stop()
const deployerClient = restateClient.serviceClient(deployer);
const inflight = new Set<string>();

convex.onUpdate(api.deployments.forWorker, { workerId }, (deployments) => {
	for (const deployment of deployments) {
		void reconcile(deployment);
	}
});

async function reconcile(deployment: Doc<"deployments">): Promise<void> {
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
			await updateDeploymentStatus({
				id: deployment._id,
				status: "pulling",
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

				await tryReportDeploymentStatus({
					id: deployment._id,
					status: "running",
					containerId,
				});
			} catch (error) {
				await tryReportDeploymentStatus({
					id: deployment._id,
					status: "failed",
					message: errorMessage(error),
				});
			}
		} else {
			try {
				await deployerClient.stop(
					{ name: deployment._id },
					clients.rpc.opts({ idempotencyKey: `${deployment._id}:stop` }),
				);

				await tryReportDeploymentStatus({
					id: deployment._id,
					status: "stopped",
				});
			} catch (error) {
				await tryReportDeploymentStatus({
					id: deployment._id,
					status: "failed",
					message: errorMessage(error),
				});
			}
		}
	} catch (error) {
		console.warn(
			`[worker] could not reconcile deployment ${deployment._id}`,
			error,
		);
	} finally {
		inflight.delete(deployment._id);
	}
}

function updateDeploymentStatus(update: DeploymentStatusUpdate) {
	return convex.mutation(api.deployments.updateStatus, update);
}

async function tryReportDeploymentStatus(update: DeploymentStatusUpdate) {
	try {
		await updateDeploymentStatus(update);
	} catch (error) {
		console.warn(
			`[worker] could not report deployment ${update.id} as ${update.status}`,
			error,
		);
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
