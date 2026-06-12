import { failure, type Result, type Server, success } from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ResourceNotFoundError } from "../../../../core/errors/errors/resource-not-found-error";
import { ChangePublisher } from "../events/change-publisher";
import { ServersRepository } from "../repositories/servers-repository";

interface HeartbeatServerUseCaseRequest {
	serverId: string;
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
		serverId,
	}: HeartbeatServerUseCaseRequest): Promise<HeartbeatServerUseCaseResponse> {
		const server = await this.serversRepository.findById(serverId);

		if (!server) {
			return failure(new ResourceNotFoundError());
		}

		server.lastSeenAt = new Date();
		await this.serversRepository.save(server);
		this.changePublisher.publish({ type: "servers" });

		return success({
			server,
		});
	}
}
