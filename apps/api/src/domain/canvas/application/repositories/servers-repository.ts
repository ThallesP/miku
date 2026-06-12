import type { Server } from "@miku/db";

export abstract class ServersRepository {
	abstract findById(id: string): Promise<Server | null>;
	abstract findByName(name: string): Promise<Server | null>;
	abstract findMany(): Promise<Server[]>;
	abstract create(server: Server): Promise<void>;
	abstract save(server: Server): Promise<void>;
}
