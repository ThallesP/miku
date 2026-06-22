import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Driver } from "tgrid";

import type { ChangeEvent } from "../../domain/canvas/application/events/change-event";
import type { CanvasListener } from "../http/controllers/canvas.protocol";
import { EventBus } from "./event-bus";

// A subscriber that turns bus events into pushes for every connected dashboard:
// a live `moved` for drags, a `changed` refetch ping for everything else. The
// canvas WebSocket controller registers/unregisters dashboards via join().
@Injectable()
export class CanvasBroadcaster implements OnModuleInit {
	private readonly clients = new Set<Driver<CanvasListener>>();

	constructor(private readonly bus: EventBus) {}

	onModuleInit(): void {
		this.bus.subscribe((event) => this.dispatch(event));
	}

	// register a connected dashboard; returns a function that unregisters it
	join(client: Driver<CanvasListener>): () => void {
		this.clients.add(client);
		return () => {
			this.clients.delete(client);
		};
	}

	private dispatch(event: ChangeEvent): void {
		for (const client of this.clients) {
			this.push(client, event).catch(() => {});
		}
	}

	private push(
		client: Driver<CanvasListener>,
		event: ChangeEvent,
	): Promise<void> {
		switch (event.type) {
			case "application.moved":
				return client.moved({ id: event.id, x: event.x, y: event.y });
			case "application.created":
			case "server.changed":
				return client.changed();
			default: {
				// exhaustiveness guard: a new ChangeEvent variant won't compile until
				// it decides how it reaches connected dashboards
				const _exhaustive: never = event;
				return Promise.resolve(_exhaustive);
			}
		}
	}
}
