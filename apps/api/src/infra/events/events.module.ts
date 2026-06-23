import { Module } from "@nestjs/common";

import { ChangePublisher } from "../../domain/canvas/application/events/change-publisher";
import { CanvasBroadcaster } from "./canvas-broadcaster";
import { DomainEventsSubscriber } from "./domain-events.subscriber";
import { EventBus } from "./event-bus";

@Module({
	providers: [
		EventBus,
		// app-layer publish seam: use cases that emit an event NOT tied to an
		// aggregate's persisted mutation (e.g. the server heartbeat) publish here.
		// aggregate-authored events go through DomainEventsSubscriber instead.
		{
			provide: ChangePublisher,
			useExisting: EventBus,
		},
		CanvasBroadcaster,
		DomainEventsSubscriber,
	],
	exports: [ChangePublisher, CanvasBroadcaster],
})
export class EventsModule {}
