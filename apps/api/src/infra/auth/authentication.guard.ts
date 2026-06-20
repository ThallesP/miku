import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ApiKeyAuthGuard } from "./api-key-auth.guard";
import { AUTH_METHODS_KEY, type AuthMethod } from "./auth-methods.decorator";
import { PUBLIC_KEY } from "./public.decorator";
import { SessionAuthGuard } from "./session-auth.guard";

// the single global guard. `@Public()` routes skip auth entirely. otherwise a
// route MUST declare how it authenticates with `@AuthMethods(...)`; the guard
// delegates to each accepted method and allows the request as soon as one
// passes. a route that declares nothing is denied — auth is fail-closed, opted
// into per route rather than out of with `@AllowAnonymous`.
@Injectable()
export class AuthenticationGuard implements CanActivate {
	private readonly guards: Record<AuthMethod, CanActivate>;

	constructor(
		private reflector: Reflector,
		sessionGuard: SessionAuthGuard,
		apiKeyGuard: ApiKeyAuthGuard,
	) {
		this.guards = { session: sessionGuard, apiKey: apiKeyGuard };
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const targets = [context.getHandler(), context.getClass()];

		if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) {
			return true;
		}

		const methods = this.reflector.getAllAndOverride<AuthMethod[]>(
			AUTH_METHODS_KEY,
			targets,
		);

		// fail closed: a route that declares no auth methods is denied
		if (!methods?.length) {
			throw new UnauthorizedException();
		}

		for (const method of methods) {
			if (await this.guards[method].canActivate(context)) {
				return true;
			}
		}

		throw new UnauthorizedException();
	}
}
