import { TypedBody, TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import type { tags } from "typia";
import { CreateApplicationUseCase } from "../../../domain/canvas/application/use-cases/create-application";
import { AuthMethods } from "../../auth/auth-methods.decorator";
import {
	type ApplicationHTTP,
	ApplicationPresenter,
} from "../presenters/application-presenter";

export interface CreateApplicationBody {
	name: string & tags.MinLength<1>;
	x: number;
	y: number;
}

@Controller("applications")
@AuthMethods("session")
export class CreateApplicationController {
	constructor(private createApplication: CreateApplicationUseCase) {}

	@TypedRoute.Post()
	async create(
		@TypedBody() body: CreateApplicationBody,
	): Promise<ApplicationHTTP> {
		const result = await this.createApplication.execute(body);

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return ApplicationPresenter.toHTTP(result.value.application);
	}
}
