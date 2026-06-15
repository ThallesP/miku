import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { env } from "./env/env";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		// better-auth needs the raw request body on its routes; the auth module
		// re-adds JSON/urlencoded parsers for everything else
		bodyParser: false,
	});

	// the dashboard is served from another origin (the web app);
	// credentials are required for better-auth's session cookies
	app.enableCors({
		origin: env.WEB_URL,
		credentials: true,
	});

	await app.listen(env.PORT);
}

void bootstrap();
