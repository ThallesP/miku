import { DockerClient } from "@docker/node-sdk";
import * as restate from "@restatedev/restate-sdk";

import { env } from "./env.ts";

export type ContainerSpec = {
	// container name — the Convex deployment id, so re-deploys are idempotent
	name: string;
	image: string;
	env?: Record<string, string>;
	// "host:container[/proto]" or "ip:host:container[/proto]"
	ports?: string[];
};

// One client per process. fromDockerHost is explicit about the endpoint;
// fromDockerConfig() silently defaults to tcp://localhost:2375, which isn't
// listening on a normal socket-only host.
const docker = await DockerClient.fromDockerHost(env.DOCKER_HOST);

// Pull the image, then (re)create and start the container. Idempotent: any
// leftover container with the same name is force-removed first, so the returned
// id always belongs to a container that actually started.
export async function runContainer(spec: ContainerSpec): Promise<string> {
	await docker.imageCreate({ fromImage: spec.image }).wait();
	await removeContainer(spec.name);

	const exposedPorts: Record<string, Record<string, never>> = {};
	const portBindings: Record<string, { HostIp?: string; HostPort: string }[]> =
		{};
	for (const port of spec.ports ?? []) {
		const { key, binding } = parsePort(port);
		exposedPorts[key] = {};
		portBindings[key] = [...(portBindings[key] ?? []), binding];
	}

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
		// A container that refuses to start (bad entrypoint, port already taken) won't
		// start on a retry either — fail fast with a TerminalError so the durable step
		// surfaces it as `failed` instead of burning every retry attempt.
		throw new restate.TerminalError(
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

// Docker's HTTP API wants ExposedPorts/PortBindings keyed by "<port>/<proto>"
// with a string host port — translate the familiar "8080:80" form into that.
function parsePort(spec: string): {
	key: string;
	binding: { HostIp?: string; HostPort: string };
} {
	const [mapping, protocol = "tcp"] = spec.split("/");
	const parts = mapping.split(":");
	const container = parts.pop() ?? mapping;
	const hostPort = parts.pop() ?? container;
	const hostIp = parts.pop();
	return {
		key: `${container}/${protocol}`,
		binding: hostIp
			? { HostIp: hostIp, HostPort: hostPort }
			: { HostPort: hostPort },
	};
}
