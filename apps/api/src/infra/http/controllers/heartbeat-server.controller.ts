import { Controller, NotFoundException, Post } from "@nestjs/common";
import { HeartbeatServerUseCase } from "../../../domain/canvas/application/use-cases/heartbeat-server";
import { ApiKeyId } from "../../auth/api-key-auth.guard";
import { AuthMethods } from "../../auth/auth-methods.decorator";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

// workers authenticate with their org-scoped api key (`x-api-key`).
// `@AuthMethods("apiKey")` tells the global AuthenticationGuard to authenticate
// this route with the api-key guard instead of a human session. The worker is
// identified by its api key, so there's no :id in the path. Excluded from the
// nestia SDK (see nestia.config.ts) — workers call it with fetch.
@Controller("servers")
export class HeartbeatServerController {
	constructor(private heartbeatServer: HeartbeatServerUseCase) {}

	@Post("heartbeat")
	@AuthMethods("apiKey")
	async heartbeat(@ApiKeyId() apiKeyId: string): Promise<ServerHTTP> {
		const result = await this.heartbeatServer.execute({ apiKeyId });

		if (result.isFailure()) {
			throw new NotFoundException(result.value.message);
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
