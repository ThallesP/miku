import { ConvexClient } from "convex/browser";

import { env } from "./env.ts";

// One Convex connection per process, shared by the control-plane pump (which
// subscribes for desired-state changes) and the Restate handlers (which report
// observed state back). After this refactor Convex is only two things: a durable
// change feed and the sink the UI reads — never the orchestrator.
export { api } from "@miku/backend";

export const convex = new ConvexClient(env.CONVEX_URL);
