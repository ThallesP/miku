import { TypedBody, TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { tags } from "typia";
import { ApproveWorkerUseCase } from "../../../domain/canvas/application/use-cases/approve-worker";
import type { Auth } from "../../auth/auth";
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

	// approves a discovered worker for the approving user's organization: the
	// worker's api key is scoped to that org (created during onboarding). nestia
	// ignores `@Session` in SDK generation — the browser carries the session
	// cookie automatically, so it isn't a parameter of the generated client.
	@TypedRoute.Post("approve")
	async approve(
		@TypedBody() body: ApproveWorkerBody,
		@Session() session: UserSession<Auth>,
	): Promise<ServerHTTP> {
		const organizationId = session.session.activeOrganizationId;

		if (!organizationId) {
			throw new BadRequestException("no active organization");
		}

		const result = await this.approveWorker.execute({
			...body,
			organizationId,
			userId: session.user.id,
		});

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
