import type * as restate from "@restatedev/restate-sdk";

// A durable step's settled outcome. Restate still retries inside ctx.run and applies
// asTerminalError; `attempt` only turns the FINAL result into a value, so handlers can
// branch on success/failure instead of wrapping ctx.run in a try/catch.
export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

// ctx.run throws when a step settles terminally — either the action throws a
// TerminalError, or a bounded retry policy (maxRetryAttempts/maxRetryDuration) is
// exhausted and Restate wraps the last error in a TerminalError. `attempt` catches that
// throw so the handler can record the failure instead of letting it escape.
export function attempt<T>(
	ctx: restate.ObjectContext,
	name: string,
	action: () => Promise<T>,
	options?: restate.RunOptions<T>,
): Promise<Outcome<T>> {
	const step = options ? ctx.run(name, action, options) : ctx.run(name, action);
	return step.then<Outcome<T>, Outcome<T>>(
		(value) => ({ ok: true, value }),
		(error) => ({
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		}),
	);
}
