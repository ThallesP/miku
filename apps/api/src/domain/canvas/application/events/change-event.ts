import type {
	ApplicationCreated,
	ApplicationMoved,
	ServerChanged,
} from "@miku/db";

// The events the EventBus carries. Aggregates raise ApplicationCreated/Moved
// (drained by the afterFlush subscriber); the server heartbeat raises
// ServerChanged app-layer. A move carries the new position so it can be applied
// live; everything else just signals a refetch.
export type ChangeEvent = ApplicationCreated | ApplicationMoved | ServerChanged;
