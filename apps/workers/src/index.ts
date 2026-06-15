import { createServer } from "node:http";
import os from "node:os";

import { joinNetwork } from "@miku/network";
import * as restate from "@restatedev/restate-sdk";

import {
	readStoredToken,
	startHeartbeat,
	storeToken,
} from "./control-plane.ts";

const workerName = process.env.WORKER_NAME ?? os.hostname();
const restatePort = Number(process.env.RESTATE_PORT ?? 9080);
const controlPort = Number(process.env.WORKER_CONTROL_PORT ?? 9091);

const worker = restate.service({
	name: "worker",
	handlers: {
		ping: async (_ctx: restate.Context) => ({
			worker: workerName,
			ok: true,
		}),
	},
});

let heartbeat: ReturnType<typeof startHeartbeat> | null = null;

function beginHeartbeat(token: string) {
	if (heartbeat) {
		return;
	}

	heartbeat = startHeartbeat(token);
	console.log("[worker] heartbeating with control plane");
}

// join the tailnet, advertising the worker tag so the control plane's
// `tailscale status` discovery can find us
await joinNetwork(workerName, { advertiseTags: ["tag:miku-worker"] });

// the control plane POSTs our api key here once an operator approves us;
// single-use — ignored once we already hold a token
const provisionServer = createServer((request, response) => {
	if (request.method !== "POST" || request.url !== "/provision") {
		response.writeHead(404).end("not found");
		return;
	}

	let body = "";
	request.on("data", (chunk) => {
		body += chunk;
	});
	request.on("end", async () => {
		if (await readStoredToken()) {
			response.writeHead(204).end();
			return;
		}

		try {
			const { token } = JSON.parse(body) as { token?: string };

			if (!token) {
				response.writeHead(400).end("missing token");
				return;
			}

			await storeToken(token);
			beginHeartbeat(token);
			console.log("[worker] provisioned by control plane");
			response.writeHead(204).end();
		} catch {
			response.writeHead(400).end("bad request");
		}
	});
});

provisionServer.listen(controlPort, () => {
	console.log(`[worker] provision endpoint on :${controlPort}`);
});

// resume immediately if we were provisioned on a previous run
const existingToken = await readStoredToken();
if (existingToken) {
	beginHeartbeat(existingToken);
}

await restate.serve({ services: [worker], port: restatePort });
console.log(`[restate] worker "${workerName}" serving on :${restatePort}`);
