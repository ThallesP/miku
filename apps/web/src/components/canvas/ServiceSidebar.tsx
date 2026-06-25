import { api, type Doc, type Id } from "@miku/backend";
import { useMutation } from "convex/react";
import { CircleStop, Container, LoaderCircle, Rocket } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { sourceKindLabel, sourceRef } from "@/lib/source";
import { isActiveStatus } from "@/lib/status";
import { EnvEditor } from "./EnvEditor";
import { StatusBadge } from "./StatusBadge";

// The Railway-style service panel. Opening a service shows its source, its
// variables, and its single deployment — pick a server, deploy, stop. One service
// owns one active deployment at a time; stopping frees it to deploy again.
export function ServiceSidebar({
	app,
	deployments,
	servers,
	open,
	onOpenChange,
}: {
	app: Doc<"apps"> | null;
	deployments: Doc<"deployments">[];
	servers: Doc<"servers">[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="w-full gap-0 overflow-y-auto sm:max-w-md"
				side="right"
			>
				{app ? (
					<ServiceSidebarBody
						app={app}
						deployments={deployments}
						key={app._id}
						servers={servers}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function ServiceSidebarBody({
	app,
	deployments,
	servers,
}: {
	app: Doc<"apps">;
	deployments: Doc<"deployments">[];
	servers: Doc<"servers">[];
}) {
	const createDeployment = useMutation(api.deployments.create);
	const stopDeployment = useMutation(api.deployments.stop);
	const updateApp = useMutation(api.apps.update);

	// The service's single deployment: its most recent placement. Active states
	// (pending/pulling/running) mean it's live; stopped/failed are deployable-over.
	const current = deployments
		.filter((deployment) => deployment.appId === app._id)
		.sort((a, b) => b._creationTime - a._creationTime)[0];
	const active = current ? isActiveStatus(current.status) : false;

	const [serverId, setServerId] = useState<string>("");
	const [busy, setBusy] = useState(false);

	// Default the target to where it last ran, else the first connected server.
	useEffect(() => {
		if (serverId !== "") {
			return;
		}
		const fallback = current?.serverId ?? servers[0]?._id;
		if (fallback) {
			setServerId(fallback);
		}
	}, [servers, current, serverId]);

	const serverName = (id: Id<"servers">) =>
		servers.find((server) => server._id === id)?.name ?? "unknown server";

	async function handleDeploy() {
		if (serverId === "") {
			return;
		}
		setBusy(true);
		try {
			await createDeployment({
				appId: app._id,
				serverId: serverId as Id<"servers">,
			});
		} finally {
			setBusy(false);
		}
	}

	async function handleStop() {
		if (!current) {
			return;
		}
		setBusy(true);
		try {
			await stopDeployment({ id: current._id });
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<SheetHeader className="border-b">
				<div className="flex items-center gap-3">
					<span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						<Container className="size-5" />
					</span>
					<div className="min-w-0">
						<SheetTitle className="truncate">{app.name}</SheetTitle>
						<SheetDescription className="truncate">
							{sourceKindLabel(app.source)}
						</SheetDescription>
					</div>
				</div>
			</SheetHeader>

			<div className="flex flex-col gap-6 p-4">
				<Section title="Deployment">
					{active && current ? (
						<div className="flex flex-col gap-3 rounded-lg border p-3">
							<div className="flex items-center justify-between gap-2">
								<StatusBadge status={current.status} />
								<span className="text-muted-foreground text-xs">
									on {serverName(current.serverId)}
								</span>
							</div>
							<Button
								className="w-full"
								disabled={busy}
								onClick={handleStop}
								size="sm"
								variant="outline"
							>
								{busy ? (
									<LoaderCircle className="size-4 animate-spin" />
								) : (
									<CircleStop className="size-4" />
								)}
								Stop
							</Button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{current ? (
								<div className="flex items-center justify-between gap-2">
									<StatusBadge status={current.status} />
									{current.status === "failed" && current.message ? (
										<span className="truncate text-destructive text-xs">
											{current.message}
										</span>
									) : (
										<span className="text-muted-foreground text-xs">
											last on {serverName(current.serverId)}
										</span>
									)}
								</div>
							) : null}

							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">Server</Label>
								<Select onValueChange={setServerId} value={serverId}>
									<SelectTrigger className="w-full" size="sm">
										<SelectValue placeholder="Select a server" />
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

							{servers.length === 0 ? (
								<p className="text-muted-foreground text-xs">
									No servers connected yet.
								</p>
							) : null}

							<Button
								className="w-full"
								disabled={busy || serverId === ""}
								onClick={handleDeploy}
								size="sm"
							>
								{busy ? (
									<LoaderCircle className="size-4 animate-spin" />
								) : (
									<Rocket className="size-4" />
								)}
								{current ? "Redeploy" : "Deploy"}
							</Button>
						</div>
					)}
				</Section>

				<Section title="Source">
					<div className="rounded-lg border p-3">
						<p className="break-all font-mono text-xs">
							{sourceRef(app.source)}
						</p>
					</div>
				</Section>

				<Section hint="Applied on the next deploy." title="Variables">
					<EnvEditor
						env={app.env}
						onSave={async (env) => {
							await updateApp({ id: app._id, env });
						}}
					/>
				</Section>
			</div>
		</>
	);
}

function Section({
	title,
	hint,
	children,
}: {
	title: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between">
				<h3 className="font-medium text-sm">{title}</h3>
				{hint ? (
					<span className="text-muted-foreground text-xs">{hint}</span>
				) : null}
			</div>
			{children}
		</section>
	);
}
