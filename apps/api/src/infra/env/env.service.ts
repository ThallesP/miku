import { Injectable } from "@nestjs/common";

import { env, type Env } from "./env";

@Injectable()
export class EnvService {
	get<T extends keyof Env>(key: T): Env[T] {
		return env[key];
	}
}
