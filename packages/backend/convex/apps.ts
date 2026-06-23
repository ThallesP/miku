import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Replaces FetchApplicationsController.
export const list = query({
	args: {},
	handler: (ctx) => ctx.db.query("apps").collect(),
});

// Replaces CreateApplicationController + CreateApplicationUseCase.
export const create = mutation({
	args: { name: v.string(), x: v.number(), y: v.number() },
	handler: (ctx, args) => ctx.db.insert("apps", { ...args, createdAt: Date.now() }),
});

// Replaces the realtime canvas `move` RPC. Every open canvas re-renders from the
// reactive `list` query — no broadcaster, no WebSocket, no event bus.
export const move = mutation({
	args: { id: v.id("apps"), x: v.number(), y: v.number() },
	handler: (ctx, { id, x, y }) => ctx.db.patch(id, { x, y }),
});
