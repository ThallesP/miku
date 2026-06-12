import { TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";

import { FetchServersUseCase } from "../../../domain/canvas/application/use-cases/fetch-servers";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

@Controller("servers")
export class FetchServersController {
	constructor(private fetchServers: FetchServersUseCase) {}

	@TypedRoute.Get()
	async fetch(): Promise<ServerHTTP[]> {
		const result = await this.fetchServers.execute();

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return result.value.servers.map(ServerPresenter.toHTTP);
	}
}
