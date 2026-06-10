import { ConvexProvider, ConvexReactClient } from "convex/react";
import { createContext, type ReactNode, useContext, useMemo } from "react";

const AppConvexStatusContext = createContext({ enabled: false });

export function useAppConvexStatus() {
	return useContext(AppConvexStatusContext);
}

export function AppConvexProvider({ children }: { children: ReactNode }) {
	const convex = useMemo(() => {
		const url = import.meta.env.VITE_CONVEX_URL;

		return url ? new ConvexReactClient(url) : null;
	}, []);
	const status = useMemo(() => ({ enabled: Boolean(convex) }), [convex]);
	const content = (
		<AppConvexStatusContext.Provider value={status}>
			{children}
		</AppConvexStatusContext.Provider>
	);

	if (!convex) {
		return content;
	}

	return <ConvexProvider client={convex}>{content}</ConvexProvider>;
}
