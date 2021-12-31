import { Plugin, PluginContext, PluginSetupContext, Source } from "@u27n/core";

import { PluginConfig } from "./config.js";
import { PreactSource } from "./source.js";

export class PreactPlugin implements Plugin {
	#config: PluginConfig = undefined!;

	public async setup(_context: PluginSetupContext, config: Partial<PluginConfig>): Promise<void> {
		this.#config = {
			parseComments: true,
			componentNames: ["T", "TX"],
			functionNames: ["t", "tx"],
			...config,
		};
	}

	public createSource(filename: string, content: string, _context: PluginContext): Source | undefined {
		if (/\.tsx?$/.test(filename)) {
			return new PreactSource(filename, content, this.#config);
		}
	}
}
