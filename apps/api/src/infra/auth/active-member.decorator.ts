import {
	createParamDecorator,
	type ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

import { auth } from "./auth";

export type ActiveMember = NonNullable<
	Awaited<ReturnType<typeof auth.api.getActiveMember>>
>;

// resolves the authenticated user's membership in their active organization
// (organization id, user id, and org role). the SessionAuthGuard guarantees an
// active organization on every authenticated request, so the user is always a
// member of one. resolved lazily, so only routes that need org/role context pay
// for the lookup. nestia ignores it during SDK generation.
export const ActiveMember = createParamDecorator(
	async (_data: unknown, context: ExecutionContext): Promise<ActiveMember> => {
		const request = context.switchToHttp().getRequest<Request>();

		const member = await auth.api.getActiveMember({
			headers: fromNodeHeaders(request.headers),
		});

		if (!member) {
			throw new UnauthorizedException();
		}

		return member;
	},
);
