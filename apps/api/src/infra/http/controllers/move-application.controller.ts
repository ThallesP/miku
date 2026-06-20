import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller, NotFoundException } from "@nestjs/common";
import type { tags } from "typia";
import { MoveApplicationUseCase } from "../../../domain/canvas/application/use-cases/move-application";
import { AuthMethods } from "../../auth/auth-methods.decorator";
import {
	type ApplicationHTTP,
	ApplicationPresenter,
} from "../presenters/application-presenter";

export interface MoveApplicationBody {
	name?: string & tags.MinLength<1>;
	x?: number;
	y?: number;
}

@Controller("applications")
@AuthMethods("session")
export class MoveApplicationController {
	constructor(private moveApplication: MoveApplicationUseCase) {}

	@TypedRoute.Patch(":id")
	async move(
		@TypedParam("id") id: string & tags.Format<"uuid">,
		@TypedBody() body: MoveApplicationBody,
	): Promise<ApplicationHTTP> {
		const result = await this.moveApplication.execute({
			applicationId: id,
			...body,
		});

		if (result.isFailure()) {
			throw new NotFoundException(result.value.message);
		}

		return ApplicationPresenter.toHTTP(result.value.application);
	}
}
