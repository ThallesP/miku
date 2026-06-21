import { Link, useNavigate } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { AuthProvider } from "./auth/auth-provider";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
	const navigate = useNavigate();

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<AuthProvider
				authClient={authClient}
				navigate={navigate}
				Link={({ href, ...props }) => <Link to={href} {...props} />}
			>
				{children}

				<Toaster />
			</AuthProvider>
		</ThemeProvider>
	);
}
