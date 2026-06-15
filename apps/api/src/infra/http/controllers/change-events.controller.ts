import { Controller, type MessageEvent, Sse } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { map, type Observable } from "rxjs";
import { ChangeStream } from "../../events/change-stream";

// TODO: tighten auth — public for now to keep workers/web working
@AllowAnonymous()
@Controller("events")
export class ChangeEventsController {
	constructor(private changeStream: ChangeStream) {}

	@Sse()
	handle(): Observable<MessageEvent> {
		return this.changeStream.stream().pipe(map((event) => ({ data: event })));
	}
}
