import type { tags } from "typia";

export type ApproveWorkerBody = {
  hostname: string & tags.Pattern<"\\S">;
  address: string & tags.MinLength<1>;
};
