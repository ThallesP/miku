// Shared client config. Kept tiny and dependency-free so importing it (e.g.
// from the auth client) doesn't pull in the generated Nestia SDK graph.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3100";
