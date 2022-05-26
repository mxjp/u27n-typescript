import ts from "typescript";

export interface TsCompilerOptionsJson {
	rootDir?: string;
	outDir?: string;
}

interface TsconfigJson {
	extends?: string;
	compilerOptions?: TsCompilerOptionsJson;
}

export function getTsCompilerOptionsJson(filename: string): TsCompilerOptionsJson {
	const config = ts.readConfigFile(filename, ts.sys.readFile).config as TsconfigJson;
	if (config.extends) {
		return {
			...getTsCompilerOptionsJson(require.resolve(config.extends)),
			...config.compilerOptions,
		};
	}
	return config.compilerOptions ?? {};
}
