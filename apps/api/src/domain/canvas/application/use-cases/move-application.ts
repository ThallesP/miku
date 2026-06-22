import {
	type Application,
	failure,
	Position,
	type Result,
	success,
} from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ResourceNotFoundError } from "../../../../core/errors/errors/resource-not-found-error";
import { ApplicationsRepository } from "../repositories/applications-repository";

interface MoveApplicationUseCaseRequest {
	applicationId: string;
	name?: string;
	x?: number;
	y?: number;
}

type MoveApplicationUseCaseResponse = Result<
	ResourceNotFoundError,
	{
		application: Application;
	}
>;

@Injectable()
export class MoveApplicationUseCase {
	constructor(private applicationsRepository: ApplicationsRepository) {}

	async execute({
		applicationId,
		name,
		x,
		y,
	}: MoveApplicationUseCaseRequest): Promise<MoveApplicationUseCaseResponse> {
		const application =
			await this.applicationsRepository.findById(applicationId);

		if (!application) {
			return failure(new ResourceNotFoundError());
		}

		if (name !== undefined) {
			application.name = name;
		}

		// the setter records "application.moved"; the afterFlush subscriber
		// publishes it once save() commits
		application.position = new Position(
			x ?? application.position.x,
			y ?? application.position.y,
		);

		await this.applicationsRepository.save(application);

		return success({
			application,
		});
	}
}
