import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// For the dashboard: every deployment across every server, live.
export const list = query({
	args: {},
	handler: (ctx) => ctx.db.query("deployments").collect(),
});

// The pull subscription: each server watches only the rows assigned to it.
export const forServer = query({
	args: { serverId: v.id("servers") },
	handler: (ctx, { serverId }) =>
		ctx.db
			.query("deployments")
			.withIndex("by_server", (q) => q.eq("serverId", serverId))
			.collect(),
});

// Deploy = write a row. `serverId` is the explicit placement (you pick the box).
export const create = mutation({
	args: {
		appId: v.id("apps"),
		serverId: v.id("servers"),
		image: v.string(),
		env: v.optional(v.record(v.string(), v.string())),
		ports: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const [app, server] = await Promise.all([
			ctx.db.get(args.appId),
			ctx.db.get(args.serverId),
		]);

		if (!app) {
			throw new Error("Application not found");
		}

		if (!server) {
			throw new Error("Server not found");
		}

		return ctx.db.insert("deployments", {
			...args,
			desiredState: "running",
			status: "pending",
			updatedAt: Date.now(),
		});
	},
});

// The server reports observed reality back here as its local Restate workflow runs.
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
