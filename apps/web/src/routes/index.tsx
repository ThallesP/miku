import { createFileRoute } from "@tanstack/react-router";
import { ReactFlow } from "@xyflow/react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="p-8">
			<div className="w-12 h-12">
				<ReactFlow
					nodes={[
						{
							id: "1",
							position: { x: 0, y: 0 },
							data: { label: "" },
						},
					]}
				/>
			</div>
		</div>
	);
}
