import { Embeddable, Property } from "@mikro-orm/core";

// immutable value object — moving something means replacing its Position
@Embeddable()
export class Position {
	@Property({ type: "float" })
	readonly x: number;

	@Property({ type: "float" })
	readonly y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}
