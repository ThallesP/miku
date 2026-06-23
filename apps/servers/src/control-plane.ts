import type { NetworkIdentity } from "@miku/network";

import { api, convex } from "./convex.ts";
import { deploymentObject } from "./deployment.ts";
import { connectIngress } from "./restate.ts";
import { serverObject } from "./server.ts";

// Find the control plane, self-register, then pump desired-state changes into our
// own Restate objects. This is pure glue: no decisions, no in-memory dedup, no status
// reporting — all of that now lives durably in the deployment object. Nothing reaches
// into the tailnet; the server only ever calls out.
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

	// Start the durable heartbeat; the server object re-arms its own beat thereafter,
	// and `start` retires any chain left over from a previous boot.
	ingress
		.objectSendClient(serverObject, serverId)
		.start()
		.catch((error) =>
			console.warn("[server] could not start heartbeat", error),
		);

	// Convex is just a durable change feed here: forward each desired-state change
	// into the deployment's object, which serializes and does the actual work. The
	// `lastDesired` map only trims chatter (Convex re-pushes the whole array on any
	// change) — correctness comes from the object's no-op + single-writer guarantee.
	const lastDesired = new Map<string, string>();
	convex.onUpdate(api.deployments.forServer, { serverId }, (deployments) => {
		for (const deployment of deployments) {
			const id = deployment._id;
			if (lastDesired.get(id) === deployment.desiredState) {
				continue;
			}
			lastDesired.set(id, deployment.desiredState);
			ingress
				.objectSendClient(deploymentObject, id)
				.reconcile({
					desiredState: deployment.desiredState,
					image: deployment.image,
					env: deployment.env,
					ports: deployment.ports,
				})
				.catch((error) => {
					// let the next update retry this row
					lastDesired.delete(id);
					console.warn("[server] could not enqueue reconcile", error);
				});
		}
	});
}
