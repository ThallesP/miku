import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";
import { authClient } from "@/lib/auth-client";

// the only public surface of the app: the better-auth views (sign-in, sign-up,
// forgot/reset password, verify email, sign-out)
const validAuthPaths = new Set<string>(Object.values(viewPaths.auth));

export const Route = createFileRoute("/auth/$path")({
	ssr: false,
	// `_authed` carries the intended destination here on redirect; AuthProvider
	// reads `redirectTo` from the query string to return there after sign-in
	validateSearch: (search: Record<string, unknown>): { redirectTo?: string } =>
		typeof search.redirectTo === "string"
			? { redirectTo: search.redirectTo }
			: {},
	async beforeLoad({ params: { path } }) {
		if (!validAuthPaths.has(path)) {
			throw redirect({ to: "/" });
		}

		// already signed in? skip the auth entry pages — but let `sign-out` run,
		// otherwise an authenticated user could never reach it (it's in viewPaths)
		if (typeof document !== "undefined" && path !== viewPaths.auth.signOut) {
			const { data: session } = await authClient.getSession();

			if (session) {
				throw redirect({ to: "/" });
			}
		}
	},
	component: AuthPage,
});

function AuthPage() {
	const { path } = Route.useParams();

	return (
		<div className="flex min-h-svh items-center justify-center p-4 md:p-6">
			<Auth path={path} />
		</div>
	);
}
