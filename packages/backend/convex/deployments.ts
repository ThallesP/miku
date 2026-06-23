import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { deploymentStatus } from "./lib/deployments";

// Stamp the derived status onto a row so every consumer reads `.status` like a
// stored field — the read-side "getter".
const withStatus = (deployment: Doc<"deployments">) => ({
	...deployment,
	status: deploymentStatus(deployment),
});

// For the dashboard: every deployment across every server, live.
export const list = query({
	args: {},
	handler: async (ctx) =>
		(await ctx.db.query("deployments").collect()).map(withStatus),
});

// The pull subscription: each server watches only the rows assigned to it.
export const forServer = query({
	args: { serverId: v.id("servers") },
	handler: async (ctx, { serverId }) =>
		(
			await ctx.db
				.query("deployments")
				.withIndex("by_server", (q) => q.eq("serverId", serverId))
				.collect()
		).map(withStatus),
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

		// no status field — a row with no lifecycle stamps derives to "pending"
		return ctx.db.insert("deployments", { ...args, desiredState: "running" });
	},
});

// Intent "setters": the server agent stamps each lifecycle moment as it happens.
// Naming the transition (rather than passing a status string) keeps the rule in
// one place and records when each step occurred.
export const markPulling = mutation({
	args: { id: v.id("deployments") },
	handler: (ctx, { id }) => ctx.db.patch(id, { pullingAt: Date.now() }),
});

export const markRunning = mutation({
	args: { id: v.id("deployments"), containerId: v.string() },
	handler: (ctx, { id, containerId }) =>
		ctx.db.patch(id, { runningAt: Date.now(), containerId }),
});

export const markFailed = mutation({
	args: { id: v.id("deployments"), message: v.string() },
	handler: (ctx, { id, message }) =>
		ctx.db.patch(id, { failedAt: Date.now(), message }),
});

export const markStopped = mutation({
	args: { id: v.id("deployments") },
	handler: (ctx, { id }) => ctx.db.patch(id, { stoppedAt: Date.now() }),
});
