import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Background,
	BackgroundVariant,
	type Node,
	type NodeProps,
	type NodeTypes,
	ReactFlow,
	useNodesState,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
	type ApplicationHTTP,
	apiClient,
	type CanvasConnection,
	type ServerHTTP,
} from "@/lib/api-client";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/")({
	// `data-only`: run the auth check on the server (no flash, redirect issued
	// server-side) while the ReactFlow canvas still renders client-only
	ssr: "data-only",
	async beforeLoad({ location }) {
		const session = await getSession();

		if (!session) {
			throw redirect({
				to: "/auth/$path",
				params: { path: "sign-in" },
				search: { redirectTo: location.href },
			});
		}

		return { session };
	},
	component: Dashboard,
});

type ApplicationNodeData = ApplicationHTTP & Record<string, unknown>;
type ServerNodeData = ServerHTTP & Record<string, unknown>;

type CanvasNode =
	| Node<ApplicationNodeData, "application">
	| Node<ServerNodeData, "server">;

const nodeTypes = {
	application: ApplicationNode,
	server: ServerNode,
} satisfies NodeTypes;

function buildNodes(
	applications: ApplicationHTTP[],
	servers: ServerHTTP[],
): CanvasNode[] {
	return [
		...servers.map(
			(server, index) =>
				({
					id: `server-${server.id}`,
					type: "server",
					position: { x: -260, y: 40 + index * 120 },
					draggable: false,
					data: server,
				}) satisfies CanvasNode,
		),
		...applications.map(
			(application) =>
				({
					id: `application-${application.id}`,
					type: "application",
					position: { x: application.x, y: application.y },
					data: application,
				}) satisfies CanvasNode,
		),
	];
}

function Dashboard() {
	const [applications, setApplications] = useState<ApplicationHTTP[]>([]);
	const [servers, setServers] = useState<ServerHTTP[]>([]);
	const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
	const draggingRef = useRef(false);
	const canvasRef = useRef<CanvasConnection | null>(null);
	const lastMoveRef = useRef(0);

	const refresh = useCallback(async () => {
		const [nextApplications, nextServers] = await Promise.all([
			apiClient.applications.fetch(),
			apiClient.servers.fetch(),
		]);

		setApplications(nextApplications);
		setServers(nextServers);
	}, []);

	useEffect(() => {
		refresh();

		// realtime canvas: the server pushes other people's moves (so we update
		// that node live) and a "changed" ping for everything else (so we refetch)
		const pending = apiClient.connectCanvas({
			moved: ({ id, x, y }) =>
				setApplications((prev) =>
					prev.map((app) => (app.id === id ? { ...app, x, y } : app)),
				),
			changed: () => refresh(),
		});
		pending.then((canvas) => {
			canvasRef.current = canvas;
		});

		return () => {
			canvasRef.current = null;
			pending.then((canvas) => canvas.connector.close());
		};
	}, [refresh]);

	// send our own drag to the server, throttled so we don't flood it while still
	// guaranteeing the final resting position lands (force = true on drag stop)
	const sendMove = useCallback(
		(id: string, x: number, y: number, force = false) => {
			const now = Date.now();
			if (!force && now - lastMoveRef.current < 50) {
				return;
			}

			lastMoveRef.current = now;
			canvasRef.current?.driver.move({ id, x, y }).catch(() => {});
		},
		[],
	);

	useEffect(() => {
		if (draggingRef.current) {
			return;
		}

		setNodes(buildNodes(applications, servers));
	}, [applications, servers, setNodes]);

	async function handleAddApplication() {
		const index = applications.length;

		await apiClient.applications.create({
			name: `Application ${index + 1}`,
			x: 120 + (index % 3) * 300,
			y: 80 + Math.floor(index / 3) * 180,
		});
	}

	return (
		<main className="h-screen w-screen bg-slate-50 text-slate-950">
			<ReactFlow
				className="miku-canvas"
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
						const { id } = node.data as ApplicationHTTP;
						sendMove(id, node.position.x, node.position.y);
					}
				}}
				onNodeDragStop={(_event, node) => {
					draggingRef.current = false;

					if (node.type === "application") {
						const { id } = node.data as ApplicationHTTP;
						sendMove(id, node.position.x, node.position.y, true);
						setApplications((prev) =>
							prev.map((app) =>
								app.id === id
									? { ...app, x: node.position.x, y: node.position.y }
									: app,
							),
						);
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

			<button
				className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 font-medium text-sm text-white shadow-sm hover:bg-slate-700"
				onClick={handleAddApplication}
				type="button"
			>
				<Plus className="size-4" />
				Add application
			</button>
		</main>
	);
}

function ApplicationNode({
	data,
}: NodeProps<Node<ApplicationNodeData, "application">>) {
	return (
		<div className="w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
			<p className="font-semibold text-sm">{data.name}</p>
			<p className="mt-1 text-slate-500 text-xs">
				x {Math.round(data.x)} · y {Math.round(data.y)}
			</p>
		</div>
	);
}

function ServerNode({ data }: NodeProps<Node<ServerNodeData, "server">>) {
	return (
		<div className="w-56 rounded-lg border border-slate-300 border-dashed bg-white p-3 shadow-sm">
			<div className="flex items-center gap-2">
				<span
					className={`size-2 rounded-full ${
						data.online ? "bg-emerald-500" : "bg-slate-300"
					}`}
				/>
				<p className="font-semibold text-sm">{data.name}</p>
			</div>
			<p className="mt-1 text-slate-500 text-xs">
				{data.address} · {data.network}
			</p>
			<p className="mt-0.5 text-slate-400 text-xs">
				{data.online
					? "online"
					: `last seen ${new Date(data.lastSeenAt).toLocaleTimeString()}`}
			</p>
		</div>
	);
}
