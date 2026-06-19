export interface WorkerCredential {
	/** the better-auth user id created for the worker */
	userId: string;
	/** the bearer token the worker authenticates with */
	token: string;
}

// port: mints an auth identity (user + bearer token) for a worker
export abstract class WorkerCredentials {
	abstract issue(hostname: string): Promise<WorkerCredential>;
}
