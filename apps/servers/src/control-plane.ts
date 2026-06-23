import { api, type DeploymentStatus, type Doc } from "@miku/backend";
import type { NetworkIdentity } from "@miku/network";
import * as clients from "@restatedev/restate-sdk-clients";
import { ConvexClient } from "convex/browser";

import { connectDeployer } from "./deployer.ts";
import { env } from "./env.ts";

// the forServer query stamps the derived status onto each row
type Deployment = Doc<"deployments"> & { status: DeploymentStatus };

// Desired vs current (derived) state → the one action this row needs, if any.
// "pulling" is re-picked so a deploy interrupted by a crash resumes; Restate's
// idempotency key collapses the re-invocation onto the same execution.
function nextAction(d: Deployment): "run" | "stop" | null {
	if (
		d.desiredState === "running" &&
		(d.status === "pending" || d.status === "pulling")
	) {
		return "run";
	}
	if (d.desiredState === "stopped" && d.status !== "stopped") {
		return "stop";
	}
	return null;
}

// Find the control plane, self-register, and reconcile our own deployments by
// driving our OWN local Restate ingress (localhost). Nothing reaches into the
// tailnet — the server only ever calls out.
export async function startControlPlane(
	identity: NetworkIdentity,
): Promise<void> {
	const convex = new ConvexClient(env.CONVEX_URL);
	const deployer = connectDeployer();
	const inflight = new Set<string>();

	const serverId = await convex.mutation(api.servers.register, {
		name: identity.name,
		address: identity.address,
		network: identity.network,
	});
	console.log(`[server] registered with control plane as ${serverId}`);

	setInterval(() => {
		void convex.mutation(api.servers.heartbeat, { serverId }).catch(() => {});
	}, 5000);

	convex.onUpdate(api.deployments.forServer, { serverId }, (deployments) => {
		for (const deployment of deployments) {
			void reconcile(deployment);
		}
	});

	async function reconcile(deployment: Deployment): Promise<void> {
		const action = nextAction(deployment);
		if (!action || inflight.has(deployment._id)) {
			return;
		}

		const id = deployment._id;
		inflight.add(id);
		try {
			if (action === "run") {
				await report(() =>
					convex.mutation(api.deployments.markPulling, { id }),
				);
				const containerId = await deployer.run(
					{
						name: id,
						image: deployment.image,
						env: deployment.env,
						ports: deployment.ports,
					},
					clients.rpc.opts({ idempotencyKey: id }),
				);
				await report(() =>
					convex.mutation(api.deployments.markRunning, { id, containerId }),
				);
			} else {
				await deployer.stop(
					{ name: id },
					clients.rpc.opts({ idempotencyKey: `${id}:stop` }),
				);
				await report(() =>
					convex.mutation(api.deployments.markStopped, { id }),
				);
			}
		} catch (error) {
			// the durable workflow itself failed — surface it as `failed`
			await report(() =>
				convex.mutation(api.deployments.markFailed, {
					id,
					message: errorMessage(error),
				}),
			);
		} finally {
			inflight.delete(id);
		}
	}
}

// Status reports are best-effort: the deploy already happened, so a failed report
// must not be mistaken for a failed deploy.
async function report(op: () => Promise<unknown>): Promise<void> {
	try {
		await op();
	} catch (error) {
		console.warn("[server] could not report deployment status", error);
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
