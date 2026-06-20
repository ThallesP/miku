import { EntityManager } from "@mikro-orm/core";
import { Server } from "@miku/db";
import { Injectable } from "@nestjs/common";

import type { ServersRepository } from "../../../../domain/canvas/application/repositories/servers-repository";

@Injectable()
export class MikroOrmServersRepository implements ServersRepository {
	constructor(private em: EntityManager) {}

	findById(id: string): Promise<Server | null> {
		return this.em.findOne(Server, { id });
	}

	findByName(name: string): Promise<Server | null> {
		return this.em.findOne(Server, { name });
	}

	findByApiKeyId(apiKeyId: string): Promise<Server | null> {
		return this.em.findOne(Server, { apiKeyId });
	}

	findMany(): Promise<Server[]> {
		return this.em.find(Server, {}, { orderBy: { joinedAt: "asc" } });
	}

	findManyByOrganization(organizationId: string): Promise<Server[]> {
		return this.em.find(
			Server,
			{ organizationId },
			{ orderBy: { joinedAt: "asc" } },
		);
	}

	async create(server: Server): Promise<void> {
		this.em.persist(server);
		await this.em.flush();
	}

	// entities are managed by the request's unit of work — flushing persists
	// whatever was mutated since they were loaded
	async save(): Promise<void> {
		await this.em.flush();
	}
}
