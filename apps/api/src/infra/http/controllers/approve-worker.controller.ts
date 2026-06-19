import { TypedBody, TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import type { tags } from "typia";
import { ApproveWorkerUseCase } from "../../../domain/canvas/application/use-cases/approve-worker";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

export interface ApproveWorkerBody {
	hostname: string & tags.MinLength<1>;
	address: string & tags.MinLength<1>;
}

@Controller("workers")
export class ApproveWorkerController {
	constructor(private approveWorker: ApproveWorkerUseCase) {}

	@TypedRoute.Post("approve")
	async approve(@TypedBody() body: ApproveWorkerBody): Promise<ServerHTTP> {
		const result = await this.approveWorker.execute(body);

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
