import { createFileRoute } from "@tanstack/react-router";
import {
	Background,
	BackgroundVariant,
	Controls,
	Handle,
	type Node,
	type NodeProps,
	type NodeTypes,
	Position,
	ReactFlow,
} from "@xyflow/react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAppConvexStatus } from "@/convex-provider";

export const Route = createFileRoute("/")({ component: Home });

type ApplicationStatus = "queued" | "ready";

type Application = {
	createdAt: number;
	id: string;
	name: string;
	status: ApplicationStatus;
	x: number;
	y: number;
};

type ConvexApplication = Omit<Application, "id"> & {
	_id: string;
};

type ApplicationInput = {
	name: string;
	x: number;
	y: number;
};

type ApplicationNodeData = {
	createdLabel: string;
	name: string;
	status: ApplicationStatus;
	syncLabel: string;
} & Record<string, unknown>;

type ApplicationFlowNode = Node<ApplicationNodeData, "application">;

const listApplications = makeFunctionReference<
	"query",
	Record<string, never>,
	ConvexApplication[]
>("applications:list");

const createApplication = makeFunctionReference<
	"mutation",
	ApplicationInput,
	string
>("applications:create");

const nodeTypes = {
	application: ApplicationCardNode,
} satisfies NodeTypes;

function Home() {
	const { enabled } = useAppConvexStatus();

	if (enabled) {
		return <SyncedCanvas />;
	}

	return <LocalCanvas />;
}

function SyncedCanvas() {
	const applicationsQuery = useSyncedApplications();
	const [isCreating, setIsCreating] = useState(false);
	const apps = (applicationsQuery.data ?? []).map((app) => ({
		createdAt: app.createdAt,
		id: app._id,
		name: app.name,
		status: app.status,
		x: app.x,
		y: app.y,
	}));

	async function handleAddApplication() {
		const nextIndex = apps.length;
		const position = getApplicationPosition(nextIndex);

		setIsCreating(true);
		try {
			await applicationsQuery.create({
				name: `Application ${nextIndex + 1}`,
				x: position.x,
				y: position.y,
			});
		} finally {
			setIsCreating(false);
		}
	}

	return (
		<CanvasShell
			applications={apps}
			isAdding={isCreating}
			isLoading={applicationsQuery.data === undefined}
			onAddApplication={handleAddApplication}
			syncLabel="Convex live sync"
		/>
	);
}

function LocalCanvas() {
	const [applications, setApplications] = useState<Application[]>([]);

	function handleAddApplication() {
		setApplications((currentApplications) => {
			const nextIndex = currentApplications.length;
			const position = getApplicationPosition(nextIndex);

			return [
				...currentApplications,
				{
					createdAt: Date.now(),
					id: `local-${Date.now()}-${nextIndex}`,
					name: `Application ${nextIndex + 1}`,
					status: "ready",
					x: position.x,
					y: position.y,
				},
			];
		});
	}

	return (
		<CanvasShell
			applications={applications}
			isAdding={false}
			isLoading={false}
			onAddApplication={handleAddApplication}
			syncLabel="Local draft mode"
		/>
	);
}

function useSyncedApplications() {
	return {
		create: useMutation(createApplication),
		data: useQuery(listApplications, {}),
	};
}

function CanvasShell({
	applications,
	isAdding,
	isLoading,
	onAddApplication,
	syncLabel,
}: {
	applications: Application[];
	isAdding: boolean;
	isLoading: boolean;
	onAddApplication: () => void;
	syncLabel: string;
}) {
	const nodes = applications.map((application) => ({
		data: {
			createdLabel: new Intl.DateTimeFormat("en", {
				hour: "numeric",
				minute: "2-digit",
			}).format(application.createdAt),
			name: application.name,
			status: application.status,
			syncLabel,
		},
		dragging: false,
		id: application.id,
		position: { x: application.x, y: application.y },
		type: "application",
	})) satisfies ApplicationFlowNode[];

	return (
		<main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
			<header className="flex min-h-18 flex-col gap-4 border-slate-200 border-b bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
				<div>
					<p className="font-medium text-slate-500 text-xs uppercase tracking-wide">
						Runway
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Application canvas
					</h1>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 text-sm">
						{syncLabel}
					</div>
					<Button
						className="h-10 rounded-md bg-slate-900 px-4 font-medium text-white hover:bg-slate-700"
						disabled={isAdding}
						onClick={onAddApplication}
					>
						<Plus className="size-4" />
						{isAdding ? "Adding..." : "Add application"}
					</Button>
				</div>
			</header>

			<section className="relative h-[calc(100vh-4.5rem)] min-h-[520px]">
				{applications.length === 0 && !isLoading ? (
					<div className="absolute inset-0 z-10 grid place-items-center px-6">
						<div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
							<h2 className="font-semibold text-xl tracking-tight">
								Empty canvas
							</h2>
							<p className="mt-2 text-slate-600 text-sm leading-6">
								Add an application to place it on the canvas.
							</p>
							<Button
								className="mt-5 rounded-md bg-slate-900 px-4 font-medium text-white hover:bg-slate-700"
								onClick={onAddApplication}
							>
								<Plus className="size-4" />
								Add application
							</Button>
						</div>
					</div>
				) : null}

				{isLoading ? (
					<div className="absolute inset-x-0 top-8 z-10 mx-auto w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600 text-sm shadow-sm">
						Loading canvas
					</div>
				) : null}

				<ReactFlow
					className="runway-canvas"
					fitView
					fitViewOptions={{ maxZoom: 1, padding: 0.35 }}
					nodeTypes={nodeTypes}
					nodes={nodes}
					nodesDraggable={false}
					nodesFocusable={false}
					nodesConnectable={false}
					onNodesChange={() => undefined}
					panOnScroll
					proOptions={{ hideAttribution: true }}
				>
					<Background
						color="#cbd5e1"
						gap={24}
						size={1}
						variant={BackgroundVariant.Dots}
					/>
					<Controls position="bottom-right" showInteractive={false} />
				</ReactFlow>
			</section>
		</main>
	);
}

function ApplicationCardNode({ data }: NodeProps<ApplicationFlowNode>) {
	return (
		<div className="w-60 rounded-lg border border-slate-200 bg-white p-4 text-slate-950 shadow-sm">
			<Handle
				className="!border-white !bg-slate-400"
				position={Position.Left}
				type="target"
			/>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-semibold text-base">{data.name}</p>
					<p className="mt-1 text-slate-500 text-sm">Application service</p>
				</div>
				<span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 text-xs">
					{data.status}
				</span>
			</div>
			<div className="mt-4 grid grid-cols-2 gap-2 text-xs">
				<div className="rounded-md border border-slate-200 bg-slate-50 p-3">
					<p className="text-slate-500">Sync</p>
					<p className="mt-1 text-slate-700">{data.syncLabel}</p>
				</div>
				<div className="rounded-md border border-slate-200 bg-slate-50 p-3">
					<p className="text-slate-500">Added</p>
					<p className="mt-1 text-slate-700">{data.createdLabel}</p>
				</div>
			</div>
			<Handle
				className="!border-white !bg-slate-400"
				position={Position.Right}
				type="source"
			/>
		</div>
	);
}

function getApplicationPosition(index: number) {
	return {
		x: 120 + (index % 3) * 310,
		y: 160 + Math.floor(index / 3) * 210,
	};
}
