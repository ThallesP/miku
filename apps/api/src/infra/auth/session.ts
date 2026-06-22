import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "./auth";

// Resolve a better-auth session from raw request headers. Shared by
// SessionAuthGuard (HTTP) and the canvas WebSocket handshake — nestia runs
// WebSocket routes outside Nest's guard pipeline, so the gateway authenticates
// the upgrade itself instead of relying on the global AuthenticationGuard.
export function getSessionFromHeaders(headers: IncomingHttpHeaders) {
	return auth.api.getSession({ headers: fromNodeHeaders(headers) });
}
