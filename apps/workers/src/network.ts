import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);

export type NetworkIdentity = {
	name: string;
	address: string;
	network: "tailscale" | "local";
};

/**
 * Join the mesh network. With TS_AUTHKEY set (and tailscaled running),
 * the worker joins the tailnet under its own hostname. Without it we
 * fall back to the LAN address so local dev needs zero setup.
 */
export async function joinNetwork(name: string): Promise<NetworkIdentity> {
	const authKey = process.env.TS_AUTHKEY;

	if (authKey) {
		try {
			await run("tailscale", [
				"up",
				`--authkey=${authKey}`,
				`--hostname=${name}`,
			]);
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
