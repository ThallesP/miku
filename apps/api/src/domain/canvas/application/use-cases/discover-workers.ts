import { type Result, success } from "@miku/db";
import { Injectable } from "@nestjs/common";
import {
	type DiscoveredWorker,
	WorkerDiscovery,
} from "../discovery/worker-discovery";
import { ServersRepository } from "../repositories/servers-repository";

type DiscoverWorkersUseCaseResponse = Result<
	null,
	{
		workers: DiscoveredWorker[];
	}
>;

@Injectable()
export class DiscoverWorkersUseCase {
	constructor(
		private workerDiscovery: WorkerDiscovery,
		private serversRepository: ServersRepository,
	) {}

	async execute(): Promise<DiscoverWorkersUseCaseResponse> {
		const [discovered, servers] = await Promise.all([
			this.workerDiscovery.listWorkers(),
			this.serversRepository.findMany(),
		]);

		// a worker is "discoverable" only until it becomes an approved Server
		const approved = new Set(servers.map((server) => server.name));
		const workers = discovered.filter(
			(worker) => !approved.has(worker.hostname),
		);

		return success({ workers });
	}
}
