import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// For the dashboard: every deployment across every worker, live.
export const list = query({
	args: {},
	handler: (ctx) => ctx.db.query("deployments").collect(),
});

// The pull subscription: each worker watches only the rows assigned to it.
export const forWorker = query({
	args: { workerId: v.id("workers") },
	handler: (ctx, { workerId }) =>
		ctx.db
			.query("deployments")
			.withIndex("by_worker", (q) => q.eq("workerId", workerId))
			.collect(),
});

// Deploy = write a row. `workerId` is the explicit placement (you pick the box).
export const create = mutation({
	args: {
		appId: v.id("apps"),
		workerId: v.id("workers"),
		image: v.string(),
		env: v.optional(v.record(v.string(), v.string())),
		ports: v.optional(v.array(v.string())),
	},
	handler: (ctx, args) =>
		ctx.db.insert("deployments", {
			...args,
			desiredState: "running",
			status: "pending",
			updatedAt: Date.now(),
		}),
});

// The worker reports observed reality back here as its local Restate workflow runs.
export const updateStatus = mutation({
	args: {
		id: v.id("deployments"),
		status: v.union(
			v.literal("pending"),
			v.literal("pulling"),
			v.literal("running"),
			v.literal("failed"),
			v.literal("stopped"),
		),
		containerId: v.optional(v.string()),
		message: v.optional(v.string()),
	},
	handler: (ctx, { id, ...rest }) => ctx.db.patch(id, { ...rest, updatedAt: Date.now() }),
});
