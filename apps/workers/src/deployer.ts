import { spawn } from "node:child_process";

import * as restate from "@restatedev/restate-sdk";

// The durable hands. Each `ctx.run` step is journaled by Restate: on a crash mid
// deploy it resumes from the last completed step instead of starting over, and a
// re-invocation with the same idempotency key collapses to one execution.

type DeployInput = {
	// container name — we use the Convex deployment id so re-deploys are idempotent
	name: string;
	image: string;
	env?: Record<string, string>;
	ports?: string[];
};

function docker(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn("docker", args);
		let out = "";
		let err = "";
		proc.stdout.on("data", (d) => {
			out += d;
		});
		proc.stderr.on("data", (d) => {
			err += d;
		});
		proc.on("error", reject);
		proc.on("close", (code) => {
			if (code === 0) {
				resolve(out.trim());
			} else {
				reject(new Error(err.trim() || `docker ${args[0]} exited ${code}`));
			}
		});
	});
}

async function runContainer(
	input: DeployInput,
	portArgs: string[],
	envArgs: string[],
) {
	try {
		return await docker([
			"run",
			"-d",
			"--name",
			input.name,
			...portArgs,
			...envArgs,
			input.image,
		]);
	} catch (error) {
		if (!isNameConflict(error)) {
			throw error;
		}

		return docker(["inspect", "--format", "{{.Id}}", input.name]);
	}
}

function isNameConflict(error: unknown) {
	const message = error instanceof Error ? error.message.toLowerCase() : "";
	return message.includes("conflict") && message.includes("already in use");
}

export const deployer = restate.service({
	name: "deployer",
	handlers: {
		run: async (
			ctx: restate.Context,
			input: DeployInput,
		): Promise<{ containerId: string }> => {
			await ctx.run("docker pull", () => docker(["pull", input.image]));

			// Drop any previous container before a fresh run; runContainer also
			// handles a replay after Docker created the container but before Restate
			// journaled the step result.
			await ctx.run("docker rm", () =>
				docker(["rm", "-f", input.name]).catch(() => ""),
			);

			const portArgs = (input.ports ?? []).flatMap((p) => ["-p", p]);
			const envArgs = Object.entries(input.env ?? {}).flatMap(([k, val]) => [
				"-e",
				`${k}=${val}`,
			]);

			const containerId = await ctx.run("docker run", () =>
				runContainer(input, portArgs, envArgs),
			);

			return { containerId };
		},

		stop: async (
			ctx: restate.Context,
			input: { name: string },
		): Promise<void> => {
			await ctx.run("docker stop", async () => {
				await docker(["rm", "-f", input.name]).catch(() => "");
			});
		},
	},
});

export type Deployer = typeof deployer;
