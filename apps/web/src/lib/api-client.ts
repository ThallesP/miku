import api, { type IConnection } from "@miku/sdk";
import type { CreateApplicationBody } from "@miku/sdk/structures/CreateApplicationBody";

import { API_URL } from "./env";

export type { ApplicationHTTP } from "@miku/sdk/structures/ApplicationHTTP";
export type { ServerHTTP } from "@miku/sdk/structures/ServerHTTP";

// what the server pushes to us over the realtime canvas connection
export type CanvasListener = Parameters<
	typeof api.functional.canvas.connect
>[1];
// the live connection: `.driver.move(...)` sends moves, `.connector.close()` ends it
export type CanvasConnection = Awaited<
	ReturnType<typeof api.functional.canvas.connect>
>;

// send the better-auth session cookie with every SDK call; the API is a
// different origin and its controllers are guarded by `@AuthMethods("session")`
const connection: IConnection = {
	host: API_URL,
	options: { credentials: "include" },
};

// the canvas runs over WebSocket on the same host; the browser sends the session
// cookie with the upgrade handshake, which the API authenticates
const canvasConnection: IConnection = {
	host: API_URL.replace(/^http/, "ws"),
};

export const apiClient = {
	applications: {
		fetch: () => api.functional.applications.fetch(connection),
		create: (body: CreateApplicationBody) =>
			api.functional.applications.create(connection, body),
	},
	servers: {
		fetch: () => api.functional.servers.fetch(connection),
	},
	// open the realtime canvas; `listener` receives the server's live updates
	connectCanvas: (listener: CanvasListener): Promise<CanvasConnection> =>
		api.functional.canvas.connect(canvasConnection, listener),
};
