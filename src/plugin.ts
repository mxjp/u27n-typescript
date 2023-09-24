import { dirname, relative, resolve } from "node:path";

import { Plugin, Source } from "@u27n/core";
import ts from "typescript";

import { PluginConfig, PluginConfigJson } from "./config.js";
import { TypeScriptSource } from "./source.js";
import { getTsCompilerOptionsJson } from "./ts-compiler-options.js";

const EXTENSION = /\.tsx?$/;

export class TypeScriptPlugin implements Plugin {
	#config: PluginConfig = undefined!;

	async setup(context: Plugin.Context, config: PluginConfigJson): Promise<void> {
		let getOutputFilenames: PluginConfig.GetOutputFilenamesFn | null = null;

		const tsconfigFilename = config.tsconfig
			? resolve(context.config.context, config.tsconfig)
			: ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");

		if (tsconfigFilename) {
			const compilerOptions = getTsCompilerOptionsJson(tsconfigFilename);
			const { rootDir, outDir } = compilerOptions;
			if (rootDir && outDir) {
				const context = dirname(tsconfigFilename);
				getOutputFilenames = filename => {
					const rel = relative(resolve(context, rootDir), filename);
					if (/^\.\.([\\/]|$)/.test(rel)) {
						return [];
					}
					return [resolve(context, outDir, rel.replace(EXTENSION, ".js"))];
				};
			}
		}

		this.#config = {
			parseComments: config.parseComments ?? true,
			functionNames: config.functionNames ?? ["t"],
			getOutputFilenames,
		};
	}

	async createSource(context: Plugin.CreateSourceContext): Promise<Source | undefined> {
		if (EXTENSION.test(context.filename)) {
			return new TypeScriptSource(context.filename, await context.getTextContent(), this.#config);
		}
	}
}
