import type { Id } from "@miku/backend";
import { createContext, useContext } from "react";

// Node-level actions that live on the canvas owner (Dashboard): React Flow renders
// node components deep in its own tree, so a context is the clean way to hand them
// "open this service" / "delete this service" without threading callbacks through
// node data (which would break node memoization).
export type CanvasActions = {
	openService: (id: Id<"apps">) => void;
	deleteService: (id: Id<"apps">) => Promise<void>;
};

const CanvasActionsContext = createContext<CanvasActions | null>(null);

export const CanvasActionsProvider = CanvasActionsContext.Provider;

export function useCanvasActions(): CanvasActions {
	const actions = useContext(CanvasActionsContext);
	if (!actions) {
		throw new Error(
			"useCanvasActions must be used within CanvasActionsProvider",
		);
	}
	return actions;
}
