import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);

export type NetworkIdentity = {
	name: string;
	address: string;
	network: "tailscale" | "local";
};

export interface JoinNetworkOptions {
	/**
	 * Tags to advertise on `tailscale up`, e.g. ["tag:miku-server"]. The auth
	 * key must be authorized for these tags in the tailnet ACL (tagOwners).
	 */
	advertiseTags?: string[];
}

/**
 * Join the mesh network. With TS_AUTHKEY set (and tailscaled running),
 * the server joins the tailnet under its own hostname. Without it we
 * fall back to the LAN address so local dev needs zero setup.
 */
export async function joinNetwork(
	name: string,
	options: JoinNetworkOptions = {},
): Promise<NetworkIdentity> {
	const authKey = process.env.TS_AUTHKEY;

	if (authKey) {
		try {
			const args = ["up", `--authkey=${authKey}`, `--hostname=${name}`];

			if (options.advertiseTags?.length) {
				args.push(`--advertise-tags=${options.advertiseTags.join(",")}`);
			}

			await run("tailscale", args);
			const { stdout } = await run("tailscale", ["ip", "-4"]);
			const address = stdout.trim().split("\n")[0];

			if (address) {
				console.log(`[network] joined tailnet as ${name} (${address})`);

				return { name, address, network: "tailscale" };
			}
		} catch (error) {
			console.warn("[network] tailscale join failed, using local network");
			console.warn(error);
		}
	}

	return { name, address: localAddress(), network: "local" };
}

function localAddress() {
	for (const interfaces of Object.values(os.networkInterfaces())) {
		for (const networkInterface of interfaces ?? []) {
			if (networkInterface.family === "IPv4" && !networkInterface.internal) {
				return networkInterface.address;
			}
		}
	}

	return "127.0.0.1";
}
