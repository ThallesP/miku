import {
	failure,
	type InvalidNameError,
	type Result,
	Server,
	success,
} from "@miku/db";
import { Injectable } from "@nestjs/common";

import { auth } from "../../../../infra/auth/auth";
import { WorkerProvisioner } from "../discovery/worker-provisioner";
import { ServersRepository } from "../repositories/servers-repository";

// better-auth rejects api key names longer than this
const MAX_KEY_NAME_LENGTH = 32;

interface ApproveWorkerUseCaseRequest {
	hostname: string;
	address: string;
	// the organization the approving user belongs to — the worker's api key is
	// scoped to it, and the resulting server belongs to it
	organizationId: string;
	// the approving user; owns the organization and so may mint its api keys
	userId: string;
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
		private workerProvisioner: WorkerProvisioner,
	) {}

	async execute({
		hostname,
		address,
		organizationId,
		userId,
	}: ApproveWorkerUseCaseRequest): Promise<ApproveWorkerUseCaseResponse> {
		// mint the worker's org-scoped api key straight through better-auth. we
		// skip a clean-architecture port here on purpose: the control plane no
		// longer owns a synthetic fleet account, so keys just belong to the
		// approving user's org. the key is organization-referenced (see auth.ts)
		// and created under the approving user, who owns the org and therefore
		// passes the apiKey:create permission check.
		const credential = await auth.api.createApiKey({
			body: {
				organizationId,
				userId,
				name: hostname.slice(0, MAX_KEY_NAME_LENGTH),
				metadata: { hostname },
			},
		});

		const result = Server.create({
			name: hostname,
			address,
			network: "tailscale",
			organizationId,
			apiKeyId: credential.id,
		});

		if (result.isFailure()) {
			return failure(result.value);
		}

		const server = result.value;

		// persist the Server, then hand the key to the worker over the tailnet so
		// it can start heartbeating
		await this.serversRepository.create(server);
		await this.workerProvisioner.provision(address, credential.key);

		return success({ server });
	}
}
