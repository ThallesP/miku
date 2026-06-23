import type { Id } from "@miku/backend";
import * as restate from "@restatedev/restate-sdk";

import { api, convex } from "./convex.ts";
import { removeContainer, runContainer } from "./docker.ts";

// What the pump forwards out of a Convex row — the desired state plus everything
// needed to realize it. The object decides what to do by comparing this against its
// OWN durable phase, never against Convex's derived status.
export type DeploymentSpec = {
	desiredState: "running" | "stopped";
	image: string;
	env?: Record<string, string>;
	ports?: string[];
};

// The object's operational truth, held in Restate's keyed state and surviving any
// crash. "idle" is the unset default (a fresh deployment); the rest are terminal for
// a given desired state, which is what keeps redundant reconciles free.
type Phase = "idle" | "running" | "stopped" | "failed";

// The durable docker step is bounded: a real failure (bad image, port taken) must
// surface as a throw — reported as `failed` — instead of retrying forever.
const RETRY: restate.RunOptions<string> = { maxRetryAttempts: 5 };
// Status reports are durable too now, but still bounded so a prolonged Convex outage
// can't wedge the object's single writer.
const REPORT_RETRY: restate.RunOptions<unknown> = { maxRetryAttempts: 5 };

// One Virtual Object per deployment, keyed by its Convex id. The single-writer
// guarantee per key replaces the old in-memory `inflight` set: concurrent reconciles
// for the same deployment serialize automatically, durably.
export const deploymentObject = restate.object({
	name: "deployment",
	handlers: {
		reconcile,
	},
});

// Desired vs current (durable phase) → the one action this deployment needs, if any.
// Mirrors the old nextAction(): only a fresh deployment runs (a failed or already-
// running one is left alone), and stop is a no-op once stopped. Crash-resume is
// handled by Restate replaying this invocation's journal, so there's no "pulling"
// re-pick to do here.
async function reconcile(
	ctx: restate.ObjectContext,
	spec: DeploymentSpec,
): Promise<void> {
	const id = ctx.key as Id<"deployments">;
	const phase = (await ctx.get<Phase>("phase")) ?? "idle";

	if (spec.desiredState === "running" && phase === "idle") {
		await run(ctx, id, spec);
	} else if (spec.desiredState === "stopped" && phase !== "stopped") {
		await stop(ctx, id);
	}
}

async function run(
	ctx: restate.ObjectContext,
	id: Id<"deployments">,
	spec: DeploymentSpec,
): Promise<void> {
	try {
		await report(ctx, "report pulling", () =>
			convex.mutation(api.deployments.markPulling, { id }),
		);
		const containerId = await ctx.run(
			"docker run",
			() =>
				runContainer({
					name: id,
					image: spec.image,
					env: spec.env,
					ports: spec.ports,
				}),
			RETRY,
		);
		ctx.set("containerId", containerId);
		ctx.set<Phase>("phase", "running");
		await report(ctx, "report running", () =>
			convex.mutation(api.deployments.markRunning, { id, containerId }),
		);
	} catch (error) {
		// the durable step gave up (or hit a TerminalError) — surface it as `failed`
		ctx.set<Phase>("phase", "failed");
		await report(ctx, "report failed", () =>
			convex.mutation(api.deployments.markFailed, {
				id,
				message: errorMessage(error),
			}),
		);
	}
}

async function stop(
	ctx: restate.ObjectContext,
	id: Id<"deployments">,
): Promise<void> {
	await ctx.run("docker stop", () => removeContainer(id));
	ctx.clear("containerId");
	ctx.set<Phase>("phase", "stopped");
	await report(ctx, "report stopped", () =>
		convex.mutation(api.deployments.markStopped, { id }),
	);
}

// The work already happened and is journaled, so a failed status report must not be
// mistaken for a failed deploy: report durably (bounded retries), but swallow a final
// failure with a warning.
async function report(
	ctx: restate.ObjectContext,
	name: string,
	op: () => Promise<unknown>,
): Promise<void> {
	try {
		await ctx.run(name, op, REPORT_RETRY);
	} catch (error) {
		console.warn(`[deployment] could not ${name}`, error);
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
