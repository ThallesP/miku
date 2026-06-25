import { type AppSource, api, type Doc, type Id } from "@miku/backend";
import {
	Background,
	BackgroundVariant,
	type NodeTypes,
	ReactFlow,
	useNodesState,
} from "@xyflow/react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ApplicationNode,
	type AppNode,
} from "@/components/canvas/ApplicationNode";
import {
	type CanvasActions,
	CanvasActionsProvider,
} from "@/components/canvas/actions";
import { CreateApplicationDialog } from "@/components/canvas/CreateApplicationDialog";
import { ServiceSidebar } from "@/components/canvas/ServiceSidebar";

// deployment rows carry their lifecycle status as a stored field
type Deployment = Doc<"deployments">;

const nodeTypes = {
	application: ApplicationNode,
} satisfies NodeTypes;

function buildNodes(
	apps: Doc<"apps">[],
	latestByApp: Map<string, Deployment>,
): AppNode[] {
	return apps.map((app) => ({
		id: `app-${app._id}`,
		type: "application",
		position: { x: app.x, y: app.y },
		data: {
			id: app._id,
			name: app.name,
			source: app.source,
			status: latestByApp.get(app._id)?.status,
		},
	}));
}

export function Dashboard() {
	const apps = useQuery(api.apps.list) ?? [];
	const servers = useQuery(api.servers.list) ?? [];
	const deployments = useQuery(api.deployments.list) ?? [];

	const createApp = useMutation(api.apps.create);
	const removeApp = useMutation(api.apps.remove);
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

	const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
	const [selectedAppId, setSelectedAppId] = useState<Id<"apps"> | null>(null);
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
	// don't fight the user's cursor.
	useEffect(() => {
		if (draggingRef.current) {
			return;
		}
		setNodes(buildNodes(apps, latestByApp));
	}, [apps, latestByApp, setNodes]);

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

	async function handleCreate(input: { name: string; source: AppSource }) {
		const index = apps.length;
		await createApp({
			...input,
			x: 120 + (index % 3) * 320,
			y: 80 + Math.floor(index / 3) * 200,
		});
	}

	// Node-level actions handed to the canvas via context (open the sidebar, delete
	// the service). Deletion's sidebar-close is handled by the effect below, so this
	// stays a thin wrapper around the mutation.
	const actions = useMemo<CanvasActions>(
		() => ({
			openService: (id) => setSelectedAppId(id),
			deleteService: async (id) => {
				await removeApp({ id });
			},
		}),
		[removeApp],
	);

	const selectedApp = apps.find((app) => app._id === selectedAppId) ?? null;

	// If the open service disappears (deleted here or from another client), close
	// the sidebar instead of leaving it stuck on a now-missing service.
	useEffect(() => {
		if (selectedAppId && !selectedApp) {
			setSelectedAppId(null);
		}
	}, [selectedAppId, selectedApp]);

	return (
		<CanvasActionsProvider value={actions}>
			<main className="h-screen w-screen">
				<ReactFlow
					className="runway-canvas"
					fitView
					fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
					nodes={nodes}
					nodeTypes={nodeTypes}
					nodesConnectable={false}
					onNodeClick={(_event, node) => setSelectedAppId(node.data.id)}
					onNodeDrag={(_event, node) => {
						sendMove(node.data.id, node.position.x, node.position.y);
					}}
					onNodeDragStart={() => {
						draggingRef.current = true;
					}}
					onNodeDragStop={(_event, node) => {
						draggingRef.current = false;
						sendMove(node.data.id, node.position.x, node.position.y, true);
					}}
					onNodesChange={onNodesChange}
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

				<div className="absolute top-4 left-4 z-10">
					<CreateApplicationDialog onCreate={handleCreate} />
				</div>

				<ServiceSidebar
					app={selectedApp}
					deployments={deployments}
					onOpenChange={(open) => {
						if (!open) {
							setSelectedAppId(null);
						}
					}}
					open={selectedAppId !== null}
					servers={servers}
				/>
			</main>
		</CanvasActionsProvider>
	);
}
