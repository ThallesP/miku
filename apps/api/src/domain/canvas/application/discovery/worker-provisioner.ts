// port: delivers an auth token to an approved worker (the CP pushes to it)
export abstract class WorkerProvisioner {
	abstract provision(address: string, token: string): Promise<void>;
}
