import {
	failure,
	type Result,
	type Server,
	ServerChanged,
	success,
} from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ResourceNotFoundError } from "../../../../core/errors/errors/resource-not-found-error";
import { ChangePublisher } from "../events/change-publisher";
import { ServersRepository } from "../repositories/servers-repository";

interface HeartbeatServerUseCaseRequest {
	apiKeyId: string;
}

type HeartbeatServerUseCaseResponse = Result<
	ResourceNotFoundError,
	{
		server: Server;
	}
>;

@Injectable()
export class HeartbeatServerUseCase {
	constructor(
		private serversRepository: ServersRepository,
		private changePublisher: ChangePublisher,
	) {}

	async execute({
		apiKeyId,
	}: HeartbeatServerUseCaseRequest): Promise<HeartbeatServerUseCaseResponse> {
		const server = await this.serversRepository.findByApiKeyId(apiKeyId);

		if (!server) {
			return failure(new ResourceNotFoundError());
		}

		server.lastSeenAt = new Date();
		await this.serversRepository.save(server);
		// a heartbeat is telemetry, not an aggregate state transition worth
		// modelling as a domain event — so publish the refetch ping app-layer
		// rather than authoring it on the Server entity
		this.changePublisher.publish(new ServerChanged());

		return success({
			server,
		});
	}
}
