import { type Infer, v } from "convex/values";

// Single source of truth for the deployment lifecycle status. Stored directly on
// the row (the server agent writes it as it drives the container) and shared with
// the web app so both sides speak the same vocabulary — the Convex analogue of a
// shared enum. "pending" is the initial value before the server has acted.
export const deploymentStatusValidator = v.union(
	v.literal("pending"),
	v.literal("pulling"),
	v.literal("running"),
	v.literal("failed"),
	v.literal("stopped"),
);

export type DeploymentStatus = Infer<typeof deploymentStatusValidator>;
