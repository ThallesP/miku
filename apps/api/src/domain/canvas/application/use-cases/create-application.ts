import {
	Application,
	failure,
	type InvalidNameError,
	Position,
	type Result,
	success,
} from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ChangePublisher } from "../events/change-publisher";
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
	constructor(
		private applicationsRepository: ApplicationsRepository,
		private changePublisher: ChangePublisher,
	) {}

	async execute({
		name,
		x,
		y,
	}: CreateApplicationUseCaseRequest): Promise<CreateApplicationUseCaseResponse> {
		const result = Application.create({ name, position: new Position(x, y) });

		if (result.isFailure()) {
			return failure(result.value);
		}

		const application = result.value;

		await this.applicationsRepository.create(application);
		this.changePublisher.publish({ type: "applications" });

		return success({
			application,
		});
	}
}
