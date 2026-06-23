# miku

A Bun monorepo: a self-hosted **Convex** control plane, a **Vite + React Router** dashboard, and
**Restate**-powered servers that join a mesh network and run container deployments — all wired
together by Convex's reactive queries, so the canvas updates live with no WebSocket plumbing.

## Layout

| Package | Purpose |
| --- | --- |
| `packages/backend` | The control plane: a self-hosted [Convex](https://convex.dev) deployment (`convex/schema.ts` + `convex/{apps,servers,deployments}.ts`). One reactive datastore + typed functions; the generated `convex/_generated` is the shared contract imported by web and servers. |
| `apps/web` | Dashboard. Vite + React + [React Router](https://reactrouter.com) + a [React Flow](https://reactflow.dev) canvas. Reads/writes through `convex/react` hooks (`useQuery`/`useMutation`) — reactivity replaces the old WebSocket/SSE layer. |
| `apps/servers` | Server process (Node ≥24). Joins the network (Tailscale, with a local fallback), self-registers with Convex, heartbeats, subscribes to its deployments, and runs each via a local [Restate](https://restate.dev) durable workflow that drives the Docker Engine API through [`@docker/node-sdk`](https://www.npmjs.com/package/@docker/node-sdk). |
| `packages/network` | `joinNetwork` — `tailscale up` with a LAN fallback. |

## Architecture

```
UI ──useMutation──▶ Convex (apps / servers / deployments)        the brain: reactive state
                          │  live subscription (pull)
                          ▼
   server ──onUpdate──▶ reconcile ──▶ local Restate (localhost)  the durable hands
                                            │ docker pull/run
                                            ▼
   server ──updateStatus──▶ Convex  ──reactive──▶ UI updates live
```

The control plane is **Convex**, which can't run the `tailscale` CLI or reach into your tailnet —
so the model is inverted: **servers find the control plane and call out to it**. A server boots,
joins the tailnet, and calls the public `servers.register` mutation (no auth in v1). It then
subscribes to the deployments assigned to it and drives its **own** local Restate ingress to run
them durably — nothing ever reaches *into* the tailnet.

## Start

```bash
docker compose up -d --wait          # convex-backend (:3210/:3211), dashboard (:6791), restate (:8080/:9070)
bun run convex:admin-key             # paste the key into packages/backend/.env.local (see .env.example)
bun install
bun run dev                          # convex dev + web on :3000 + a server
```

The dashboard is on `http://localhost:3000`, the Convex dashboard on `http://localhost:6791`.
Add an application, drag it (synced live across tabs), then deploy it to a server — the server
pulls and runs the container and the node's status flips `pending → pulling → running`.

## Run a server

```bash
# local fallback (network: "local"):
bun --cwd apps/servers start
# join a tailnet (network: "tailscale") — needs tailscaled on the host:
TS_AUTHKEY=tskey-auth-... SERVER_NAME=server-1 bun --cwd apps/servers start
```

The server runs on **Node ≥24** (the `start` script runs the TypeScript directly via Node's type
stripping). It needs access to the Docker socket — the [`@docker/node-sdk`](https://www.npmjs.com/package/@docker/node-sdk)
client talks to the Docker Engine API. Env (`apps/servers/src/env.ts`, all optional, defaults
shown): `CONVEX_URL=http://localhost:3210`, `DOCKER_HOST=unix:/var/run/docker.sock`,
`RESTATE_INGRESS_URL=http://localhost:8080`, `RESTATE_ADMIN_URL=http://localhost:9070`,
`RESTATE_SERVICE_URL=http://host.docker.internal:9080`, `RESTATE_PORT=9080`,
`SERVER_NAME=<hostname>`.

## Convex

Functions live in `packages/backend/convex`. `bun run dev` runs `convex dev` (push + live codegen).
After editing the schema/functions, regenerate the shared types with `bun run codegen`. The
deployment is self-hosted; the CLI authenticates via `CONVEX_SELF_HOSTED_URL` +
`CONVEX_SELF_HOSTED_ADMIN_KEY` in `packages/backend/.env.local`.

## Deferred (v1 scope)

No auth (the `register` mutation is public), single-tenant, and deployments are prebuilt registry
images (`docker pull && docker run`). Auth, orgs, compose/git-build deployments, and zero-touch
Tailscale discovery are intended follow-ups.
