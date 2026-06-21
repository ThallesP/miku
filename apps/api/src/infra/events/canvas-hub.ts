import { Injectable } from "@nestjs/common";
import type { Driver } from "tgrid";

import { ChangePublisher } from "../../domain/canvas/application/events/change-publisher";
import type {
	ApplicationMoved,
	CanvasListener,
} from "../http/controllers/canvas.protocol";

// Tracks every connected dashboard so the server can push realtime canvas
// updates to them — both lightweight "refetch" pings and live application moves.
@Injectable()
export class CanvasHub implements ChangePublisher {
	private readonly clients = new Set<Driver<CanvasListener>>();

	// register a connected dashboard; returns a function that unregisters it
	join(client: Driver<CanvasListener>): () => void {
		this.clients.add(client);
		return () => {
			this.clients.delete(client);
		};
	}

	// something changed (app created, worker heartbeat, …) — tell everyone to refetch
	publish(): void {
		for (const client of this.clients) {
			client.changed().catch(() => {});
		}
	}

	// an application was dragged — tell everyone except the dragger to move it live
	broadcastMove(from: Driver<CanvasListener>, move: ApplicationMoved): void {
		for (const client of this.clients) {
			if (client !== from) {
				client.moved(move).catch(() => {});
			}
		}
	}
}
