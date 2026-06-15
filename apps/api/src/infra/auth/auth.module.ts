import { Module } from "@nestjs/common";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { getMigrations } from "better-auth/db/migration";

import { EnvModule } from "../env/env.module";
import { EnvService } from "../env/env.service";
import { createAuth } from "./auth";

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			imports: [EnvModule],
			useFactory: async (env: EnvService) => {
				const auth = createAuth({
					databaseUrl: env.get("DATABASE_URL"),
					secret: env.get("BETTER_AUTH_SECRET"),
					trustedOrigins: [env.get("WEB_URL")],
				});

				// dev-mode schema sync instead of migrations, per "keep it simple"
				const { runMigrations } = await getMigrations(auth.options);
				await runMigrations();

				return { auth };
			},
			inject: [EnvService],
		}),
	],
})
export class AuthModule {}
