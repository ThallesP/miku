import * as restate from "@restatedev/restate-sdk";
import * as clients from "@restatedev/restate-sdk-clients";

import { type ContainerSpec, removeContainer, runContainer } from "./docker.ts";
import { env } from "./env.ts";

// The durable hands. Each `ctx.run` is journaled by Restate, so a crash mid-deploy
// resumes from the last completed step and a re-invocation with the same
// idempotency key collapses to one execution. Retries are bounded so a real
// failure (bad image, port taken) surfaces as a throw — reported as `failed` —
// instead of looping forever.
const RETRY: restate.RunOptions<string> = { maxRetryAttempts: 5 };

export const deployer = restate.service({
	name: "deployer",
	handlers: {
		run: (ctx: restate.Context, spec: ContainerSpec): Promise<string> =>
			ctx.run("docker run", () => runContainer(spec), RETRY),
		stop: (ctx: restate.Context, { name }: { name: string }): Promise<void> =>
			ctx.run("docker stop", () => removeContainer(name)),
	},
});

// Serve the durable service on localhost and register it with the local Restate
// server (retrying while it boots) so the ingress can route invocations to it.
export async function serveDeployer(): Promise<void> {
	restate.serve({ services: [deployer], port: env.RESTATE_PORT });
	console.log(`[restate] deployer serving on :${env.RESTATE_PORT}`);
	await register();
}

// Ingress client the control loop uses to invoke our own durable handlers.
export function connectDeployer() {
	return clients
		.connect({ url: env.RESTATE_INGRESS_URL })
		.serviceClient(deployer);
}

async function register(attempt = 0): Promise<void> {
	try {
		const response = await fetch(`${env.RESTATE_ADMIN_URL}/deployments`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ uri: env.RESTATE_SERVICE_URL, force: true }),
		});
		if (!response.ok) {
			throw new Error(
				`admin responded ${response.status}: ${await response.text()}`,
			);
		}
		console.log(`[restate] registered deployment ${env.RESTATE_SERVICE_URL}`);
	} catch (error) {
		if (attempt >= 15) {
			throw new Error(
				`[restate] could not register after ${attempt + 1} attempts`,
				{
					cause: error,
				},
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return register(attempt + 1);
	}
}
