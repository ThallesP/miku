import { type Infer, v } from "convex/values";

// What a service deploys — its source. A discriminated union so new source kinds
// (a GitHub repo, a Nixpacks build, …) slot in by adding a member here without
// touching the deployment path. v1 ships Docker images only; the UI surfaces the
// other kinds as "coming soon".
export const appSourceValidator = v.union(
	v.object({ type: v.literal("docker"), image: v.string() }),
);

export type AppSource = Infer<typeof appSourceValidator>;

// The concrete image a source resolves to. Today only Docker sources exist, so
// this is a straight read; it's the single place that grows when build-based
// sources (which resolve to a built image) arrive.
export function imageForSource(source: AppSource): string {
	return source.image;
}
