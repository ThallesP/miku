import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnv } from "./env/env";
import { EnvModule } from "./env/env.module";
import { EventsModule } from "./events/events.module";
import { HttpModule } from "./http/http.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			validate: (env) => validateEnv(env),
			isGlobal: true,
		}),
		EnvModule,
		EventsModule,
		HttpModule,
	],
})
export class AppModule {}
