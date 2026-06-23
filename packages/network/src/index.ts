// Tailscale is now purely server-side: servers join the tailnet and self-register
// with the control plane. The old `tailscale status` discovery (listTailnetDevices)
// is gone — Convex can't run the CLI and doesn't need to; servers call out instead.
export {
	type JoinNetworkOptions,
	joinNetwork,
	type NetworkIdentity,
} from "./join";
