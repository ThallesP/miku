import { join } from "node:path";

import { Migrator } from "@mikro-orm/migrations";
import { defineConfig, MikroORM, type Options } from "@mikro-orm/postgresql";

import { Application } from "./entities/application";
import { Position } from "./entities/position";
import { Server } from "./entities/server";

export { AggregateRoot, type DomainEvent } from "./entities/aggregate-root";
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
		extensions: [Migrator],
		migrations: {
			// __dirname is dist/ at runtime and src/ under ts-node, so the
			// migrations live in src/migrations and ship compiled in dist/migrations
			path: join(__dirname, "migrations"),
			emit: "ts",
			snapshot: true,
		},
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

	// apply pending migrations (the migration files live in this package)
	await orm.getMigrator().up();

	return orm;
}
