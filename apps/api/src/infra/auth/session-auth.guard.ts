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

// authenticates a human by their better-auth session cookie, attaches the
// session to the request (so `@Session()` / `@ActiveMember()` work downstream),
// and guarantees the user has an active organization. the package's own global
// guard is disabled (see auth.module.ts); this is one of the methods the
// AuthenticationGuard delegates to.
@Injectable()
export class SessionAuthGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<SessionRequest>();
		const headers = fromNodeHeaders(request.headers);

		const session = await auth.api.getSession({ headers });

		if (!session) {
			return false;
		}

		session.session.activeOrganizationId = await this.resolveActiveOrganization(
			headers,
			session,
		);
		request.session = session;
		request.user = session.user;
		return true;
	}

	// every authenticated request runs in the context of an organization. if the
	// user has no active org yet, adopt their first one or lazily create a
	// personal org (onboarding can rename it later), then mark it active — so
	// controllers can assume `activeOrganizationId` is always set.
	private async resolveActiveOrganization(
		headers: Headers,
		session: NonNullable<Session>,
	): Promise<string> {
		if (session.session.activeOrganizationId) {
			return session.session.activeOrganizationId;
		}

		const existing = await auth.api.listOrganizations({ headers });

		const organizationId =
			existing[0]?.id ??
			(
				await auth.api.createOrganization({
					body: {
						name: session.user.name?.trim() || "Personal",
						slug: `org-${session.user.id}`,
						userId: session.user.id,
						keepCurrentActiveOrganization: false,
					},
				})
			)?.id;

		if (!organizationId) {
			throw new Error("failed to provision the user's organization");
		}

		await auth.api.setActiveOrganization({
			headers,
			body: { organizationId },
		});

		return organizationId;
	}
}
