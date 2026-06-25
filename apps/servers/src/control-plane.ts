import type { NetworkIdentity } from "@miku/network";

import { api, convex } from "./convex.ts";
import { applyDeployment } from "./deployment.ts";
import { startHeartbeat } from "./heartbeat.ts";
import { connectIngress } from "./restate.ts";

// Find the control plane, self-register, keep our liveness fresh, then pump desired-state
// changes into our per-deployment Restate objects. Pure glue: no decisions, no in-memory
// dedup, no status bookkeeping — the deployment object owns all of that durably. Nothing
// reaches into the tailnet; the server only ever calls out.
export async function startControlPlane(
	identity: NetworkIdentity,
): Promise<void> {
	const ingress = connectIngress();

	const serverId = await convex.mutation(api.servers.register, {
		name: identity.name,
		address: identity.address,
		network: identity.network,
	});
	console.log(`[server] registered with control plane as ${serverId}`);

	startHeartbeat(ingress, serverId);

	// Convex is a durable change feed: for every row, call the deployment object handler
	// that matches its desired state and let the object do the actual work. Redundant
	// calls (Convex re-sends the whole array on any change, and our own status writes
	// re-fire this subscription) are free — the per-key single writer runs them after
	// the in-flight handler commits a terminal state, so the duplicate just no-ops.
	convex.onUpdate(api.deployments.forServer, { serverId }, (deployments) => {
		for (const deployment of deployments) {
			applyDeployment[deployment.desiredState](ingress, deployment).catch(
				(error) => console.warn("[server] could not enqueue deployment", error),
			);
		}
	});
}
