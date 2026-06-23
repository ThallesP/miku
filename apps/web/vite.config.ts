import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Plain client-only SPA. No SSR, no Nitro, no file-route codegen — Convex's
// reactive client does the data layer, React Router does the routing.
export default defineConfig({
	plugins: [tsconfigPaths(), react(), tailwindcss()],
});
