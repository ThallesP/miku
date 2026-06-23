import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Replaces FetchServersController. Returns raw rows; the UI derives `online` from
// `lastSeenAt` against a ticking clock so nodes flip offline without a server write.
export const list = query({
	args: {},
	handler: (ctx) => ctx.db.query("workers").collect(),
});

// PUBLIC, no auth (v1): a worker finds the control plane over Tailscale and calls
// this on boot. Replaces the entire discover → approve → push-provision dance.
// Idempotent by name so a restarting worker re-attaches instead of duplicating.
export const register = mutation({
	args: { name: v.string(), address: v.string(), network: v.string() },
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("workers")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				address: args.address,
				network: args.network,
				lastSeenAt: Date.now(),
			});
			return existing._id;
		}

		return ctx.db.insert("workers", { ...args, lastSeenAt: Date.now() });
	},
});

// Replaces HeartbeatServerController. The worker patches its own liveness every 5s.
export const heartbeat = mutation({
	args: { workerId: v.id("workers") },
	handler: (ctx, { workerId }) => ctx.db.patch(workerId, { lastSeenAt: Date.now() }),
});
