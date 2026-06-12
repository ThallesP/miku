import api, { type IConnection } from "@miku/sdk";

import type { NetworkIdentity } from "./network.ts";

const controlPlaneUrl =
	process.env.CONTROL_PLANE_URL ?? "http://localhost:3100";

const connection: IConnection = { host: controlPlaneUrl };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Announce this worker to the control plane, retrying until it is up. */
export async function registerServer(identity: NetworkIdentity) {
	for (;;) {
		try {
			const server = await api.functional.servers.register(
				connection,
				identity,
			);

			console.log(
				`[control-plane] registered as server ${server.id} (${server.name})`,
			);

			return server;
		} catch {
			console.warn(
				`[control-plane] not reachable at ${controlPlaneUrl}, retrying...`,
			);
		}

		await sleep(2000);
	}
}

export function startHeartbeat(serverId: string, intervalMs = 5000) {
	return setInterval(async () => {
		try {
			await api.functional.servers.heartbeat(connection, serverId);
		} catch {
			// control plane briefly unreachable; next beat will retry
		}
	}, intervalMs);
}
