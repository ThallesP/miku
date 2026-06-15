import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { EnvModule } from "./env/env.module";
import { EventsModule } from "./events/events.module";
import { HttpModule } from "./http/http.module";

// env is validated by t3-env at import time (see ./env/env.ts), so there's no
// ConfigModule here — EnvService reads the validated, typed `env` object
@Module({
	imports: [EnvModule, AuthModule, EventsModule, HttpModule],
})
export class AppModule {}
