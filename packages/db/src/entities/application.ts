import { randomUUID } from "node:crypto";

import { Embedded, Entity, PrimaryKey, Property } from "@mikro-orm/core";

import type { InvalidNameError } from "../errors/invalid-name-error";
import { type Result, success } from "../result";
import { Position } from "./position";

// column types are explicit everywhere: this package ships compiled JS, so
// MikroORM cannot infer them from TypeScript metadata
@Entity()
export class Application {
	@PrimaryKey({ type: "string" })
	id: string = randomUUID();

	@Property({ type: "string" })
	name: string;

	// prefix: false keeps the columns named x and y
	@Embedded(() => Position, { prefix: false })
	position: Position;

	@Property({ type: "datetime" })
	createdAt: Date = new Date();

	// hydration from the database bypasses the constructor (and the field
	// initializers above) — this only runs for newly created applications
	private constructor(props: { name: string; position: Position }) {
		this.name = props.name;
		this.position = props.position;
	}

	static create(props: {
		name: string;
		position: Position;
	}): Result<InvalidNameError, Application> {
		return success(new Application(props));
	}
}
