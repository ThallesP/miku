import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { imageForSource } from "./lib/apps";

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

// Deploy = write a row. You supply only the placement (which app, which box); the
// image and env are snapshotted from the app so the deployment is a frozen record
// of what was placed. Ports aren't passed — the server agent derives them from the
// image's exposed ports.
export const create = mutation({
	args: {
		appId: v.id("apps"),
		serverId: v.id("servers"),
	},
	handler: async (ctx, { appId, serverId }) => {
		const [app, server] = await Promise.all([
			ctx.db.get(appId),
			ctx.db.get(serverId),
		]);

		if (!app) {
			throw new Error("Application not found");
		}

		if (!server) {
			throw new Error("Server not found");
		}

		// born "pending" — the server agent advances the status as it acts
		return ctx.db.insert("deployments", {
			appId,
			serverId,
			image: imageForSource(app.source),
			env: app.env,
			desiredStatus: "running",
			status: "pending",
		});
	},
});

// Stop intent: flip desired state so the control plane routes the row to the
// server's ensureStopped handler. The observed `status` follows once the agent
// has torn the container down (markStopped).
export const stop = mutation({
	args: { id: v.id("deployments") },
	handler: (ctx, { id }) => ctx.db.patch(id, { desiredStatus: "stopped" }),
});

// The final step of removal, called by the server agent once it has torn the
// container down (ensureRemoved). Tolerant of an already-deleted row so the
// control plane's redundant calls stay free. Deleting the row here — rather than
// in apps.remove — is what guarantees a running container is reaped first.
export const remove = mutation({
	args: { id: v.id("deployments") },
	handler: async (ctx, { id }) => {
		if (await ctx.db.get(id)) {
			await ctx.db.delete(id);
		}
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
