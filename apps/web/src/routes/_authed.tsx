import { ensureSession } from "@better-auth-ui/react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

// Pathless layout that gates everything nested under it. Every non-auth route
// lives here, so the whole app requires a session.
//
// `ssr: false` keeps the gated subtree client-only, which is what makes the
// requirements hold without a loading screen:
//   - the session is resolved in `beforeLoad`, before the route renders, so
//     there is no spinner/skeleton and no flash of protected UI;
//   - unauthenticated visitors are redirected to the auth page before any
//     gated component mounts.
// The session is seeded into the TanStack Query cache (via `ensureSession`) so
// the auth UI components don't refetch it.
export const Route = createFileRoute("/_authed")({
	ssr: false,
	async beforeLoad({ context }) {
		// only runs on the client (route is `ssr: false`); guard the server pass
		// so it never redirects authenticated users before cookies are available
		if (typeof document === "undefined") {
			return;
		}

		const session = await ensureSession(context.queryClient, authClient);

		if (!session) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}

		return { session };
	},
	component: Outlet,
});
