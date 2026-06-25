import * as restate from "@restatedev/restate-sdk";
import * as clients from "@restatedev/restate-sdk-clients";

import { deploymentObject } from "./deployment.ts";
import { env } from "./env.ts";
import { heartbeatObject } from "./heartbeat.ts";

// Serve our Virtual Objects on localhost and register them with the local Restate server
// (retrying while it boots) so its ingress can route invocations back to the handlers we
// host. The objects run in THIS process, next to the docker and Convex clients — Restate
// only routes; it never reaches into the tailnet.
export async function serveRestate(): Promise<void> {
	restate.serve({
		services: [deploymentObject, heartbeatObject],
		port: env.RESTATE_PORT,
	});
	console.log(`[restate] serving on :${env.RESTATE_PORT}`);
	await register();
}

// Ingress client the control-plane pump uses to drive our own objects from outside
// Restate (a plain Convex subscription callback).
export function connectIngress() {
	return clients.connect({ url: env.RESTATE_INGRESS_URL });
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
