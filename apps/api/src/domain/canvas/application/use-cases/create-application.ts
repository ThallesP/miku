import {
	Application,
	failure,
	type InvalidNameError,
	Position,
	type Result,
	success,
} from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ApplicationsRepository } from "../repositories/applications-repository";

interface CreateApplicationUseCaseRequest {
	name: string;
	x: number;
	y: number;
}

type CreateApplicationUseCaseResponse = Result<
	InvalidNameError,
	{
		application: Application;
	}
>;

@Injectable()
export class CreateApplicationUseCase {
	constructor(private applicationsRepository: ApplicationsRepository) {}

	async execute({
		name,
		x,
		y,
	}: CreateApplicationUseCaseRequest): Promise<CreateApplicationUseCaseResponse> {
		const result = Application.create({ name, position: new Position(x, y) });

		if (result.isFailure()) {
			return failure(result.value);
		}

		// Application.create() records "application.created"; the afterFlush
		// subscriber publishes it once create() commits
		const application = result.value;

		await this.applicationsRepository.create(application);

		return success({
			application,
		});
	}
}
