import type { IncomingMessage } from "node:http";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { WebSocketRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { Driver, WebSocketAcceptor } from "tgrid";

import { MoveApplicationUseCase } from "../../../domain/canvas/application/use-cases/move-application";
import { auth } from "../../auth/auth";
import { CanvasBroadcaster } from "../../events/canvas-broadcaster";
import type { CanvasListener, CanvasProvider } from "./canvas.protocol";

@Controller("canvas")
export class CanvasController {
	constructor(
		private readonly orm: MikroORM,
		private readonly broadcaster: CanvasBroadcaster,
		private readonly moveApplication: MoveApplicationUseCase,
	) {}

	@WebSocketRoute()
	async connect(
		// nestia reads the three type arguments off this parameter to generate the
		// client SDK, so they must stay inline here (a type alias hides them).
		@WebSocketRoute.Acceptor()
		acceptor: WebSocketAcceptor<object, CanvasProvider, CanvasListener>,
		@WebSocketRoute.Driver() client: Driver<CanvasListener>,
	): Promise<void> {
		// nestia drives WebSocket routes outside Nest's HTTP pipeline, so the global
		// auth guard never runs here. Authenticate the handshake ourselves with the
		// session cookie the browser sends along with the upgrade request.
		if (!(await this.authenticated(acceptor))) {
			await acceptor.reject(1008, "Unauthorized");
			return;
		}

		await acceptor.accept({
			move: ({ id, x, y }) =>
				// Just persist the move; the use case publishes "application.moved" to
				// the bus, which the broadcaster fans out to the connected dashboards.
				// There's no per-request MikroORM context here either, so open one.
				RequestContext.create(this.orm.em, async () => {
					await this.moveApplication.execute({ applicationId: id, x, y });
				}),
		});

		const leave = this.broadcaster.join(client);
		await acceptor.join(); // resolves when the dashboard disconnects
		leave();
	}

	private async authenticated(
		acceptor: WebSocketAcceptor<object, CanvasProvider, CanvasListener>,
	): Promise<boolean> {
		// tgrid doesn't expose the upgrade request, but it carries the cookies.
		const { headers } = (acceptor as unknown as { request_: IncomingMessage })
			.request_;
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(headers),
		});
		return session !== null;
	}
}
