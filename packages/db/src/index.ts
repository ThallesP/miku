import { defineConfig, MikroORM, type Options } from "@mikro-orm/postgresql";

import { Application } from "./entities/application";
import { Position } from "./entities/position";
import { Server } from "./entities/server";

export { Application } from "./entities/application";
export { Position } from "./entities/position";
export { Server } from "./entities/server";
export { InvalidNameError } from "./errors/invalid-name-error";
export {
	Failure,
	failure,
	type Result,
	Success,
	success,
} from "./result";

export function dbConfig(options: Options = {}) {
	return defineConfig({
		// callers pass clientUrl (a postgres:// connection string); this default
		// only applies to standalone scripts that don't supply one
		clientUrl: "postgres://postgres:postgres@localhost:5432/miku",
		entities: [Application, Position, Server],
		...options,
	});
}

// for standalone consumers (workers, scripts) — the API wires the ORM into
// Nest via MikroOrmModule.forRootAsync(dbConfig(...)) instead
export async function initOrm(options: Options = {}) {
	const orm = await MikroORM.init(
		dbConfig({
			// single long-lived process, no per-request forking
			allowGlobalContext: true,
			...options,
		}),
	);

	// dev-mode schema sync instead of migrations, per "keep it simple"
	await orm.schema.updateSchema();

	return orm;
}
