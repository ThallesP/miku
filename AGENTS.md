# Runway 

Runway is an alternative to Coolify and Dokploy that, unlike Vercel, takes inspiration from Railway. At its core is a canvas where you can add Applications, Databases, Templates, and more—although in theory, everything is treated as an "application."

## Conventions

- Scope repository reads by org: org-owned data filters by `organizationId` — don't `findMany()` over everything. Go global only where it clearly makes sense (e.g. worker discovery).
- Entity backing fields (e.g. `_position` behind an event-recording setter) must not leak the `_` into column names: use `@Embedded({ prefix: false })`, or pin `@Property({ fieldName })` for scalars.

