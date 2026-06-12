import { Controller, type MessageEvent, Sse } from "@nestjs/common";
import { map, type Observable } from "rxjs";

import { ChangeStream } from "../../events/change-stream";

@Controller("events")
export class ChangeEventsController {
	constructor(private changeStream: ChangeStream) {}

	@Sse()
	handle(): Observable<MessageEvent> {
		return this.changeStream.stream().pipe(map((event) => ({ data: event })));
	}
}
