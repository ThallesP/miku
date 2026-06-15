import { TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { FetchApplicationsUseCase } from "../../../domain/canvas/application/use-cases/fetch-applications";
import {
	type ApplicationHTTP,
	ApplicationPresenter,
} from "../presenters/application-presenter";

// TODO: tighten auth — public for now to keep workers/web working
@AllowAnonymous()
@Controller("applications")
export class FetchApplicationsController {
	constructor(private fetchApplications: FetchApplicationsUseCase) {}

	@TypedRoute.Get()
	async fetch(): Promise<ApplicationHTTP[]> {
		const result = await this.fetchApplications.execute();

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return result.value.applications.map(ApplicationPresenter.toHTTP);
	}
}
