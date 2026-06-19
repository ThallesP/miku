import { randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";

import {
	type WorkerCredential,
	WorkerCredentials,
} from "../../domain/canvas/application/discovery/worker-credentials";
import { auth } from "./auth.instance";

@Injectable()
export class BetterAuthWorkerCredentials implements WorkerCredentials {
	async issue(hostname: string): Promise<WorkerCredential> {
		// a synthetic better-auth user represents the worker; its session token
		// (returned by the bearer plugin as `set-auth-token`) is the bearer token
		const email = `worker-${hostname}@workers.miku.local`;
		const password = randomBytes(24).toString("hex");

		const response = await auth.api.signUpEmail({
			body: { email, password, name: hostname },
			asResponse: true,
		});

		const token = response.headers.get("set-auth-token");
		const body = (await response.json()) as { user?: { id?: string } };
		const userId = body.user?.id;

		if (!token || !userId) {
			throw new Error(`failed to issue credentials for worker ${hostname}`);
		}

		return { userId, token };
	}
}
