import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

export function AppConvexProvider({ children }: { children: React.ReactNode }) {
	const convex = useMemo(() => {
		const url = import.meta.env.VITE_CONVEX_URL;

		return url ? new ConvexReactClient(url) : null;
	}, []);

	if (!convex) {
		return children;
	}

	return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
