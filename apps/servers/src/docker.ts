import { DockerClient } from "@docker/node-sdk";

import { env } from "./env.ts";

// The daemon accepted the create/start but the container is not actually running (bad
// entrypoint, host port already taken). Deterministic — a retry won't help — so the
// deployment object maps it straight to a Restate TerminalError (see asTerminalError).
export class ContainerStartError extends Error {}

// The pull can't succeed as-is: an unknown tag, denied auth, or a legacy schema-1
// manifest that modern containerd refuses. Like ContainerStartError, it's
// deterministic, so the deployment object fails it immediately instead of burning
// the retry budget on an outcome that will never change.
export class ImagePullError extends Error {}

// Substrings in a pull error that mean "this will never work, don't retry". A
// transient network/registry blip won't match, so it stays retryable.
const PERMANENT_PULL_ERRORS = [
	"not found",
	"manifest unknown",
	"unauthorized",
	"denied",
	"not implemented",
	"no longer supported",
	"unsupported",
	"invalid reference format",
];

// Pull the image, classifying a deterministic failure (bad tag, auth, legacy
// manifest) as terminal so it surfaces as `failed` on the first try.
async function pullImage(image: string): Promise<void> {
	try {
		await docker.imageCreate({ fromImage: image }).wait();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (
			PERMANENT_PULL_ERRORS.some((needle) =>
				message.toLowerCase().includes(needle),
			)
		) {
			throw new ImagePullError(message);
		}
		throw error;
	}
}

export type ContainerSpec = {
	// container name — the Convex deployment id, so re-deploys are idempotent
	name: string;
	image: string;
	env?: Record<string, string>;
};

// One client per process. fromDockerHost is explicit about the endpoint;
// fromDockerConfig() silently defaults to tcp://localhost:2375, which isn't
// listening on a normal socket-only host.
const docker = await DockerClient.fromDockerHost(env.DOCKER_HOST);

// Pull the image, then (re)create and start the container. Idempotent: any
// leftover container with the same name is force-removed first, so the returned
// id always belongs to a container that actually started.
export async function runContainer(spec: ContainerSpec): Promise<string> {
	await pullImage(spec.image);
	await removeContainer(spec.name);

	// Ports aren't configured by the user — we read the ports the image declares
	// it exposes and publish each to the matching host port. That's the "detect
	// automatically" contract: deploy nginx, get :80 on the host, no input.
	const { exposedPorts, portBindings } = await publishedPorts(spec.image);

	const { Id } = await docker.containerCreate(
		{
			Image: spec.image,
			Env: Object.entries(spec.env ?? {}).map(([k, value]) => `${k}=${value}`),
			ExposedPorts: exposedPorts,
			HostConfig: { PortBindings: portBindings },
		},
		{ name: spec.name },
	);

	await docker.containerStart(Id);

	// containerStart can resolve even when the daemon refused the start (a host
	// port already in use leaves the container "Created"), so confirm it really
	// came up — otherwise the deploy must surface as failed, not running.
	const { State } = await docker.containerInspect(Id);
	if (State?.Status !== "running") {
		await removeContainer(spec.name);
		throw new ContainerStartError(
			State?.Error ||
				`container did not start (status: ${State?.Status}, exit: ${State?.ExitCode})`,
		);
	}

	return Id;
}

// Force-remove a container by name; a no-op if it isn't there.
export function removeContainer(name: string): Promise<void> {
	return docker.containerDelete(name, { force: true }).catch(() => {});
}

// Read the ports the image declares it exposes (Dockerfile EXPOSE) and bind each
// to the same host port. Returns the two maps containerCreate wants, both keyed
// by the daemon's "<port>/<proto>" form. An image with no EXPOSE publishes
// nothing — empty maps, container still runs.
async function publishedPorts(image: string): Promise<{
	exposedPorts: Record<string, Record<string, never>>;
	portBindings: Record<string, { HostPort: string }[]>;
}> {
	const { Config } = await docker.imageInspect(image);
	const exposedPorts: Record<string, Record<string, never>> = {};
	const portBindings: Record<string, { HostPort: string }[]> = {};
	for (const key of Object.keys(Config?.ExposedPorts ?? {})) {
		// key is "<port>/<proto>" (e.g. "80/tcp"); publish to the matching host port
		const hostPort = key.split("/")[0];
		exposedPorts[key] = {};
		portBindings[key] = [{ HostPort: hostPort }];
	}
	return { exposedPorts, portBindings };
}
