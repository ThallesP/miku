import { MikroORM } from "@mikro-orm/core";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { dbConfig } from "@miku/db";
import { Module, type OnModuleInit } from "@nestjs/common";

import { ApplicationsRepository } from "../../domain/canvas/application/repositories/applications-repository";
import { ServersRepository } from "../../domain/canvas/application/repositories/servers-repository";
import { EnvModule } from "../env/env.module";
import { EnvService } from "../env/env.service";
import { MikroOrmApplicationsRepository } from "./mikro-orm/repositories/mikro-orm-applications-repository";
import { MikroOrmServersRepository } from "./mikro-orm/repositories/mikro-orm-servers-repository";

@Module({
	imports: [
		// registers the RequestContext middleware, so every HTTP request gets
		// its own identity map / unit of work
		MikroOrmModule.forRootAsync({
			imports: [EnvModule],
			useFactory: (env: EnvService) =>
				dbConfig({ clientUrl: env.get("DATABASE_URL") }),
			inject: [EnvService],
		}),
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
		// dev-mode schema sync instead of migrations, per "keep it simple";
		// dropTables: false so better-auth's tables (not MikroORM entities)
		// in the same database survive the sync
		await this.orm.schema.updateSchema({ dropTables: false });
	}
}
