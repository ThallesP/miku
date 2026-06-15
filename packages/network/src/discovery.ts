import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface TailnetDevice {
	hostname: string;
	/** first tailnet IP (100.x.y.z) */
	address: string;
	online: boolean;
	tags: string[];
	lastSeen?: string;
}

interface RawNode {
	HostName?: string;
	TailscaleIPs?: string[];
	Online?: boolean;
	Tags?: string[];
	LastSeen?: string;
}

interface RawStatus {
	Self?: RawNode;
	Peer?: Record<string, RawNode>;
}

/**
 * Enumerate tailnet devices via the local tailscale daemon
 * (`tailscale status --json`). Requires this host to be on the tailnet.
 */
export async function listTailnetDevices(): Promise<TailnetDevice[]> {
	const { stdout } = await run("tailscale", ["status", "--json"]);
	const status = JSON.parse(stdout) as RawStatus;

	const nodes: RawNode[] = [
		...(status.Self ? [status.Self] : []),
		...Object.values(status.Peer ?? {}),
	];

	const devices: TailnetDevice[] = [];

	for (const node of nodes) {
		const address = node.TailscaleIPs?.[0];

		if (!node.HostName || !address) {
			continue;
		}

		devices.push({
			hostname: node.HostName,
			address,
			online: Boolean(node.Online),
			tags: node.Tags ?? [],
			lastSeen: node.LastSeen,
		});
	}

	return devices;
}

export function hasTag(device: TailnetDevice, tag: string): boolean {
	return device.tags.includes(tag);
}
