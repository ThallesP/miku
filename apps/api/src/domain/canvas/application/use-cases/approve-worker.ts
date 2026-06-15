import {
	failure,
	type InvalidNameError,
	type Result,
	Server,
	success,
} from "@miku/db";
import { Injectable } from "@nestjs/common";
import { WorkerCredentials } from "../discovery/worker-credentials";
import { WorkerProvisioner } from "../discovery/worker-provisioner";
import { ServersRepository } from "../repositories/servers-repository";

interface ApproveWorkerUseCaseRequest {
	hostname: string;
	address: string;
}

type ApproveWorkerUseCaseResponse = Result<
	InvalidNameError,
	{
		server: Server;
	}
>;

@Injectable()
export class ApproveWorkerUseCase {
	constructor(
		private serversRepository: ServersRepository,
		private workerCredentials: WorkerCredentials,
		private workerProvisioner: WorkerProvisioner,
	) {}

	async execute({
		hostname,
		address,
	}: ApproveWorkerUseCaseRequest): Promise<ApproveWorkerUseCaseResponse> {
		const result = Server.create({
			name: hostname,
			address,
			network: "tailscale",
		});

		if (result.isFailure()) {
			return failure(result.value);
		}

		const server = result.value;

		// mint the worker's identity, persist the Server, then hand the token to
		// the worker over the tailnet so it can start heartbeating
		const { userId, token } = await this.workerCredentials.issue(hostname);
		server.linkUser(userId);

		await this.serversRepository.create(server);
		await this.workerProvisioner.provision(address, token);

		return success({ server });
	}
}
