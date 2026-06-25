import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { appSourceValidator } from "./lib/apps";

// Replaces FetchApplicationsController.
export const list = query({
	args: {},
	handler: (ctx) => ctx.db.query("apps").collect(),
});

// Replaces CreateApplicationController + CreateApplicationUseCase. A service is
// born with its source (what to deploy); env is optional service-level config.
export const create = mutation({
	args: {
		name: v.string(),
		source: appSourceValidator,
		env: v.optional(v.record(v.string(), v.string())),
		x: v.number(),
		y: v.number(),
	},
	handler: (ctx, args) =>
		ctx.db.insert("apps", { ...args, createdAt: Date.now() }),
});

// Edit the service in place: rename, change its source, or set env. Only the
// fields the sidebar actually sends are patched. Existing deployments are frozen
// snapshots — they pick up changes on the next deploy, not retroactively.
export const update = mutation({
	args: {
		id: v.id("apps"),
		name: v.optional(v.string()),
		source: v.optional(appSourceValidator),
		env: v.optional(v.record(v.string(), v.string())),
	},
	handler: (ctx, { id, ...fields }) => ctx.db.patch(id, fields),
});

// Replaces the realtime canvas `move` RPC. Every open canvas re-renders from the
// reactive `list` query — no broadcaster, no WebSocket, no event bus.
export const move = mutation({
	args: { id: v.id("apps"), x: v.number(), y: v.number() },
	handler: (ctx, { id, x, y }) => ctx.db.patch(id, { x, y }),
});

// Delete a service. We don't delete its deployment rows here — that would orphan
// any running container, since the server agent only reaps rows it can still see.
// Instead we flip each to desiredStatus "removed"; the agent tears the container
// down and deletes the row itself (ensureRemoved → deployments.remove).
export const remove = mutation({
	args: { id: v.id("apps") },
	handler: async (ctx, { id }) => {
		const deployments = await ctx.db
			.query("deployments")
			.withIndex("by_app", (q) => q.eq("appId", id))
			.collect();
		await Promise.all(
			deployments.map((deployment) =>
				ctx.db.patch(deployment._id, { desiredStatus: "removed" }),
			),
		);
		await ctx.db.delete(id);
	},
});
