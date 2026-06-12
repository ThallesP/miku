import api, { type IConnection } from "@miku/sdk";
import type { CreateApplicationBody } from "@miku/sdk/structures/CreateApplicationBody";
import type { MoveApplicationBody } from "@miku/sdk/structures/MoveApplicationBody";

export type { ApplicationHTTP } from "@miku/sdk/structures/ApplicationHTTP";
export type { ServerHTTP } from "@miku/sdk/structures/ServerHTTP";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3100";

const connection: IConnection = { host: API_URL };

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
