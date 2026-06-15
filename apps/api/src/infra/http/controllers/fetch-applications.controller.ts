import { TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import { FetchApplicationsUseCase } from "../../../domain/canvas/application/use-cases/fetch-applications";
import {
	type ApplicationHTTP,
	ApplicationPresenter,
} from "../presenters/application-presenter";

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
