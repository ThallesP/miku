import type { DeploymentStatus } from "@miku/backend";

import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE_CLASS, STATUS_DOT_CLASS } from "@/lib/status";
import { cn } from "@/lib/utils";

// A status pill with a leading dot. Used on the canvas node and in the sidebar so
// a deployment reads the same everywhere.
export function StatusBadge({
	status,
	className,
}: {
	status: DeploymentStatus;
	className?: string;
}) {
	return (
		<Badge
			variant="outline"
			className={cn(STATUS_BADGE_CLASS[status], className)}
		>
			<span className={cn("size-1.5 rounded-full", STATUS_DOT_CLASS[status])} />
			{status}
		</Badge>
	);
}
