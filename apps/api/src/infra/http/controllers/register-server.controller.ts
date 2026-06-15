import { TypedBody, TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { tags } from "typia";
import { RegisterServerUseCase } from "../../../domain/canvas/application/use-cases/register-server";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

export interface RegisterServerBody {
	name: string & tags.MinLength<1>;
	address: string & tags.MinLength<1>;
	network: string & tags.MinLength<1>;
}

// TODO: tighten auth — public for now to keep workers/web working
@AllowAnonymous()
@Controller("servers")
export class RegisterServerController {
	constructor(private registerServer: RegisterServerUseCase) {}

	@TypedRoute.Post()
	async register(@TypedBody() body: RegisterServerBody): Promise<ServerHTTP> {
		const result = await this.registerServer.execute(body);

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
