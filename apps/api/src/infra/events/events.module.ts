import { Module } from "@nestjs/common";

import { ChangePublisher } from "../../domain/canvas/application/events/change-publisher";
import { ChangeStream } from "./change-stream";

@Module({
	providers: [
		ChangeStream,
		{
			provide: ChangePublisher,
			useExisting: ChangeStream,
		},
	],
	exports: [ChangePublisher, ChangeStream],
})
export class EventsModule {}
