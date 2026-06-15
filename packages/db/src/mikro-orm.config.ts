import { dbConfig } from "./index";

// MikroORM CLI config — used by `migration:create` / `migration:up`.
// Set DATABASE_URL to point at a non-default database; otherwise dbConfig's
// local default is used.
export default dbConfig(
	process.env.DATABASE_URL ? { clientUrl: process.env.DATABASE_URL } : {},
);
