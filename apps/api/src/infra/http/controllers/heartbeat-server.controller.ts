import { Controller, NotFoundException, Post, UseGuards } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { HeartbeatServerUseCase } from "../../../domain/canvas/application/use-cases/heartbeat-server";
import {
	WorkerApiKeyId,
	WorkerAuthGuard,
} from "../../auth/worker-auth.guard";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

// workers authenticate with their org-scoped api key (`x-api-key`), verified by
// WorkerAuthGuard; @AllowAnonymous opts out of the global session guard. The
// worker is identified by its api key, so there's no :id in the path. Excluded
// from the nestia SDK (see nestia.config.ts) — workers call it with fetch.
@Controller("servers")
export class HeartbeatServerController {
	constructor(private heartbeatServer: HeartbeatServerUseCase) {}

	@Post("heartbeat")
	@AllowAnonymous()
	@UseGuards(WorkerAuthGuard)
	async heartbeat(@WorkerApiKeyId() apiKeyId: string): Promise<ServerHTTP> {
		const result = await this.heartbeatServer.execute({ apiKeyId });

		if (result.isFailure()) {
			throw new NotFoundException(result.value.message);
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
