import { joinNetwork } from "@miku/network";

import { startControlPlane } from "./control-plane.ts";
import { serveDeployer } from "./deployer.ts";
import { env } from "./env.ts";

// A server is three things wired in order: it joins the tailnet, serves its own
// durable deploy workflow, then calls out to the control plane and reconciles the
// deployments assigned to it. Tailscale stays purely server-side — nothing ever
// reaches back in.
const identity = await joinNetwork(env.SERVER_NAME, {
	advertiseTags: ["tag:miku-server"],
});

await serveDeployer();
await startControlPlane(identity);
