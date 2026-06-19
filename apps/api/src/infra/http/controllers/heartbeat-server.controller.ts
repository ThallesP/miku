import { Controller, NotFoundException, Post } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { HeartbeatServerUseCase } from "../../../domain/canvas/application/use-cases/heartbeat-server";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

// authenticated by the global guard via the worker's bearer token; the worker
// is identified by its session user, so there's no :id in the path. Excluded
// from the nestia SDK (see nestia.config.ts) — workers call it with fetch.
@Controller("servers")
export class HeartbeatServerController {
	constructor(private heartbeatServer: HeartbeatServerUseCase) {}

	@Post("heartbeat")
	async heartbeat(@Session() session: UserSession): Promise<ServerHTTP> {
		const result = await this.heartbeatServer.execute({
			userId: session.user.id,
		});

		if (result.isFailure()) {
			throw new NotFoundException(result.value.message);
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
