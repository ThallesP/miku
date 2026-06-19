import { failure, type Result, type Server, success } from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ResourceNotFoundError } from "../../../../core/errors/errors/resource-not-found-error";
import { ChangePublisher } from "../events/change-publisher";
import { ServersRepository } from "../repositories/servers-repository";

interface HeartbeatServerUseCaseRequest {
	userId: string;
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
		userId,
	}: HeartbeatServerUseCaseRequest): Promise<HeartbeatServerUseCaseResponse> {
		const server = await this.serversRepository.findByUserId(userId);

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
