import os from "node:os";

import * as restate from "@restatedev/restate-sdk";

import { registerServer, startHeartbeat } from "./control-plane.ts";
import { joinNetwork } from "./network.ts";

const workerName = process.env.WORKER_NAME ?? os.hostname();
const restatePort = Number(process.env.RESTATE_PORT ?? 9080);

const worker = restate.service({
	name: "worker",
	handlers: {
		ping: async (_ctx: restate.Context) => ({
			worker: workerName,
			ok: true,
		}),
	},
});

// join the mesh and announce ourselves before serving restate handlers
const identity = await joinNetwork(workerName);
const server = await registerServer(identity);
startHeartbeat(server.id);

await restate.serve({ services: [worker], port: restatePort });
console.log(`[restate] worker "${workerName}" serving on :${restatePort}`);
