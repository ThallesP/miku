import type { ChangeEvent } from "./change-event";

export abstract class ChangePublisher {
	abstract publish(event: ChangeEvent): void;
}
