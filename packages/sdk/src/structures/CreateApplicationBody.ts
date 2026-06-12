import type { tags } from "typia";

export type CreateApplicationBody = {
	name: string & tags.MinLength<1>;
	x: number;
	y: number;
};
