import { TypedParam, TypedRoute } from "@nestia/core";
import { Controller, NotFoundException } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { tags } from "typia";
import { HeartbeatServerUseCase } from "../../../domain/canvas/application/use-cases/heartbeat-server";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

// TODO: tighten auth — public for now to keep workers/web working
@AllowAnonymous()
@Controller("servers")
export class HeartbeatServerController {
	constructor(private heartbeatServer: HeartbeatServerUseCase) {}

	@TypedRoute.Patch(":id")
	async heartbeat(
		@TypedParam("id") id: string & tags.Format<"uuid">,
	): Promise<ServerHTTP> {
		const result = await this.heartbeatServer.execute({ serverId: id });

		if (result.isFailure()) {
			throw new NotFoundException(result.value.message);
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
