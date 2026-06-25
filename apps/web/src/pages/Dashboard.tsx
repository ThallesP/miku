import { api, type DeploymentStatus, type Doc, type Id } from "@miku/backend";
import {
	Background,
	BackgroundVariant,
	type Node,
	type NodeProps,
	type NodeTypes,
	ReactFlow,
	useNodesState,
} from "@xyflow/react";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const ONLINE_THRESHOLD_MS = 15_000;

// deployment rows carry their lifecycle status as a stored field
type Deployment = Doc<"deployments">;

type AppNodeData = {
	id: Id<"apps">;
	name: string;
	x: number;
	y: number;
	status?: DeploymentStatus;
} & Record<string, unknown>;

type ServerNodeData = {
	name: string;
	address: string;
	network: string;
	lastSeenAt: number;
} & Record<string, unknown>;

type CanvasNode =
	| Node<AppNodeData, "application">
	| Node<ServerNodeData, "server">;

const nodeTypes = {
	application: ApplicationNode,
	server: ServerNode,
} satisfies NodeTypes;

function buildNodes(
	apps: Doc<"apps">[],
	servers: Doc<"servers">[],
	latestByApp: Map<string, Deployment>,
): CanvasNode[] {
	return [
		...servers.map(
			(server, index) =>
				({
					id: `server-${server._id}`,
					type: "server",
					position: { x: -300, y: 40 + index * 130 },
					draggable: false,
					data: {
						name: server.name,
						address: server.address,
						network: server.network,
						lastSeenAt: server.lastSeenAt,
					},
				}) satisfies CanvasNode,
		),
		...apps.map((app): CanvasNode => {
			const latest = latestByApp.get(app._id);
			return {
				id: `app-${app._id}`,
				type: "application",
				position: { x: app.x, y: app.y },
				data: {
					id: app._id,
					name: app.name,
					x: app.x,
					y: app.y,
					status: latest?.status,
				},
			};
		}),
	];
}

export function Dashboard() {
	const apps = useQuery(api.apps.list) ?? [];
	const servers = useQuery(api.servers.list) ?? [];
	const deployments = useQuery(api.deployments.list) ?? [];

	const createApp = useMutation(api.apps.create);
	// optimistic move keeps the dragged node glued to the cursor instead of
	// snapping back while the mutation round-trips
	const moveApp = useMutation(api.apps.move).withOptimisticUpdate(
		(store, { id, x, y }) => {
			const current = store.getQuery(api.apps.list, {});
			if (!current) {
				return;
			}
			store.setQuery(
				api.apps.list,
				{},
				current.map((app) => (app._id === id ? { ...app, x, y } : app)),
			);
		},
	);

	const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
	const draggingRef = useRef(false);
	const lastMoveRef = useRef(0);

	// latest deployment per app (by creation time) → status badge on its node
	const latestByApp = useMemo(() => {
		const latest = new Map<string, Deployment>();
		for (const deployment of deployments) {
			const seen = latest.get(deployment.appId);
			if (!seen || deployment._creationTime > seen._creationTime) {
				latest.set(deployment.appId, deployment);
			}
		}
		return latest;
	}, [deployments]);

	// rebuild the graph whenever reactive data changes — except mid-drag, so we
	// don't fight the user's cursor. This single effect replaces refetch + the
	// moved/changed WebSocket listener entirely.
	useEffect(() => {
		if (draggingRef.current) {
			return;
		}
		setNodes(buildNodes(apps, servers, latestByApp));
	}, [apps, servers, latestByApp, setNodes]);

	const sendMove = useCallback(
		(id: Id<"apps">, x: number, y: number, force = false) => {
			const now = Date.now();
			if (!force && now - lastMoveRef.current < 50) {
				return;
			}
			lastMoveRef.current = now;
			void moveApp({ id, x, y });
		},
		[moveApp],
	);

	async function handleAddApplication() {
		const index = apps.length;
		await createApp({
			name: `Application ${index + 1}`,
			x: 120 + (index % 3) * 300,
			y: 80 + Math.floor(index / 3) * 180,
		});
	}

	return (
		<main className="h-screen w-screen">
			<ReactFlow
				className="runway-canvas"
				fitView
				fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
				nodeTypes={nodeTypes}
				nodes={nodes}
				onNodesChange={onNodesChange}
				onNodeDragStart={() => {
					draggingRef.current = true;
				}}
				onNodeDrag={(_event, node) => {
					if (node.type === "application") {
						const { id } = node.data as AppNodeData;
						sendMove(id, node.position.x, node.position.y);
					}
				}}
				onNodeDragStop={(_event, node) => {
					draggingRef.current = false;
					if (node.type === "application") {
						const { id } = node.data as AppNodeData;
						sendMove(id, node.position.x, node.position.y, true);
					}
				}}
				nodesConnectable={false}
				panOnScroll
				proOptions={{ hideAttribution: true }}
			>
				<Background
					color="#cbd5e1"
					gap={24}
					size={1}
					variant={BackgroundVariant.Dots}
				/>
			</ReactFlow>

			<div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
				<Button className="w-fit" onClick={handleAddApplication} size="sm">
					<Plus className="size-4" />
					Add application
				</Button>
				<DeployPanel apps={apps} servers={servers} />
			</div>
		</main>
	);
}

