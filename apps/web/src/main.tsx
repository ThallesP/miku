import { ConvexProvider } from "convex/react";
import { ThemeProvider } from "next-themes";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { convex } from "@/lib/convex";
import { Dashboard } from "@/pages/Dashboard";
import "./styles.css";

const router = createBrowserRouter([{ path: "/", element: <Dashboard /> }]);

const container = document.getElementById("app");
if (!container) {
	throw new Error("missing #app root element");
}

createRoot(container).render(
	<StrictMode>
		<ConvexProvider client={convex}>
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				disableTransitionOnChange
			>
				<RouterProvider router={router} />
			</ThemeProvider>
		</ConvexProvider>
	</StrictMode>,
);
