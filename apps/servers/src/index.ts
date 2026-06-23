import { joinNetwork } from "@miku/network";

import { startControlPlane } from "./control-plane.ts";
import { env } from "./env.ts";
import { serveRestate } from "./restate.ts";

// A server is three things wired in order: it joins the tailnet, serves its durable
// Restate objects (the deployment state machines + its own heartbeat), then calls out
// to the control plane and pumps the deployments assigned to it into those objects.
// Tailscale stays purely server-side — nothing ever reaches back in.
const identity = await joinNetwork(env.SERVER_NAME, {
	advertiseTags: ["tag:miku-server"],
});

await serveRestate();
await startControlPlane(identity);
