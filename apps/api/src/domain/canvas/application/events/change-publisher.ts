import type { ChangeEvent } from "./change-event";

// The domain publishes changes here without knowing who listens. Infrastructure
// (the EventBus) fans each event out to its subscribers — today the canvas
// WebSocket, tomorrow whatever else needs to react.
export abstract class ChangePublisher {
	abstract publish(event: ChangeEvent): void;
}
