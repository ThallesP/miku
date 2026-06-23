import type { Id } from "@miku/backend";
import * as restate from "@restatedev/restate-sdk";

import { api, convex } from "./convex.ts";

// The control plane derives "online" from lastSeenAt against a ticking clock, so
// liveness is just: keep stamping lastSeenAt. We make that a durable Restate cron
// instead of a setInterval — see beat().
const BEAT_INTERVAL_MS = 5_000;

// One Virtual Object per server, keyed by its Convex id, holding a single heartbeat
// chain. `start` (called once per agent boot) bumps a generation and launches a fresh
// chain; `beat` stamps lastSeenAt then re-arms itself 5s out — but only while it is
// still the current generation, so a restart's new chain retires any chain left over
// from a prior boot. Exactly one beat is ever in flight: a host outage just pauses the
// chain (lastSeenAt goes stale, the UI flips the node offline) and it resumes on boot.
export const serverObject = restate.object({
	name: "server",
	handlers: {
		start: async (ctx: restate.ObjectContext): Promise<void> => {
			const generation = ((await ctx.get<number>("generation")) ?? 0) + 1;
			ctx.set("generation", generation);
			ctx.objectSendClient(serverObject, ctx.key).beat(generation);
		},
		beat: async (
			ctx: restate.ObjectContext,
			generation: number,
		): Promise<void> => {
			if (generation !== (await ctx.get<number>("generation"))) {
				return; // superseded by a newer boot — let this chain die out
			}
			await ctx.run("heartbeat", () =>
				convex.mutation(api.servers.heartbeat, {
					serverId: ctx.key as Id<"servers">,
				}),
			);
			ctx
				.objectSendClient(serverObject, ctx.key)
				.beat(generation, restate.rpc.sendOpts({ delay: BEAT_INTERVAL_MS }));
		},
	},
});