function DeployPanel({
	apps,
	servers,
}: {
	apps: Doc<"apps">[];
	servers: Doc<"servers">[];
}) {
	const createDeployment = useMutation(api.deployments.create);
	const [appId, setAppId] = useState<string>("");
	const [serverId, setServerId] = useState<string>("");
	const [image, setImage] = useState("nginx:alpine");
	const [ports, setPorts] = useState("");

	const canDeploy = appId !== "" && serverId !== "" && image.trim() !== "";

	async function handleDeploy() {
		if (!canDeploy) {
			return;
		}
		await createDeployment({
			appId: appId as Id<"apps">,
			serverId: serverId as Id<"servers">,
			image: image.trim(),
			ports: ports.trim() ? [ports.trim()] : undefined,
		});
	}

	return (
		<Card className="w-72 gap-4 py-4">
			<CardHeader className="px-4">
				<CardTitle className="text-sm">Deploy</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 px-4">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs" htmlFor="deploy-app">
						Application
					</Label>
					<Select value={appId} onValueChange={setAppId}>
						<SelectTrigger className="w-full" id="deploy-app" size="sm">
							<SelectValue placeholder="Select app" />
						</SelectTrigger>
						<SelectContent>
							{apps.map((app) => (
								<SelectItem key={app._id} value={app._id}>
									{app.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs" htmlFor="deploy-server">
						Server
					</Label>
					<Select value={serverId} onValueChange={setServerId}>
						<SelectTrigger className="w-full" id="deploy-server" size="sm">
							<SelectValue placeholder="Select server" />
						</SelectTrigger>
						<SelectContent>
							{servers.map((server) => (
								<SelectItem key={server._id} value={server._id}>
									{server.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs" htmlFor="deploy-image">
						Image
					</Label>
					<Input
						id="deploy-image"
						onChange={(event) => setImage(event.target.value)}
						placeholder="nginx:alpine"
						value={image}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs" htmlFor="deploy-ports">
						Ports (optional)
					</Label>
					<Input
						id="deploy-ports"
						onChange={(event) => setPorts(event.target.value)}
						placeholder="8080:80"
						value={ports}
					/>
				</div>

				<Button
					className="w-full"
					disabled={!canDeploy}
					onClick={handleDeploy}
					size="sm"
				>
					Deploy
				</Button>
			</CardContent>
		</Card>
	);
}

const STATUS_STYLES: Record<DeploymentStatus, string> = {
	pending: "bg-slate-100 text-slate-600",
	pulling: "bg-amber-100 text-amber-700",
	running: "bg-emerald-100 text-emerald-700",
	failed: "bg-red-100 text-red-700",
	stopped: "bg-slate-100 text-slate-500",
};

function ApplicationNode({
	data,
}: NodeProps<Node<AppNodeData, "application">>) {
	return (
		<div className="w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
			<p className="font-semibold text-sm">{data.name}</p>
			<p className="mt-1 text-slate-500 text-xs">
				x {Math.round(data.x)} · y {Math.round(data.y)}
			</p>
			{data.status ? (
				<span
					className={`mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-xs ${STATUS_STYLES[data.status]}`}
				>
					{data.status}
				</span>
			) : null}
		</div>
	);
}

function ServerNode({ data }: NodeProps<Node<ServerNodeData, "server">>) {
	const online = useOnline(data.lastSeenAt);

	return (
		<div className="w-56 rounded-lg border border-slate-300 border-dashed bg-white p-3 shadow-sm">
			<div className="flex items-center gap-2">
				<span
					className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`}
				/>
				<p className="font-semibold text-sm">{data.name}</p>
			</div>
			<p className="mt-1 text-slate-500 text-xs">
				{data.address} · {data.network}
			</p>
			<p className="mt-0.5 text-slate-400 text-xs">
				{online
					? "online"
					: `last seen ${new Date(data.lastSeenAt).toLocaleTimeString()}`}
			</p>
		</div>
	);
}

// Liveness ticks locally so a node flips offline without any server write.
function useOnline(lastSeenAt: number) {
	const [online, setOnline] = useState(
		() => Date.now() - lastSeenAt < ONLINE_THRESHOLD_MS,
	);

	useEffect(() => {
		const tick = () => setOnline(Date.now() - lastSeenAt < ONLINE_THRESHOLD_MS);
		tick();
		const id = setInterval(tick, 3000);
		return () => clearInterval(id);
	}, [lastSeenAt]);

	return online;
}
