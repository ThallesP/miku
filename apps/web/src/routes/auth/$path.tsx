import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";
import { authClient } from "@/lib/auth-client";

// the only public surface of the app: the better-auth views (sign-in, sign-up,
// forgot/reset password, verify email, sign-out)
const validAuthPaths = new Set<string>(Object.values(viewPaths.auth));

export const Route = createFileRoute("/auth/$path")({
	ssr: false,
	async beforeLoad({ params: { path } }) {
		if (!validAuthPaths.has(path)) {
			throw redirect({ to: "/" });
		}

		// already signed in? skip the auth page and go to the app
		if (typeof document !== "undefined") {
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
