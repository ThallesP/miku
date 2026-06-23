import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Single source of truth for the whole control plane. This replaces the MikroORM
// entities (Application/Server/Position) and every nestia DTO — the generated
// types flow straight to the web app and the workers.
export default defineSchema({
	// A draggable thing on the canvas + the spec of what to deploy. (Position is
	// inlined as x/y rather than an embedded value object.)
	apps: defineTable({
		name: v.string(),
		x: v.number(),
		y: v.number(),
		createdAt: v.number(),
	}),

	// A worker node that self-registered over Tailscale. Liveness (`online`) is
	// derived from `lastSeenAt` on the client so it can flip without a server
	// re-run; the worker patches `lastSeenAt` every 5s while alive.
	workers: defineTable({
		name: v.string(),
		address: v.string(),
		network: v.string(),
		lastSeenAt: v.number(),
	}).index("by_name", ["name"]),

	// Desired-state placement: "app should be running on this worker". The target
	// worker subscribes to its own rows (by_worker) and reconciles reality to match.
	deployments: defineTable({
		appId: v.id("apps"),
		workerId: v.id("workers"),
		image: v.string(),
		env: v.optional(v.record(v.string(), v.string())),
		ports: v.optional(v.array(v.string())),
		desiredState: v.union(v.literal("running"), v.literal("stopped")),
		status: v.union(
			v.literal("pending"),
			v.literal("pulling"),
			v.literal("running"),
			v.literal("failed"),
			v.literal("stopped"),
		),
		containerId: v.optional(v.string()),
		message: v.optional(v.string()),
		updatedAt: v.number(),
	})
		.index("by_worker", ["workerId"])
		.index("by_app", ["appId"]),
});
