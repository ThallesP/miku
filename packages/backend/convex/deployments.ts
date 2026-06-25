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

		// born "pending" — the server agent advances the status as it acts
		return ctx.db.insert("deployments", {
			...args,
			desiredStatus: "running",
			status: "pending",
		});
	},
});

// Intent "setters": the server agent advances the status as each step happens.
// Naming the transition (rather than passing a raw status string) keeps the
// vocabulary in one place at the call site.
export const markPulling = mutation({
	args: { id: v.id("deployments") },
	handler: (ctx, { id }) => ctx.db.patch(id, { status: "pulling" }),
});

export const markRunning = mutation({
	args: { id: v.id("deployments"), containerId: v.string() },
	handler: (ctx, { id, containerId }) =>
		ctx.db.patch(id, { status: "running", containerId }),
});

export const markFailed = mutation({
	args: { id: v.id("deployments"), message: v.string() },
	handler: (ctx, { id, message }) =>
		ctx.db.patch(id, { status: "failed", message }),
});

export const markStopped = mutation({
	args: { id: v.id("deployments") },
	handler: (ctx, { id }) => ctx.db.patch(id, { status: "stopped" }),
});
