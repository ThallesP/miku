# Simple Turbo TanStack Convex

A small Bun monorepo with Turborepo, TanStack Start, Tailwind CSS, Biome, Vitest, and Convex.

## Start

```bash
bun install
bun run dev
```

## Convex

Provision the Convex dev deployment and generate Convex types:

```bash
bun run convex:dev
```

After the CLI provisions your deployment, set `VITE_CONVEX_URL` in `apps/web/.env.local` if the CLI does not create it automatically.
