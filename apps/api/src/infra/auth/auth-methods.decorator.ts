import { SetMetadata } from "@nestjs/common";

// the authentication methods a route accepts. the global AuthenticationGuard
// reads this and delegates to the matching guard(s); the request is allowed if
// any accepted method authenticates it. routes without the decorator default to
// session auth, so "everything requires auth" still holds without annotating
// every human route.
export type AuthMethod = "session" | "apiKey";

export const AUTH_METHODS_KEY = "auth-methods";

export const AuthMethods = (...methods: AuthMethod[]) =>
	SetMetadata(AUTH_METHODS_KEY, methods);
