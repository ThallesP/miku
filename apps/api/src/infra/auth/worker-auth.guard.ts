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

// authenticates a worker by its org-scoped api key (`x-api-key`). routes select
// it with `@AuthMethods("apiKey")`; the global AuthenticationGuard delegates
// here. returns false (rather than throwing) when the key is missing or invalid
// so the guard can fall through to another accepted method before 401-ing.
@Injectable()
export class WorkerAuthGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<WorkerRequest>();
		const key = request.header(API_KEY_HEADER);

		if (!key) {
			return false;
		}

		const result = await auth.api.verifyApiKey({ body: { key } });

		if (!result.valid || !result.key) {
			return false;
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
