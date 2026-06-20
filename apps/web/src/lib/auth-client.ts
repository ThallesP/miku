import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { API_URL } from "@/lib/env";

// The better-auth server lives in the control plane (apps/api) at
// `${API_URL}/api/auth`. The web app is only a client: it never hosts its own
// auth server. The session is a cross-origin cookie (the dashboard and the API
// are different origins) — better-auth's browser client already sends
// `credentials: "include"` by default, and the API allows it via CORS
// (`credentials: true`) and `trustedOrigins`.
export const authClient = createAuthClient({
	baseURL: API_URL,
	basePath: "/api/auth",
	// mirror the server plugins so the session type carries `activeOrganizationId`
	plugins: [organizationClient()],
});

// resolved session shape (`{ user, session }`, including organization fields),
// derived from the client so it tracks the configured plugins
export type Session = NonNullable<
	Awaited<ReturnType<typeof authClient.getSession>>["data"]
>;
