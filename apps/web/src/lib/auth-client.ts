import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { API_URL } from "@/lib/api-client";

// The better-auth server lives in the control plane (apps/api) at
// `${API_URL}/api/auth`. The web app is only a client: it never hosts its own
// auth server. `credentials: "include"` is required because the dashboard and
// the API are different origins (e.g. :3000 vs :3100) and better-auth's session
// lives in a cross-origin cookie — the API already allows this via CORS
// (`credentials: true`) and `trustedOrigins`.
export const authClient = createAuthClient({
	baseURL: API_URL,
	basePath: "/api/auth",
	fetchOptions: { credentials: "include" },
	// mirror the server plugins so the session type carries `activeOrganizationId`
	plugins: [organizationClient()],
});
