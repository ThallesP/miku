import "dotenv/config";

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		PORT: z.coerce.number().int().positive().default(3100),
		// postgres connection string, shared by MikroORM and better-auth
		DATABASE_URL: z
			.url()
			.default("postgres://postgres:postgres@localhost:5432/miku"),
		// required in production; better-auth falls back to a dev secret
		BETTER_AUTH_SECRET: z.string().optional(),
		WEB_URL: z.url().default("http://localhost:3000"),
	},
	runtimeEnv: process.env,
	// treat "" the same as unset so blank vars fall back to defaults/optional
	emptyStringAsUndefined: true,
});

export type Env = typeof env;
