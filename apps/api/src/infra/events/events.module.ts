import { Module } from "@nestjs/common";

import { ChangePublisher } from "../../domain/canvas/application/events/change-publisher";
import { CanvasHub } from "./canvas-hub";

@Module({
	providers: [
		CanvasHub,
		{
			provide: ChangePublisher,
			useExisting: CanvasHub,
		},
	],
	exports: [ChangePublisher, CanvasHub],
})
export class EventsModule {}
