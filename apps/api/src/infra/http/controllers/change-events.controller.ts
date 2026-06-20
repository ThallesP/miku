import { Controller, type MessageEvent, Sse } from "@nestjs/common";
import { map, type Observable } from "rxjs";
import { AuthMethods } from "../../auth/auth-methods.decorator";
import { ChangeStream } from "../../events/change-stream";

@Controller("events")
@AuthMethods("session")
export class ChangeEventsController {
	constructor(private changeStream: ChangeStream) {}

	@Sse()
	handle(): Observable<MessageEvent> {
		return this.changeStream.stream().pipe(map((event) => ({ data: event })));
	}
}
