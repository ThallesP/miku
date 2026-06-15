import { Module } from "@nestjs/common";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { getMigrations } from "better-auth/db/migration";

import { auth } from "./auth";

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			// async only because we run better-auth's migrations on boot
			useFactory: async () => {
				const { runMigrations } = await getMigrations(auth.options);
				await runMigrations();

				return { auth };
			},
		}),
	],
})
export class AuthModule {}
