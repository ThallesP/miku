import type { tags } from "typia";

export type MoveApplicationBody = {
	name?: undefined | (string & tags.MinLength<1>);
	x?: undefined | number;
	y?: undefined | number;
};
