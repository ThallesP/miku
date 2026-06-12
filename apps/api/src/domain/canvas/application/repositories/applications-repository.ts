import type { Application } from "@miku/db";

export abstract class ApplicationsRepository {
	abstract findById(id: string): Promise<Application | null>;
	abstract findMany(): Promise<Application[]>;
	abstract create(application: Application): Promise<void>;
	abstract save(application: Application): Promise<void>;
}
