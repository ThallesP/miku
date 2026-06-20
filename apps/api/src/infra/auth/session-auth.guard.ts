import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
} from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

import { auth } from "./auth";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

interface SessionRequest extends Request {
	session?: Session;
	user?: NonNullable<Session>["user"];
}

// authenticates a human by their better-auth session cookie and attaches the
// session to the request so the `@Session()` decorator can read it downstream.
// the package's own global session guard is disabled (see auth.module.ts); this
// is one of the methods the AuthenticationGuard delegates to.
@Injectable()
export class SessionAuthGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<SessionRequest>();

		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session) {
			return false;
		}

		request.session = session;
		request.user = session.user;
		return true;
	}
}
