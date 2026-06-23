// The realtime canvas protocol, shared by the API (server) and the dashboard
// (client, through the generated SDK). Kept dependency-free on purpose: the
// generated SDK re-exports these types, so the web app compiles this file too.

// one application being dragged to a new position
export interface ApplicationMoved {
	id: string;
	x: number;
	y: number;
}

// server -> client: live updates pushed to every connected dashboard
export interface CanvasListener {
	// another dashboard dragged an application
	moved(move: ApplicationMoved): void;
	// applications or servers changed (created, worker heartbeat, …) — refetch
	changed(): void;
}

// client -> server: what a connected dashboard can ask the server to do
export interface CanvasProvider {
	move(move: ApplicationMoved): Promise<void>;
}
