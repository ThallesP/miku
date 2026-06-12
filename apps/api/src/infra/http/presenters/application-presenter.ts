import type { Application } from "@miku/db";

export interface ApplicationHTTP {
	id: string;
	name: string;
	x: number;
	y: number;
	createdAt: number;
}

export class ApplicationPresenter {
	static toHTTP(application: Application): ApplicationHTTP {
		return {
			id: application.id,
			name: application.name,
			x: application.position.x,
			y: application.position.y,
			createdAt: application.createdAt.getTime(),
		};
	}
}
