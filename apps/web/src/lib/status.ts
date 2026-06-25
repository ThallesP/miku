import type { DeploymentStatus } from "@miku/backend";

// One vocabulary for how each lifecycle status looks, shared by the canvas node
// badge and the service sidebar so they never drift. Colors mirror the backend's
// pending → pulling → running | failed | stopped progression.
export const STATUS_BADGE_CLASS: Record<DeploymentStatus, string> = {
	pending: "border-slate-200 bg-slate-100 text-slate-600",
	pulling: "border-amber-200 bg-amber-100 text-amber-700",
	running: "border-emerald-200 bg-emerald-100 text-emerald-700",
	failed: "border-red-200 bg-red-100 text-red-700",
	stopped: "border-slate-200 bg-slate-100 text-slate-500",
};

export const STATUS_DOT_CLASS: Record<DeploymentStatus, string> = {
	pending: "bg-slate-400",
	pulling: "bg-amber-500 animate-pulse",
	running: "bg-emerald-500",
	failed: "bg-red-500",
	stopped: "bg-slate-400",
};

// A status counts as "live" while the deployment is still meant to be up — i.e.
// the placement is active. stopped/failed are resting states the user can deploy
// over.
export function isActiveStatus(status: DeploymentStatus): boolean {
	return status === "pending" || status === "pulling" || status === "running";
}
