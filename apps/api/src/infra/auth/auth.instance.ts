import { env } from "../env/env";
import { createAuth } from "./auth";

// single better-auth instance shared by the Nest auth module and anything that
// needs to call auth.api directly (e.g. minting worker credentials)
export const auth = createAuth({
	databaseUrl: env.DATABASE_URL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.WEB_URL],
});
