import type { tags } from "typia";

export type ApproveWorkerBody = {
  hostname: string & tags.MinLength<1>;
  address: string & tags.MinLength<1>;
};
