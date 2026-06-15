export interface WorkerCredential {
	/** the api key id — identifies the worker when it heartbeats */
	apiKeyId: string;
	/** the organization the api key is scoped to */
	organizationId: string;
	/** the api key the worker authenticates with (sent as `x-api-key`) */
	token: string;
}

// port: mints an organization-scoped api key for a worker
export abstract class WorkerCredentials {
	abstract issue(hostname: string): Promise<WorkerCredential>;
}
