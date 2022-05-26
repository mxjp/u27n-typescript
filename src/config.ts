
export interface PluginConfig {
	parseComments: boolean;
	functionNames: string[];
	getOutputFilenames: PluginConfig.GetOutputFilenamesFn | null;
}

export declare namespace PluginConfig {
	export type GetOutputFilenamesFn = (filename: string) => string[];
}

export interface PluginConfigJson {
	tsconfig?: string;
	parseComments?: boolean;
	functionNames?: string[];
}
