import { randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";

import {
	type WorkerCredential,
	WorkerCredentials,
} from "../../domain/canvas/application/discovery/worker-credentials";
import { auth } from "./auth";

const MAX_KEY_NAME_LENGTH = 32;

interface Fleet {
	/** the control-plane service account that owns the fleet org + worker keys */
	userId: string;
	/** the organization every worker api key is scoped to */
	organizationId: string;
}

@Injectable()
export class BetterAuthWorkerCredentials implements WorkerCredentials {
	// memoised promise — single-flight bootstrap of the fleet within the process
	private fleet?: Promise<Fleet>;

	async issue(hostname: string): Promise<WorkerCredential> {
		const { userId, organizationId } = await this.ensureFleet();

		// org-referenced key (see auth.ts). minted server-side under the service
		// account, which owns the org and therefore passes the apiKey:create check
		const created = await auth.api.createApiKey({
			body: {
				organizationId,
				userId,
				name: hostname.slice(0, MAX_KEY_NAME_LENGTH),
				metadata: { hostname },
			},
		});

		return { apiKeyId: created.id, organizationId, token: created.key };
	}

	private ensureFleet(): Promise<Fleet> {
		this.fleet ??= this.bootstrapFleet();
		return this.fleet;
	}

	// the control plane owns its workers' api keys through a synthetic service
	// account + a single "miku-fleet" organization, both created on first use and
	// reused thereafter. keeping worker keys off any human operator means approval
	// doesn't depend on who clicked it.
	private async bootstrapFleet(): Promise<Fleet> {
		const ctx = await auth.$context;
		const email = "control-plane@workers.miku.local";

		let user = await ctx.adapter.findOne<{ id: string }>({
			model: "user",
			where: [{ field: "email", value: email }],
		});

		if (!user) {
			const result = await auth.api.signUpEmail({
				body: {
					email,
					// random, never used — the service account never signs in
					password: randomBytes(24).toString("hex"),
					name: "Control Plane",
				},
			});
			user = { id: result.user.id };
		}

		const member = await ctx.adapter.findOne<{ organizationId: string }>({
			model: "member",
			where: [{ field: "userId", value: user.id }],
		});

		if (member) {
			return { userId: user.id, organizationId: member.organizationId };
		}

		const organization = await auth.api.createOrganization({
			body: {
				name: "Fleet",
				slug: "miku-fleet",
				userId: user.id,
				keepCurrentActiveOrganization: true,
			},
		});

		if (!organization) {
			throw new Error("failed to bootstrap the fleet organization");
		}

		return { userId: user.id, organizationId: organization.id };
	}
}
