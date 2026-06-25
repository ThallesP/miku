import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { deploymentStatusValidator } from "./lib/deployments";

// Single source of truth for the whole control plane. This replaces the MikroORM
// entities (Application/Server/Position) and every nestia DTO — the generated
// types flow straight to the web app and the servers.
export default defineSchema({
	// A draggable thing on the canvas + the spec of what to deploy. (Position is
	// inlined as x/y rather than an embedded value object.)
	apps: defineTable({
		name: v.string(),
		x: v.number(),
		y: v.number(),
		createdAt: v.number(),
	}),

	// A server node that self-registered over Tailscale. Liveness (`online`) is
	// derived from `lastSeenAt` on the client so it can flip without a server
	// re-run; the server patches `lastSeenAt` every 5s while alive.
	servers: defineTable({
		name: v.string(),
		address: v.string(),
		network: v.union(v.literal("tailscale"), v.literal("local")),
		lastSeenAt: v.number(),
	}).index("by_name", ["name"]),

	// Desired-state placement: "app should be running on this server". The target
	// server subscribes to its own rows (by_server) and reconciles reality to match.
	deployments: defineTable({
		appId: v.id("apps"),
		serverId: v.id("servers"),
		image: v.string(),
		env: v.optional(v.record(v.string(), v.string())),
		ports: v.optional(v.array(v.string())),
		desiredState: v.union(v.literal("running"), v.literal("stopped")),
		// Observed lifecycle status, written directly by the server agent as it
		// drives the container (pending → pulling → running | failed | stopped).
		// The row's _creationTime is the "created" stamp.
		status: deploymentStatusValidator,
		containerId: v.optional(v.string()),
		message: v.optional(v.string()),
	})
		.index("by_server", ["serverId"])
		.index("by_app", ["appId"]),
});
