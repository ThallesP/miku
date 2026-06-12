import type { Server } from "@miku/db";

export interface ServerHTTP {
	id: string;
	name: string;
	address: string;
	network: string;
	joinedAt: number;
	lastSeenAt: number;
	online: boolean;
}

export class ServerPresenter {
	static toHTTP(server: Server): ServerHTTP {
		return {
			id: server.id,
			name: server.name,
			address: server.address,
			network: server.network,
			joinedAt: server.joinedAt.getTime(),
			lastSeenAt: server.lastSeenAt.getTime(),
			online: server.isOnline,
		};
	}
}
