import { MikroORM } from "@mikro-orm/core";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { dbConfig } from "@miku/db";
import { Module, type OnModuleInit } from "@nestjs/common";

import { ApplicationsRepository } from "../../domain/canvas/application/repositories/applications-repository";
import { ServersRepository } from "../../domain/canvas/application/repositories/servers-repository";
import { env } from "../env/env";
import { MikroOrmApplicationsRepository } from "./mikro-orm/repositories/mikro-orm-applications-repository";
import { MikroOrmServersRepository } from "./mikro-orm/repositories/mikro-orm-servers-repository";

@Module({
	imports: [
		// registers the RequestContext middleware, so every HTTP request gets
		// its own identity map / unit of work
		MikroOrmModule.forRoot(dbConfig({ clientUrl: env.DATABASE_URL })),
	],
	providers: [
		{
			provide: ApplicationsRepository,
			useClass: MikroOrmApplicationsRepository,
		},
		{
			provide: ServersRepository,
			useClass: MikroOrmServersRepository,
		},
	],
	exports: [ApplicationsRepository, ServersRepository],
})
export class DatabaseModule implements OnModuleInit {
	constructor(private orm: MikroORM) {}

	async onModuleInit() {
		// apply pending MikroORM migrations on boot; these only manage the
		// entity tables, so better-auth's tables in the same database are untouched
		await this.orm.getMigrator().up();
	}
}
