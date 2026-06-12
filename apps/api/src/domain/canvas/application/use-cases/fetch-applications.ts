import { type Application, type Result, success } from "@miku/db";
import { Injectable } from "@nestjs/common";
import { ApplicationsRepository } from "../repositories/applications-repository";

type FetchApplicationsUseCaseResponse = Result<
	null,
	{
		applications: Application[];
	}
>;

@Injectable()
export class FetchApplicationsUseCase {
	constructor(private applicationsRepository: ApplicationsRepository) {}

	async execute(): Promise<FetchApplicationsUseCaseResponse> {
		const applications = await this.applicationsRepository.findMany();

		return success({
			applications,
		});
	}
}
