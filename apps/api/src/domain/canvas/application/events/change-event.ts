// Something happened that connected dashboards may care about. A move carries
// the new position so it can be applied live; everything else just signals that
// the relevant data changed and should be refetched. Add new variants here as
// more of the system starts publishing.
export type ChangeEvent =
	| { type: "application.created" }
	| { type: "application.moved"; id: string; x: number; y: number }
	| { type: "server.changed" };
