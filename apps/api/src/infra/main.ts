import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { EnvService } from "./env/env.service";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		// better-auth needs the raw request body on its routes; the auth module
		// re-adds JSON/urlencoded parsers for everything else
		bodyParser: false,
	});

	const envService = app.get(EnvService);

	// the dashboard is served from another origin (the web app);
	// credentials are required for better-auth's session cookies
	app.enableCors({
		origin: envService.get("WEB_URL"),
		credentials: true,
	});
	const port = envService.get("PORT");

	await app.listen(port);
}

void bootstrap();
