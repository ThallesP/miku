import api, { type IConnection } from "@miku/sdk";
import type { CreateApplicationBody } from "@miku/sdk/structures/CreateApplicationBody";
import type { MoveApplicationBody } from "@miku/sdk/structures/MoveApplicationBody";

import { API_URL } from "./env";

export type { ApplicationHTTP } from "@miku/sdk/structures/ApplicationHTTP";
export type { ServerHTTP } from "@miku/sdk/structures/ServerHTTP";

// send the better-auth session cookie with every SDK call; the API is a
// different origin and its controllers are guarded by `@AuthMethods("session")`
const connection: IConnection = {
	host: API_URL,
	options: { credentials: "include" },
};

export const apiClient = {
	applications: {
		fetch: () => api.functional.applications.fetch(connection),
		create: (body: CreateApplicationBody) =>
			api.functional.applications.create(connection, body),
		move: (id: string, body: MoveApplicationBody) =>
			api.functional.applications.move(connection, id, body),
	},
	servers: {
		fetch: () => api.functional.servers.fetch(connection),
	},
};
