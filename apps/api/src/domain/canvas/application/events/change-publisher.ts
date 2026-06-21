export abstract class ChangePublisher {
	// Notify connected dashboards that canvas data (applications, servers) changed
	// so they refetch. Realtime application moves are pushed on their own channel.
	abstract publish(): void;
}
