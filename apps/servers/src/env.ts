import os from "node:os";

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// The one place env vars are read: validated, typed, and defaulted so the server
// starts against the local docker-compose stack with zero configuration.
const parsed = createEnv({
	server: {
		SERVER_NAME: z.string().min(1).default(os.hostname()),
		CONVEX_URL: z.url().default("http://localhost:3210"),
		// Docker engine endpoint, in DOCKER_HOST form: "unix:/path", "tcp://host:port",
		// or "ssh://user@host". Single-slash unix form — the SDK reads the path after
		// "unix:" verbatim, so "unix:///…" would yield a bad "//…" path.
		DOCKER_HOST: z.string().min(1).default("unix:/var/run/docker.sock"),
		RESTATE_PORT: z.coerce.number().int().positive().default(9080),
		RESTATE_INGRESS_URL: z.url().default("http://localhost:8080"),
		RESTATE_ADMIN_URL: z.url().default("http://localhost:9070"),
		// where the Restate server (in Docker) reaches our host-side service; the
		// default is derived from RESTATE_PORT below
		RESTATE_SERVICE_URL: z.url().optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

export const env = {
	...parsed,
	// host.docker.internal bridges the Restate container → our host-side handlers
	RESTATE_SERVICE_URL:
		parsed.RESTATE_SERVICE_URL ??
		`http://host.docker.internal:${parsed.RESTATE_PORT}`,
};
