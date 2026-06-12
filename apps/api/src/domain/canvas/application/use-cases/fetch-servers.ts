import { type Result, type Server, success } from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ServersRepository } from "../repositories/servers-repository";

type FetchServersUseCaseResponse = Result<
	null,
	{
		servers: Server[];
	}
>;

@Injectable()
export class FetchServersUseCase {
	constructor(private serversRepository: ServersRepository) {}

	async execute(): Promise<FetchServersUseCaseResponse> {
		const servers = await this.serversRepository.findMany();

		return success({
			servers,
		});
	}
}
