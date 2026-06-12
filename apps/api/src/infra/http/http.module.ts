import { Module } from "@nestjs/common";

import { CreateApplicationUseCase } from "../../domain/canvas/application/use-cases/create-application";
import { FetchApplicationsUseCase } from "../../domain/canvas/application/use-cases/fetch-applications";
import { FetchServersUseCase } from "../../domain/canvas/application/use-cases/fetch-servers";
import { HeartbeatServerUseCase } from "../../domain/canvas/application/use-cases/heartbeat-server";
import { MoveApplicationUseCase } from "../../domain/canvas/application/use-cases/move-application";
import { RegisterServerUseCase } from "../../domain/canvas/application/use-cases/register-server";
import { DatabaseModule } from "../database/database.module";
import { EventsModule } from "../events/events.module";
import { ChangeEventsController } from "./controllers/change-events.controller";
import { CreateApplicationController } from "./controllers/create-application.controller";
import { FetchApplicationsController } from "./controllers/fetch-applications.controller";
import { FetchServersController } from "./controllers/fetch-servers.controller";
import { HeartbeatServerController } from "./controllers/heartbeat-server.controller";
import { MoveApplicationController } from "./controllers/move-application.controller";
import { RegisterServerController } from "./controllers/register-server.controller";

@Module({
	imports: [DatabaseModule, EventsModule],
	controllers: [
		CreateApplicationController,
		FetchApplicationsController,
		MoveApplicationController,
		FetchServersController,
		RegisterServerController,
		HeartbeatServerController,
		ChangeEventsController,
	],
	providers: [
		CreateApplicationUseCase,
		FetchApplicationsUseCase,
		MoveApplicationUseCase,
		FetchServersUseCase,
		RegisterServerUseCase,
		HeartbeatServerUseCase,
	],
})
export class HttpModule {}
