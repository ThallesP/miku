import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { Pool } from "pg";

const DAY_SECONDS = 60 * 60 * 24;

export interface CreateAuthOptions {
	databaseUrl: string;
	secret?: string;
	trustedOrigins: string[];
}

export function createAuth({
	databaseUrl,
	secret,
	trustedOrigins,
}: CreateAuthOptions) {
	return betterAuth({
		basePath: "/api/auth",
		secret,
		trustedOrigins,
		// same Postgres database as MikroORM; better-auth manages its own tables.
		// passing a pg Pool lets better-auth detect the postgres dialect
		database: new Pool({ connectionString: databaseUrl }),
		emailAndPassword: {
			enabled: true,
		},
		// the bearer plugin lets non-browser clients (workers) authenticate with
		// `Authorization: Bearer <session-token>`, which the global AuthGuard
		// resolves via getSession — no custom guard needed
		plugins: [bearer()],
		// long-lived sessions refreshed on use; worker heartbeats keep their
		// bearer token alive while the worker runs
		session: {
			expiresIn: DAY_SECONDS * 30,
			updateAge: DAY_SECONDS,
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
