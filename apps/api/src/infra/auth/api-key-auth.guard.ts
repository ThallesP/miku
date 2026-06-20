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

interface ApiKeyRequest extends Request {
	apiKeyId?: string;
}

// authenticates a caller by an api key sent as `x-api-key` (workers, and any
// future machine client). routes select it with `@AuthMethods("apiKey")` and the
// global AuthenticationGuard delegates here. returns false (rather than throwing)
// when the key is missing or invalid, so the guard can try another accepted
// method before 401-ing.
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<ApiKeyRequest>();
		const key = request.header(API_KEY_HEADER);

		if (!key) {
			return false;
		}

		const result = await auth.api.verifyApiKey({ body: { key } });

		if (!result.valid || !result.key) {
			return false;
		}

		request.apiKeyId = result.key.id;
		return true;
	}
}

// resolves the verified api key id stashed by ApiKeyAuthGuard
export const ApiKeyId = createParamDecorator(
	(_data: unknown, context: ExecutionContext): string => {
		const request = context.switchToHttp().getRequest<ApiKeyRequest>();

		if (!request.apiKeyId) {
			throw new UnauthorizedException();
		}

		return request.apiKeyId;
	},
);
