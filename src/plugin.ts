import { Plugin, PluginContext, PluginSetupContext, Source } from "@u27n/core";

import { PluginConfig } from "./config.js";
import { TypeScriptSource } from "./source.js";

export class TypeScriptPlugin implements Plugin {
	#config: PluginConfig = undefined!;

	public async setup(_context: PluginSetupContext, config: Partial<PluginConfig>): Promise<void> {
		this.#config = {
			parseComments: true,
			functionNames: ["t"],
			...config,
		};
	}

	public createSource(filename: string, content: string, _context: PluginContext): Source | undefined {
		if (/\.tsx?$/.test(filename)) {
			return new TypeScriptSource(filename, content, this.#config);
		}
	}
}
