import typia, { type tags } from "typia";

export interface Env {
	PORT: number & tags.Type<"uint32">;
	MIKU_DB_PATH: string;
}

export function validateEnv(config: Record<string, unknown>): Env {
	return typia.assert<Env>({
		PORT: Number(config.PORT ?? 3100),
		MIKU_DB_PATH: config.MIKU_DB_PATH ?? "miku.db",
	});
}
