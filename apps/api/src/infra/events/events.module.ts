import { Module } from "@nestjs/common";

import { ChangePublisher } from "../../domain/canvas/application/events/change-publisher";
import { CanvasBroadcaster } from "./canvas-broadcaster";
import { EventBus } from "./event-bus";

@Module({
	providers: [
		EventBus,
		{
			provide: ChangePublisher,
			useExisting: EventBus,
		},
		CanvasBroadcaster,
	],
	exports: [ChangePublisher, CanvasBroadcaster],
})
export class EventsModule {}
