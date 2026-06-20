import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins/organization";
import { Pool } from "pg";

import { env } from "../env/env";

const DAY_SECONDS = 60 * 60 * 24;

// single better-auth instance shared by the Nest auth module and anything that
// calls auth.api directly (e.g. minting worker credentials)
export const auth = betterAuth({
	basePath: "/api/auth",
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.WEB_URL],
	// same Postgres database as MikroORM; better-auth manages its own tables.
	// passing a pg Pool lets better-auth detect the postgres dialect
	database: new Pool({ connectionString: env.DATABASE_URL }),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		// humans belong to organizations; a worker's api key is scoped to one
		organization(),
		// workers authenticate with an organization-scoped api key sent as
		// `x-api-key`. org-referenced keys deliberately don't mock a session, so
		// the worker heartbeat uses a dedicated guard (ApiKeyAuthGuard) that calls
		// auth.api.verifyApiKey — humans keep using session cookies. both are
		// dispatched by the global AuthenticationGuard via @AuthMethods. rate
		// limiting is off because workers heartbeat ~every 5s.
		apiKey({
			references: "organization",
			enableMetadata: true,
			rateLimit: { enabled: false },
			defaultPrefix: "miku_",
		}),
	],
	// human sessions; refreshed on use
	session: {
		expiresIn: DAY_SECONDS * 30,
		updateAge: DAY_SECONDS,
	},
	databaseHooks: {
		session: {
			create: {
				// every human acts within an organization. on session creation
				// (sign-up or login) set the user's org as active — creating a
				// personal org the first time, via better-auth's own adapter +
				// createOrganization — so controllers can always assume one exists.
				before: async (session) => {
					// `auth` is self-referential here, so its adapter is untyped — cast
					const ctx = await auth.$context;

					const member = (await ctx.adapter.findOne({
						model: "member",
						where: [{ field: "userId", value: session.userId }],
					})) as { organizationId: string } | null;

					if (member) {
						return {
							data: { ...session, activeOrganizationId: member.organizationId },
						};
					}

					const org = await auth.api.createOrganization({
						body: {
							name: "Personal",
							slug: `org-${session.userId}`,
							userId: session.userId,
							keepCurrentActiveOrganization: true,
						},
					});

					if (!org) {
						throw new Error("failed to create the user's organization");
					}

					return { data: { ...session, activeOrganizationId: org.id } };
				},
			},
		},
	},
});

export type Auth = typeof auth;
