import typia, { type tags } from "typia";

export interface Env {
	PORT: number & tags.Type<"uint32">;
	/** postgres connection string, shared by MikroORM and better-auth */
	DATABASE_URL: string;
	/** required in production; better-auth falls back to a dev secret */
	BETTER_AUTH_SECRET?: string;
	WEB_URL: string;
}

export function validateEnv(config: Record<string, unknown>): Env {
	return typia.assert<Env>({
		PORT: Number(config.PORT ?? 3100),
		DATABASE_URL:
			config.DATABASE_URL ??
			"postgres://postgres:postgres@localhost:5432/miku",
		BETTER_AUTH_SECRET: config.BETTER_AUTH_SECRET,
		WEB_URL: config.WEB_URL ?? "http://localhost:3000",
	});
}
