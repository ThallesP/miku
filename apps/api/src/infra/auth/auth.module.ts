import { Module } from "@nestjs/common";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { getMigrations } from "better-auth/db/migration";

import { env } from "../env/env";
import { createAuth } from "./auth";

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			// async only because we run better-auth's migrations on boot; env is
			// the validated t3-env object, no DI needed
			useFactory: async () => {
				const auth = createAuth({
					databaseUrl: env.DATABASE_URL,
					secret: env.BETTER_AUTH_SECRET,
					trustedOrigins: [env.WEB_URL],
				});

				// dev-mode schema sync instead of migrations, per "keep it simple"
				const { runMigrations } = await getMigrations(auth.options);
				await runMigrations();

				return { auth };
			},
		}),
	],
})
export class AuthModule {}
