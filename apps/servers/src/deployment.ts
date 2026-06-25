import type { Doc, Id } from "@miku/backend";
import * as restate from "@restatedev/restate-sdk";
import type * as clients from "@restatedev/restate-sdk-clients";

import { api, convex } from "./convex.ts";
import {
	ContainerStartError,
	removeContainer,
	runContainer,
} from "./docker.ts";
import { attempt } from "./durable.ts";

// No `desiredStatus` field: the desire is encoded in WHICH handler the control plane calls.
export type RunSpec = {
	image: string;
	env?: Record<string, string>;
	ports?: string[];
};

// Durable, crash-surviving outcome. Terminal states make the control plane's redundant calls
// free — the handler no-ops instead of re-running. Unset means we've never acted.
type State = "running" | "failed" | "stopped";

// Bound retries so a transient docker/registry blip surfaces as `failed` instead of looping.
const RETRY: restate.RunOptions<string> = { maxRetryAttempts: 5 };

// One Virtual Object per deployment, keyed by its Convex id. Per-key single-writer plus the
// durable `state` make concurrent and duplicate calls idempotent. Each handler is one
// level-triggered intent, never a branch in a reconcile matrix.
export const deploymentObject = restate.object({
	name: "deployment",
	handlers: {
		ensureRunning: async (
			ctx: restate.ObjectContext,
			spec: RunSpec,
		): Promise<void> => {
			const state = await ctx.get<State>("state");
			if (state === "running" || state === "failed") {
				return;
			}
			const id = ctx.key as Id<"deployments">;

			await ctx.run("mark pulling", () =>
				convex.mutation(api.deployments.markPulling, { id }),
			);

			const started = await attempt(
				ctx,
				"docker run",
				() => runContainer({ name: id, ...spec }),
				RETRY,
			);

			if (!started.ok) {
				// `failed` is terminal, so a re-push never retries the bad deploy.
				ctx.set<State>("state", "failed");
				await ctx.run("mark failed", () =>
					convex.mutation(api.deployments.markFailed, {
						id,
						message: started.error,
					}),
				);
				return;
			}

			ctx.set("containerId", started.value);
			ctx.set<State>("state", "running");
			await ctx.run("mark running", () =>
				convex.mutation(api.deployments.markRunning, {
					id,
					containerId: started.value,
				}),
			);
		},

		ensureStopped: async (ctx: restate.ObjectContext): Promise<void> => {
			if ((await ctx.get<State>("state")) === "stopped") {
				return;
			}
			const id = ctx.key as Id<"deployments">;

			await ctx.run("docker stop", () => removeContainer(id));
			ctx.clear("containerId");
			ctx.set<State>("state", "stopped");
			await ctx.run("mark stopped", () =>
				convex.mutation(api.deployments.markStopped, { id }),
			);
		},
	},
	options: {
		// A refused start is terminal; everything else stays retryable.
		asTerminalError: (error) =>
			error instanceof ContainerStartError
				? new restate.TerminalError(error.message)
				: undefined,
	},
});

// desiredStatus → the handler that drives it, so the control plane just indexes by status and
// forwards the row. A new desired status is a new entry here, never a reconcile arg on the object.
export const applyDeployment: Record<
	Doc<"deployments">["desiredStatus"],
	(
		ingress: clients.Ingress,
		deployment: Doc<"deployments">,
	) => Promise<clients.Send<void>>
> = {
	running: (ingress, d) =>
		ingress
			.objectSendClient(deploymentObject, d._id)
			.ensureRunning({ image: d.image, env: d.env, ports: d.ports }),
	stopped: (ingress, d) =>
		ingress.objectSendClient(deploymentObject, d._id).ensureStopped(),
};
