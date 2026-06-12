import { EntityManager } from "@mikro-orm/core";
import { Application } from "@miku/db";
import { Injectable } from "@nestjs/common";

import type { ApplicationsRepository } from "../../../../domain/canvas/application/repositories/applications-repository";

@Injectable()
export class MikroOrmApplicationsRepository implements ApplicationsRepository {
	constructor(private em: EntityManager) {}

	findById(id: string): Promise<Application | null> {
		return this.em.findOne(Application, { id });
	}

	findMany(): Promise<Application[]> {
		return this.em.find(Application, {}, { orderBy: { createdAt: "asc" } });
	}

	async create(application: Application): Promise<void> {
		this.em.persist(application);
		await this.em.flush();
	}

	// entities are managed by the request's unit of work — flushing persists
	// whatever was mutated since they were loaded
	async save(): Promise<void> {
		await this.em.flush();
	}
}
