// The shared contract. Web and servers import the generated, fully-typed `api`
// plus the `Doc`/`Id` row types from here — this single barrel replaces the old
// generated nestia SDK *and* the MikroORM entity package. `convex codegen` (run
// before any typecheck) emits ./convex/_generated.
export { api } from "./convex/_generated/api.js";
export type { Doc, Id } from "./convex/_generated/dataModel";
