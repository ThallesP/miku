import { Module } from "@nestjs/common";

import { WorkerDiscovery } from "../../domain/canvas/application/discovery/worker-discovery";
import { WorkerProvisioner } from "../../domain/canvas/application/discovery/worker-provisioner";
import { ApproveWorkerUseCase } from "../../domain/canvas/application/use-cases/approve-worker";
import { CreateApplicationUseCase } from "../../domain/canvas/application/use-cases/create-application";
import { DiscoverWorkersUseCase } from "../../domain/canvas/application/use-cases/discover-workers";
import { FetchApplicationsUseCase } from "../../domain/canvas/application/use-cases/fetch-applications";
import { FetchServersUseCase } from "../../domain/canvas/application/use-cases/fetch-servers";
import { HeartbeatServerUseCase } from "../../domain/canvas/application/use-cases/heartbeat-server";
import { MoveApplicationUseCase } from "../../domain/canvas/application/use-cases/move-application";
import { DatabaseModule } from "../database/database.module";
import { HttpWorkerProvisioner } from "../discovery/http-worker-provisioner";
import { TailscaleWorkerDiscovery } from "../discovery/tailscale-worker-discovery";
import { EventsModule } from "../events/events.module";
import { ApproveWorkerController } from "./controllers/approve-worker.controller";
import { CanvasController } from "./controllers/canvas.controller";
import { CreateApplicationController } from "./controllers/create-application.controller";
import { DiscoverWorkersController } from "./controllers/discover-workers.controller";
import { FetchApplicationsController } from "./controllers/fetch-applications.controller";
import { FetchServersController } from "./controllers/fetch-servers.controller";
import { HeartbeatServerController } from "./controllers/heartbeat-server.controller";

@Module({
	imports: [DatabaseModule, EventsModule],
	controllers: [
		CreateApplicationController,
		FetchApplicationsController,
		FetchServersController,
		DiscoverWorkersController,
		ApproveWorkerController,
		HeartbeatServerController,
		CanvasController,
	],
	providers: [
		CreateApplicationUseCase,
		FetchApplicationsUseCase,
		MoveApplicationUseCase,
		FetchServersUseCase,
		DiscoverWorkersUseCase,
		ApproveWorkerUseCase,
		HeartbeatServerUseCase,
		{ provide: WorkerDiscovery, useClass: TailscaleWorkerDiscovery },
		{ provide: WorkerProvisioner, useClass: HttpWorkerProvisioner },
	],
})
export class HttpModule {}
