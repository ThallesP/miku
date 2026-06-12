import {
	failure,
	type InvalidNameError,
	type Result,
	Server,
	success,
} from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ChangePublisher } from "../events/change-publisher";
import { ServersRepository } from "../repositories/servers-repository";

interface RegisterServerUseCaseRequest {
	name: string;
	address: string;
	network: string;
}

type RegisterServerUseCaseResponse = Result<
	InvalidNameError,
	{
		server: Server;
	}
>;

@Injectable()
export class RegisterServerUseCase {
	constructor(
		private serversRepository: ServersRepository,
		private changePublisher: ChangePublisher,
	) {}

	async execute({
		name,
		address,
		network,
	}: RegisterServerUseCaseRequest): Promise<RegisterServerUseCaseResponse> {
		// workers re-register on every boot; the name is their stable identity
		const existing = await this.serversRepository.findByName(name);

		if (existing) {
			existing.address = address;
			existing.network = network;
			existing.lastSeenAt = new Date();
			await this.serversRepository.save(existing);
			this.changePublisher.publish({ type: "servers" });

			return success({ server: existing });
		}

		const result = Server.create({ name, address, network });

		if (result.isFailure()) {
			return failure(result.value);
		}

		const server = result.value;

		await this.serversRepository.create(server);
		this.changePublisher.publish({ type: "servers" });

		return success({
			server,
		});
	}
}
