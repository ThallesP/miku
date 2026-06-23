import { ConvexReactClient } from "convex/react";

// Points at the self-hosted Convex backend. One client for the whole app; its
// reactive subscriptions are what replace the old WebSocket canvas + SSE.
export const convex = new ConvexReactClient(
	import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3210",
);
