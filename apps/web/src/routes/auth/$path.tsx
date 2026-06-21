import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";
import { authClient } from "@/lib/auth-client";

// the only public surface of the app: the better-auth views (sign-in, sign-up,
// forgot/reset password, verify email, sign-out)
const authViewPaths = Object.values(viewPaths.auth);
const validAuthPaths = new Set<string>(authViewPaths);

// guest-only entry views: every auth view except `sign-out`, which has to run
// while the user is still authenticated (it's the app's only logout path)
const guestOnlyPaths = new Set<string>(
	authViewPaths.filter((path) => path !== viewPaths.auth.signOut),
);

export const Route = createFileRoute("/auth/$path")({
	ssr: false,
	// protected routes carry the intended destination here on redirect;
	// AuthProvider reads `redirectTo` from the query string to return there
	// after sign-in
	validateSearch: (search: Record<string, unknown>): { redirectTo?: string } =>
		typeof search.redirectTo === "string"
			? { redirectTo: search.redirectTo }
			: {},
	async beforeLoad({ params: { path } }) {
		if (!validAuthPaths.has(path)) {
			throw redirect({ to: "/" });
		}

		// send already-signed-in users to the app from the guest-only views
		// (sign-out is intentionally excluded so it can run while authenticated)
		if (guestOnlyPaths.has(path)) {
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
