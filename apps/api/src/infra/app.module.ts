import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { HttpModule } from "./http/http.module";

// env is validated by t3-env at import time (see ./env/env.ts); modules import
// the validated, typed `env` object directly — no ConfigModule / EnvService
@Module({
	imports: [AuthModule, EventsModule, HttpModule],
})
export class AppModule {}
