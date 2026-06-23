// Tailscale is now purely worker-side: workers join the tailnet and self-register
// with the control plane. The old `tailscale status` discovery (listTailnetDevices)
// is gone — Convex can't run the CLI and doesn't need to; workers call out instead.
export {
	type JoinNetworkOptions,
	joinNetwork,
	type NetworkIdentity,
} from "./join";
