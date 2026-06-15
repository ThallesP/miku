export interface DiscoveredWorker {
	hostname: string;
	address: string;
	online: boolean;
}

// port: enumerates worker machines on the network that could be onboarded
export abstract class WorkerDiscovery {
	abstract listWorkers(): Promise<DiscoveredWorker[]>;
}
