import { hasTag, listTailnetDevices } from "@miku/network";
import { Injectable } from "@nestjs/common";

import {
	type DiscoveredWorker,
	WorkerDiscovery,
} from "../../domain/canvas/application/discovery/worker-discovery";
import { env } from "../env/env";

@Injectable()
export class TailscaleWorkerDiscovery implements WorkerDiscovery {
	async listWorkers(): Promise<DiscoveredWorker[]> {
		const devices = await listTailnetDevices();

		return devices
			.filter((device) => hasTag(device, env.WORKER_TAG))
			.map((device) => ({
				hostname: device.hostname,
				address: device.address,
				online: device.online,
			}));
	}
}
