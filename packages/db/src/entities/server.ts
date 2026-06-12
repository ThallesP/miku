import { randomUUID } from "node:crypto";

import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

import { InvalidNameError } from "../errors/invalid-name-error";
import { failure, type Result, success } from "../result";

const ONLINE_THRESHOLD_MS = 15_000;

@Entity()
export class Server {
	@PrimaryKey({ type: "string" })
	id: string = randomUUID();

	@Property({ type: "string", unique: true })
	name: string;

	@Property({ type: "string" })
	address: string;

	@Property({ type: "string" })
	network: string;

	@Property({ type: "datetime" })
	joinedAt: Date = new Date();

	@Property({ type: "datetime" })
	lastSeenAt: Date = new Date();

	// hydration from the database bypasses the constructor (and the field
	// initializers above) — this only runs for newly registered servers
	private constructor(props: {
		name: string;
		address: string;
		network: string;
	}) {
		this.name = props.name;
		this.address = props.address;
		this.network = props.network;
	}

	// computed, not persisted
	get isOnline() {
		return Date.now() - this.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;
	}

	static create(props: {
		name: string;
		address: string;
		network: string;
	}): Result<InvalidNameError, Server> {
		if (props.name.trim().length === 0) {
			return failure(new InvalidNameError());
		}

		return success(new Server(props));
	}
}
