import { TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { FetchServersUseCase } from "../../../domain/canvas/application/use-cases/fetch-servers";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

// TODO: tighten auth — public for now to keep workers/web working
@AllowAnonymous()
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
