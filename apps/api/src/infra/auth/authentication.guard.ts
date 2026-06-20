import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AUTH_METHODS_KEY, type AuthMethod } from "./auth-methods.decorator";
import { SessionAuthGuard } from "./session-auth.guard";
import { WorkerAuthGuard } from "./worker-auth.guard";

// the single global guard. it reads `@AuthMethods(...)` (defaulting to session)
// and delegates to the guard for each accepted method, allowing the request as
// soon as one of them authenticates it. this replaces the package's global
// session guard so routes opt into worker (api key) auth declaratively, instead
// of opting out of auth entirely with `@AllowAnonymous`.
@Injectable()
export class AuthenticationGuard implements CanActivate {
	private readonly guards: Record<AuthMethod, CanActivate>;

	constructor(
		private reflector: Reflector,
		sessionGuard: SessionAuthGuard,
		workerGuard: WorkerAuthGuard,
	) {
		this.guards = { session: sessionGuard, apiKey: workerGuard };
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const methods = this.reflector.getAllAndOverride<AuthMethod[]>(
			AUTH_METHODS_KEY,
			[context.getHandler(), context.getClass()],
		) ?? ["session"];

		// try methods in order; the first that authenticates wins. genuine errors
		// (a guard throwing) propagate — only an unauthenticated request 401s.
		for (const method of methods) {
			if (await this.guards[method].canActivate(context)) {
				return true;
			}
		}

		throw new UnauthorizedException();
	}
}
