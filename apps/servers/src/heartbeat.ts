import type { Id } from "@miku/backend";
import * as restate from "@restatedev/restate-sdk";
import * as clients from "@restatedev/restate-sdk-clients";

import { api, convex } from "./convex.ts";

// How often a server stamps its own liveness. The control plane derives "online" from
// lastSeenAt against a ticking clock, so this only has to fire well inside that window.
const HEARTBEAT_INTERVAL_MS = 5_000;

// Liveness as a self-perpetuating Restate chain: one Virtual Object per server, keyed by its
// Convex id. Each `beat` stamps once and schedules the NEXT beat with a durable delayed
// self-send, so the invocation exits immediately instead of parking on a sleep — the journal
// stays a single step long rather than growing forever like a `while (true) { ctx.sleep }`
// loop would. The per-key single writer guarantees we never run two chains for one server.
export const heartbeatObject = restate.object({
	name: "heartbeat",
	handlers: {
		beat: async (ctx: restate.ObjectContext): Promise<void> => {
			const serverId = ctx.key as Id<"servers">;
			await ctx.run("beat", () =>
				convex.mutation(api.servers.heartbeat, { serverId }),
			);
			ctx
				.objectSendClient(heartbeatObject, serverId)
				.beat(restate.rpc.sendOpts({ delay: HEARTBEAT_INTERVAL_MS }));
		},
	},
});

// Kick the chain for a server. Idempotent on serverId: a process restart resumes the existing
// durable chain (Restate redelivers the pending self-send), so this re-kick is deduped instead
// of forking a second chain that would double-stamp every interval.
export function startHeartbeat(
	ingress: clients.Ingress,
	serverId: Id<"servers">,
): void {
	ingress
		.objectSendClient(heartbeatObject, serverId)
		.beat(clients.rpc.sendOpts({ idempotencyKey: serverId }))
		.catch((error) =>
			console.warn("[server] could not start heartbeat", error),
		);
}
