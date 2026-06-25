import type { AppSource } from "@miku/backend";
import {
	Container,
	GitBranch,
	LoaderCircle,
	type LucideIcon,
	Plus,
	Rocket,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// The kinds of source a service can have. Docker ships today; the rest are shown
// so the shape is obvious, but disabled until their deploy path exists. Adding a
// kind here is how the modal grows — it never branches on a magic string.
type SourceKind = "docker" | "github" | "template";

const SOURCE_KINDS: {
	id: SourceKind;
	label: string;
	description: string;
	icon: LucideIcon;
	available: boolean;
}[] = [
	{
		id: "docker",
		label: "Docker Image",
		description: "Deploy any public or private image",
		icon: Container,
		available: true,
	},
	{
		id: "github",
		label: "GitHub Repo",
		description: "Build & deploy from a repository",
		icon: GitBranch,
		available: false,
	},
	{
		id: "template",
		label: "Template",
		description: "Start from a prebuilt service",
		icon: Rocket,
		available: false,
	},
];

// "ghcr.io/acme/api:1.2" → "api"; "nginx:alpine" → "nginx". A sensible default
// service name so the common case needs no typing.
function defaultNameFromImage(image: string): string {
	const ref = image.split("/").pop() ?? image;
	return ref.split("@")[0].split(":")[0] || image;
}

export function CreateApplicationDialog({
	onCreate,
}: {
	onCreate: (input: { name: string; source: AppSource }) => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const [kind, setKind] = useState<SourceKind>("docker");
	const [image, setImage] = useState("");
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const trimmedImage = image.trim();
	const canCreate = trimmedImage !== "" && !submitting;

	function reset() {
		setKind("docker");
		setImage("");
		setName("");
	}

	async function handleCreate() {
		if (!canCreate) {
			return;
		}
		setSubmitting(true);
		try {
			await onCreate({
				name: name.trim() || defaultNameFromImage(trimmedImage),
				source: { type: "docker", image: trimmedImage },
			});
			setOpen(false);
			reset();
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					reset();
				}
			}}
		>
			<DialogTrigger asChild>
				<Button className="w-fit" size="sm">
					<Plus className="size-4" />
					New service
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New service</DialogTitle>
					<DialogDescription>
						Choose a source. Ports are detected from the image automatically.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-3 gap-2">
					{SOURCE_KINDS.map((source) => (
						<button
							type="button"
							key={source.id}
							disabled={!source.available}
							onClick={() => setKind(source.id)}
							className={cn(
								"relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
								kind === source.id
									? "border-primary bg-accent"
									: "border-border hover:bg-accent/50",
								!source.available && "cursor-not-allowed opacity-50",
							)}
						>
							<source.icon className="size-5 text-muted-foreground" />
							<span className="font-medium text-xs">{source.label}</span>
							{!source.available && (
								<span className="absolute top-2 right-2 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
									Soon
								</span>
							)}
						</button>
					))}
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs" htmlFor="create-image">
							Image
						</Label>
						<Input
							autoFocus
							id="create-image"
							onChange={(event) => setImage(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									void handleCreate();
								}
							}}
							placeholder="nginx:alpine"
							value={image}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs" htmlFor="create-name">
							Name (optional)
						</Label>
						<Input
							id="create-name"
							onChange={(event) => setName(event.target.value)}
							placeholder={
								trimmedImage ? defaultNameFromImage(trimmedImage) : "my-service"
							}
							value={name}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button disabled={!canCreate} onClick={handleCreate}>
						{submitting && <LoaderCircle className="size-4 animate-spin" />}
						Create service
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
