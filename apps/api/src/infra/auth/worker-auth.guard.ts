import {
	type CanActivate,
	createParamDecorator,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { auth } from "./auth";

const API_KEY_HEADER = "x-api-key";

interface WorkerRequest extends Request {
	workerApiKeyId?: string;
}

// authenticates a worker by its org-scoped api key (`x-api-key`). org-referenced
// keys don't resolve into a session, so the global session AuthGuard can't see
// them — workers opt out of it with @AllowAnonymous and use this guard instead.
@Injectable()
export class WorkerAuthGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<WorkerRequest>();
		const key = request.header(API_KEY_HEADER);

		if (!key) {
			throw new UnauthorizedException();
		}

		const result = await auth.api.verifyApiKey({ body: { key } });

		if (!result.valid || !result.key) {
			throw new UnauthorizedException();
		}

		request.workerApiKeyId = result.key.id;
		return true;
	}
}

// resolves the verified api key id stashed by WorkerAuthGuard
export const WorkerApiKeyId = createParamDecorator(
	(_data: unknown, context: ExecutionContext): string => {
		const request = context.switchToHttp().getRequest<WorkerRequest>();

		if (!request.workerApiKeyId) {
			throw new UnauthorizedException();
		}

		return request.workerApiKeyId;
	},
);
