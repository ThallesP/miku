import { TypedBody, TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import type { tags } from "typia";
import { ApproveWorkerUseCase } from "../../../domain/canvas/application/use-cases/approve-worker";
import { ActiveMember } from "../../auth/active-member.decorator";
import { AuthMethods } from "../../auth/auth-methods.decorator";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

export interface ApproveWorkerBody {
	// must contain a non-whitespace character. typia doesn't trim, so a plain
	// MinLength<1> would let "   " through and orphan a minted api key when
	// Server.create later rejects the blank name.
	hostname: string & tags.Pattern<"\\S">;
	address: string & tags.MinLength<1>;
}

@Controller("workers")
@AuthMethods("session")
export class ApproveWorkerController {
	constructor(private approveWorker: ApproveWorkerUseCase) {}

	// approves a discovered worker for the approving member's organization. the
	// session guard guarantees an active org, so the member always exists; the
	// worker's api key is minted under that membership and scoped to the org.
	@TypedRoute.Post("approve")
	async approve(
		@TypedBody() body: ApproveWorkerBody,
		@ActiveMember() member: ActiveMember,
	): Promise<ServerHTTP> {
		const result = await this.approveWorker.execute({
			...body,
			organizationId: member.organizationId,
			userId: member.userId,
		});

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return ServerPresenter.toHTTP(result.value.server);
	}
}
