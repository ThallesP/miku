import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EnvRow = { id: number; key: string; value: string };

// Stable row ids so editing one input doesn't steal focus from another. Built
// once from the saved env; the component is keyed by service id upstream, so it
// re-seeds when you switch services.
function rowsFromEnv(
	env: Record<string, string> | undefined,
	nextId: () => number,
): EnvRow[] {
	return Object.entries(env ?? {}).map(([key, value]) => ({
		id: nextId(),
		key,
		value,
	}));
}

function envFromRows(rows: EnvRow[]): Record<string, string> {
	return Object.fromEntries(
		rows
			.filter((row) => row.key.trim() !== "")
			.map((row) => [row.key.trim(), row.value]),
	);
}

// Service-level variables. Edits are local until saved; saving patches the app,
// and the values are snapshotted into the next deployment (not retroactively).
export function EnvEditor({
	env,
	onSave,
}: {
	env: Record<string, string> | undefined;
	onSave: (env: Record<string, string>) => Promise<void>;
}) {
	const idRef = useRef(0);
	const nextId = () => idRef.current++;
	const [rows, setRows] = useState<EnvRow[]>(() => rowsFromEnv(env, nextId));
	const [saving, setSaving] = useState(false);

	const dirty = JSON.stringify(envFromRows(rows)) !== JSON.stringify(env ?? {});

	function update(id: number, patch: Partial<EnvRow>) {
		setRows((prev) =>
			prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
		);
	}

	async function handleSave() {
		setSaving(true);
		try {
			await onSave(envFromRows(rows));
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-xs">No variables yet.</p>
			) : (
				rows.map((row) => (
					<div className="flex items-center gap-2" key={row.id}>
						<Input
							className="h-8 font-mono text-xs"
							onChange={(event) => update(row.id, { key: event.target.value })}
							placeholder="KEY"
							value={row.key}
						/>
						<Input
							className="h-8 font-mono text-xs"
							onChange={(event) =>
								update(row.id, { value: event.target.value })
							}
							placeholder="value"
							value={row.value}
						/>
						<Button
							className="size-8 shrink-0 text-muted-foreground"
							onClick={() =>
								setRows((prev) => prev.filter((r) => r.id !== row.id))
							}
							size="icon"
							variant="ghost"
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				))
			)}

			<div className="flex items-center justify-between">
				<Button
					className="w-fit"
					onClick={() =>
						setRows((prev) => [...prev, { id: nextId(), key: "", value: "" }])
					}
					size="sm"
					variant="ghost"
				>
					<Plus className="size-4" />
					Add variable
				</Button>
				{dirty && (
					<Button
						disabled={saving}
						onClick={handleSave}
						size="sm"
						variant="secondary"
					>
						{saving && <LoaderCircle className="size-4 animate-spin" />}
						Save
					</Button>
				)}
			</div>
		</div>
	);
}
