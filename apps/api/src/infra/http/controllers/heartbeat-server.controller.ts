import { Controller, NotFoundException, Post } from "@nestjs/common";
import { HeartbeatServerUseCase } from "../../../domain/canvas/application/use-cases/heartbeat-server";
import { AuthMethods } from "../../auth/auth-methods.decorator";
import { WorkerApiKeyId } from "../../auth/worker-auth.guard";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

// workers authenticate with their org-scoped api key (`x-api-key`).
// `@AuthMethods("apiKey")` tells the global AuthenticationGuard to authenticate
// this route with the worker guard instead of a human session. The worker is
// identified by its api key, so there's no :id in the path. Excluded from the
// nestia SDK (see nestia.config.ts) — workers call it with fetch.
@Controller("servers")
export class HeartbeatServerController {
	constructor(private heartbeatServer: HeartbeatServerUseCase) {}

	@Post("heartbeat")
	@AuthMethods("apiKey")
	async heartbeat(@WorkerApiKeyId() apiKeyId: string): Promise<ServerHTTP> {
		const result = await this.heartbeatServer.execute({ apiKeyId });

		if (result.isFailure()) {
			throw new NotFoundException(result.value.message);
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
