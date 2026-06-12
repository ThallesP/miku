import type { tags } from "typia";

export type RegisterServerBody = {
	name: string & tags.MinLength<1>;
	address: string & tags.MinLength<1>;
	network: string & tags.MinLength<1>;
};
