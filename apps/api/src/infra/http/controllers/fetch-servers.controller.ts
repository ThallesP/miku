import { TypedRoute } from "@nestia/core";
import { BadRequestException, Controller } from "@nestjs/common";
import { FetchServersUseCase } from "../../../domain/canvas/application/use-cases/fetch-servers";
import { ActiveMember } from "../../auth/active-member.decorator";
import { AuthMethods } from "../../auth/auth-methods.decorator";
import {
	type ServerHTTP,
	ServerPresenter,
} from "../presenters/server-presenter";

@Controller("servers")
@AuthMethods("session")
export class FetchServersController {
	constructor(private fetchServers: FetchServersUseCase) {}

	// scoped to the caller's active organization — servers approved by other
	// orgs must not leak across tenants
	@TypedRoute.Get()
	async fetch(@ActiveMember() member: ActiveMember): Promise<ServerHTTP[]> {
		const result = await this.fetchServers.execute({
			organizationId: member.organizationId,
		});

		if (result.isFailure()) {
			throw new BadRequestException();
		}

		return result.value.servers.map(ServerPresenter.toHTTP);
	}
}
