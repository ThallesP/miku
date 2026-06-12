import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

import type { ChangeEvent } from "../../domain/canvas/application/events/change-event";
import type { ChangePublisher } from "../../domain/canvas/application/events/change-publisher";

@Injectable()
export class ChangeStream implements ChangePublisher {
	private readonly changes = new Subject<ChangeEvent>();

	publish(event: ChangeEvent): void {
		this.changes.next(event);
	}

	stream() {
		return this.changes.asObservable();
	}
}
