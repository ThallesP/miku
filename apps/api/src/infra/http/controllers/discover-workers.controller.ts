import { TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import { DiscoverWorkersUseCase } from "../../../domain/canvas/application/use-cases/discover-workers";
import { AuthMethods } from "../../auth/auth-methods.decorator";

export interface DiscoveredWorkerHTTP {
	hostname: string;
	address: string;
	online: boolean;
}

@Controller("workers")
@AuthMethods("session")
export class DiscoverWorkersController {
	constructor(private discoverWorkers: DiscoverWorkersUseCase) {}

	@TypedRoute.Get()
	async discover(): Promise<DiscoveredWorkerHTTP[]> {
		const result = await this.discoverWorkers.execute();

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return result.value.workers;
	}
}
