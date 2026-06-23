// Domain events are classes: a small, typed vocabulary the aggregates raise and
// the EventBus carries. `type` is the discriminant downstream switches on;
// `occurredAt` is stamped when the event happens.
export abstract class DomainEvent {
	readonly occurredAt = new Date();
	abstract readonly type: string;
}

export class ApplicationCreated extends DomainEvent {
	readonly type = "application.created";

	constructor(readonly id: string) {
		super();
	}
}

export class ApplicationMoved extends DomainEvent {
	readonly type = "application.moved";

	constructor(
		readonly id: string,
		readonly x: number,
		readonly y: number,
	) {
		super();
	}
}

export class ServerChanged extends DomainEvent {
	readonly type = "server.changed";
}
