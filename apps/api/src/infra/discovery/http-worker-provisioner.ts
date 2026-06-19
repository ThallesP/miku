import { Injectable } from "@nestjs/common";

import { WorkerProvisioner } from "../../domain/canvas/application/discovery/worker-provisioner";
import { env } from "../env/env";

@Injectable()
export class HttpWorkerProvisioner implements WorkerProvisioner {
	async provision(address: string, token: string): Promise<void> {
		const response = await fetch(
			`http://${address}:${env.WORKER_CONTROL_PORT}/provision`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			},
		);

		if (!response.ok) {
			throw new Error(
				`failed to provision worker at ${address}: ${response.status}`,
			);
		}
	}
}
