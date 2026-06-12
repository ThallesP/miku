import type { INestiaConfig } from "@nestia/sdk";

const config: INestiaConfig = {
	input: {
		include: ["src/infra/http/controllers/*.controller.ts"],
		exclude: ["src/infra/http/controllers/change-events.controller.ts"],
	},
	output: "../../packages/sdk/src",
	clone: true,
};

export default config;
