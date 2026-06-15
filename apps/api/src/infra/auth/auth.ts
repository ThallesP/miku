import { betterAuth } from "better-auth";
import { Pool } from "pg";

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
	});
}

export type Auth = ReturnType<typeof createAuth>;
