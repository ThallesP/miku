import {
	type EventSubscriber,
	type FlushEventArgs,
	MikroORM,
} from "@mikro-orm/core";
import { AggregateRoot } from "@miku/db";
import { Injectable, type OnModuleInit } from "@nestjs/common";

import type { ChangeEvent } from "../../domain/canvas/application/events/change-event";
import { EventBus } from "./event-bus";

// Bridges MikroORM's unit of work to the EventBus: after a flush commits, drain
// the domain events every aggregate buffered during the request and publish
// them. Draining the identity map (rather than the changesets) means an event
// fires iff a domain method actually recorded one — e.g. a no-op move to the
// same coordinates produces no changeset but still emits "application.moved".
@Injectable()
export class DomainEventsSubscriber implements EventSubscriber, OnModuleInit {
	constructor(
		private readonly orm: MikroORM,
		private readonly bus: EventBus,
	) {}

	// registered at runtime (not via config `subscribers`) so the subscriber keeps
	// its Nest-injected EventBus
	onModuleInit(): void {
		this.orm.em.getEventManager().registerSubscriber(this);
	}

	// afterFlush runs after the implicit transaction commits, so events are only
	// published for durably-persisted changes; if the flush throws, this never
	// runs and the buffered events are discarded with the rolled-back entities
	afterFlush(args: FlushEventArgs): void {
		for (const entity of args.uow.getIdentityMap()) {
			if (entity instanceof AggregateRoot) {
				for (const event of entity.pullEvents()) {
					// the only widening point; the broadcaster's exhaustive switch is
					// the real guard against an unhandled variant
					this.bus.publish(event as ChangeEvent);
				}
			}
		}
	}
}
