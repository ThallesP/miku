import { SetMetadata } from "@nestjs/common";

// marks a route or controller as public: the global AuthenticationGuard skips
// all auth checks. routes are otherwise denied unless they declare how they
// authenticate with `@AuthMethods`, so this is the explicit opt-out.
export const PUBLIC_KEY = "is-public";

export const Public = () => SetMetadata(PUBLIC_KEY, true);
