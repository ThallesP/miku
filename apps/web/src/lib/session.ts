import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import type { Session } from "@/lib/auth-client";
import { API_URL } from "@/lib/env";

// better-auth's recommended `getSession` server function
// (https://better-auth.com/docs/integrations/tanstack), adapted for our split
// setup: the auth server lives in apps/api, so instead of a local
// `auth.api.getSession({ headers })` we forward the request cookie to the
// control plane's get-session endpoint. The handler mount and the
// `tanstackStartCookies` plugin from the guide are the API's responsibility,
// not the web app's.
export const getSession = createServerFn({ method: "GET" }).handler(
	async (): Promise<Session | null> => {
		const cookie = getRequestHeaders().get("cookie");
		if (!cookie) {
			return null;
		}

		try {
			const response = await fetch(`${API_URL}/api/auth/get-session`, {
				headers: { cookie },
			});
			if (!response.ok) {
				return null;
			}

			const session = (await response.json()) as Session | null;
			return session?.user ? session : null;
		} catch {
			// control plane unreachable — treat as unauthenticated so the route
			// guard redirects to sign-in instead of surfacing a 500
			return null;
		}
	},
);
