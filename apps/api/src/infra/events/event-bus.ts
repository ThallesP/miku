import { Injectable } from "@nestjs/common";

import type { ChangeEvent } from "../../domain/canvas/application/events/change-event";
import { ChangePublisher } from "../../domain/canvas/application/events/change-publisher";

type Subscriber = (event: ChangeEvent) => void;

// The one place every change flows through. Use cases publish via ChangePublisher
// (which this implements); anything that needs to react subscribes. Today the
// only subscriber is the canvas WebSocket, but an audit log, a webhook fan-out,
// or metrics could subscribe the same way without the publishers knowing.
@Injectable()
export class EventBus implements ChangePublisher {
	private readonly subscribers = new Set<Subscriber>();

	publish(event: ChangeEvent): void {
		for (const notify of this.subscribers) {
			notify(event);
		}
	}

	// subscribe to every change; returns a function that unsubscribes
	subscribe(subscriber: Subscriber): () => void {
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
		};
	}
}
