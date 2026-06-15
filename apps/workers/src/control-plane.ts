import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const controlPlaneUrl =
	process.env.CONTROL_PLANE_URL ?? "http://localhost:3100";

// the api key the control plane pushes on approval is persisted so the worker
// keeps authenticating across restarts without needing re-approval
const tokenFile =
	process.env.WORKER_TOKEN_FILE ?? join(homedir(), ".miku", "worker-token");

export async function readStoredToken(): Promise<string | null> {
	try {
		const token = (await readFile(tokenFile, "utf8")).trim();
		return token || null;
	} catch {
		return null;
	}
}

export async function storeToken(token: string): Promise<void> {
	await mkdir(dirname(tokenFile), { recursive: true });
	await writeFile(tokenFile, token, { mode: 0o600 });
}

/** Heartbeat the control plane using the worker's api key. */
export function startHeartbeat(token: string, intervalMs = 5000) {
	return setInterval(async () => {
		try {
			const response = await fetch(`${controlPlaneUrl}/servers/heartbeat`, {
				method: "POST",
				headers: { "x-api-key": token },
			});

			if (!response.ok) {
				console.warn(`[control-plane] heartbeat rejected: ${response.status}`);
			}
		} catch {
			// control plane briefly unreachable; next beat will retry
		}
	}, intervalMs);
}
