import type { Doc } from "../_generated/dataModel";

// Convex documents are plain data — no methods, so no entity getter. The clean
// equivalent is a pure derive function shared by everyone: the backend stamps it
// onto each row it returns, and the web imports the same function. Status is
// computed from lifecycle timestamps, which also gives a free timeline
// (createdAt → pullingAt → runningAt) for durations.
export type DeploymentStatus =
	| "pending"
	| "pulling"
	| "running"
	| "failed"
	| "stopped";

export function deploymentStatus(
	deployment: Doc<"deployments">,
): DeploymentStatus {
	if (deployment.failedAt !== undefined) {
		return "failed";
	}
	if (deployment.stoppedAt !== undefined) {
		return "stopped";
	}
	if (deployment.runningAt !== undefined) {
		return "running";
	}
	if (deployment.pullingAt !== undefined) {
		return "pulling";
	}
	return "pending";
}
