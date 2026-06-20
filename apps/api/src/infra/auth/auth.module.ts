import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { getMigrations } from "better-auth/db/migration";

import { ApiKeyAuthGuard } from "./api-key-auth.guard";
import { auth } from "./auth";
import { AuthenticationGuard } from "./authentication.guard";
import { SessionAuthGuard } from "./session-auth.guard";

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			// async only because we run better-auth's migrations on boot
			useFactory: async () => {
				const { runMigrations } = await getMigrations(auth.options);
				await runMigrations();

				return { auth };
			},
			// we replace the package's global session guard with our own
			// AuthenticationGuard, which supports both human (session) and machine
			// (api key) auth via @AuthMethods (see authentication.guard.ts)
			disableGlobalAuthGuard: true,
		}),
	],
	providers: [
		SessionAuthGuard,
		ApiKeyAuthGuard,
		{ provide: APP_GUARD, useClass: AuthenticationGuard },
	],
})
export class AuthModule {}
