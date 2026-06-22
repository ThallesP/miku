// The structural shape of a domain event. The API layer's precise ChangeEvent
// union satisfies this, so entities can record events without importing (or
// depending on) the wire vocabulary — keeping @miku/db framework-free.
export interface DomainEvent {
	readonly type: string;
}

// A minimal aggregate base: an entity records domain events as a side effect of
// its own methods/setters, and infrastructure drains them after the change
// commits.
//
// The buffer is intentionally UNDECORATED and LAZY. MikroORM hydrates a row with
// Object.create + direct field assignment — the constructor and field
// initializers never run — so a freshly loaded entity simply starts with no
// buffer, and record() materializes it on first use. No @Property means the ORM
// never tracks, persists, diffs, or hydrates it.
export abstract class AggregateRoot {
	private _events?: DomainEvent[];

	// generic so a richer event literal keeps its type past the {type} supertype
	// (and dodges excess-property checks) while still being stored as DomainEvent
	protected record<E extends DomainEvent>(event: E): void {
		this._events ??= [];
		this._events.push(event);
	}

	// hand off the buffered events and reset; called once per commit by the
	// infrastructure that dispatches them
	pullEvents(): readonly DomainEvent[] {
		const events = this._events ?? [];
		this._events = undefined;
		return events;
	}
}
