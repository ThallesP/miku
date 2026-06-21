import type { INestiaConfig } from "@nestia/sdk";

const config: INestiaConfig = {
	input: {
		include: ["src/infra/http/controllers/*.controller.ts"],
		exclude: [
			// uses @Session() (not a nestia param) and is only called by workers,
			// which hit it with a plain authenticated fetch
			"src/infra/http/controllers/heartbeat-server.controller.ts",
		],
	},
	output: "../../packages/sdk/src",
	clone: true,
};

export default config;
