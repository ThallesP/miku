import { type Result, type Server, success } from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ServersRepository } from "../repositories/servers-repository";

interface FetchServersUseCaseRequest {
	organizationId: string;
}

type FetchServersUseCaseResponse = Result<
	null,
	{
		servers: Server[];
	}
>;

@Injectable()
export class FetchServersUseCase {
	constructor(private serversRepository: ServersRepository) {}

	async execute({
		organizationId,
	}: FetchServersUseCaseRequest): Promise<FetchServersUseCaseResponse> {
		const servers =
			await this.serversRepository.findManyByOrganization(organizationId);

		return success({
			servers,
		});
	}
}
