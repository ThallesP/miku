import type { AppSource, DeploymentStatus, Id } from "@miku/backend";
import type { Node, NodeProps } from "@xyflow/react";
import { Box, PanelRight, Trash2 } from "lucide-react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { sourceRef } from "@/lib/source";
import { cn } from "@/lib/utils";
import { useCanvasActions } from "./actions";
import { StatusBadge } from "./StatusBadge";

// What the canvas needs to draw a service. Position lives on the node itself; this
// is just the service's identity, source, and latest deployment status.
export type AppNodeData = {
	id: Id<"apps">;
	name: string;
	source: AppSource;
	status?: DeploymentStatus;
} & Record<string, unknown>;

export type AppNode = Node<AppNodeData, "application">;

// A Railway-style service card. Left-click (handled by the canvas) opens the
// service sidebar; right-click opens a context menu — Open, or Delete. Delete is
// the AlertDialog trigger (nested so the menu's close doesn't race the dialog),
// and confirms first since it tears the deployment down.
export function ApplicationNode({ data, selected }: NodeProps<AppNode>) {
	const { openService, deleteService } = useCanvasActions();

	return (
		<AlertDialog>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						className={cn(
							"w-60 cursor-pointer rounded-xl border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md",
							selected
								? "border-primary ring-2 ring-primary/20"
								: "border-border",
						)}
					>
						<div className="flex items-center gap-2.5">
							<span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
								<Box className="size-4" />
							</span>
							<div className="min-w-0">
								<p className="truncate font-semibold text-sm">{data.name}</p>
								<p className="truncate text-muted-foreground text-xs">
									{sourceRef(data.source)}
								</p>
							</div>
						</div>
						<div className="mt-3">
							{data.status ? (
								<StatusBadge status={data.status} />
							) : (
								<span className="text-muted-foreground text-xs">
									Not deployed
								</span>
							)}
						</div>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className="w-44">
					<ContextMenuItem onSelect={() => openService(data.id)}>
						<PanelRight className="size-4" />
						Open
					</ContextMenuItem>
					<ContextMenuSeparator />
					<AlertDialogTrigger asChild>
						<ContextMenuItem
							onSelect={(event) => event.preventDefault()}
							variant="destructive"
						>
							<Trash2 className="size-4" />
							Delete service
						</ContextMenuItem>
					</AlertDialogTrigger>
				</ContextMenuContent>
			</ContextMenu>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {data.name}?</AlertDialogTitle>
					<AlertDialogDescription>
						Its deployment is torn down and removed. This can't be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className={cn(
							buttonVariants({ variant: "destructive" }),
							"text-white",
						)}
						onClick={() => deleteService(data.id)}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
