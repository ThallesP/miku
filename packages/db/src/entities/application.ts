import { randomUUID } from "node:crypto";

import { Embedded, Entity, PrimaryKey, Property } from "@mikro-orm/core";

import type { InvalidNameError } from "../errors/invalid-name-error";
import { ApplicationCreated, ApplicationMoved } from "../events";
import { type Result, success } from "../result";
import { AggregateRoot } from "./aggregate-root";
import { Position } from "./position";

// column types are explicit everywhere: this package ships compiled JS, so
// MikroORM cannot infer them from TypeScript metadata
@Entity()
export class Application extends AggregateRoot {
	@PrimaryKey({ type: "string" })
	id: string = randomUUID();

	@Property({ type: "string" })
	name: string;

	// MikroORM hydrates this backing field directly (a plain `entity._position =`
	// assignment), so the public `position` setter below — which records a domain
	// event — only ever runs for genuine moves, never on load. prefix: false keeps
	// the columns named x and y.
	@Embedded(() => Position, { prefix: false })
	private _position: Position;

	@Property({ type: "datetime" })
	createdAt: Date = new Date();

	// hydration from the database bypasses the constructor (and the field
	// initializers above) — this only runs for newly created applications
	private constructor(props: { name: string; position: Position }) {
		super();
		this.name = props.name;
		// write the backing field directly so creating an application doesn't emit
		// a spurious "moved" event
		this._position = props.position;
	}

	get position(): Position {
		return this._position;
	}

	// assigning a new position records the move; the afterFlush subscriber
	// publishes it once the change commits
	set position(value: Position) {
		this._position = value;
		this.record(new ApplicationMoved(this.id, value.x, value.y));
	}

	static create(props: {
		name: string;
		position: Position;
	}): Result<InvalidNameError, Application> {
		const application = new Application(props);
		application.record(new ApplicationCreated(application.id));
		return success(application);
	}
}
