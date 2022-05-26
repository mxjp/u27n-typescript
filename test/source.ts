import { DataProcessor, Source, TranslationData } from "@u27n/core";
import test from "ava";

import { PluginConfig } from "../src/config.js";
import { TypeScriptSource } from "../src/source.js";
import { unindent } from "./_utility/unindent.js";

const updateSample = unindent(`
	t("foo");
	t("foo", "42");
	t("foo", "42");

	t("foo", {});
	t("foo", {}, "52");
	t("foo", {}, "52");
`);

const updateSampleResult = unindent(`
	t("foo", "0");
	t("foo", "42");
	t("foo", "1");

	t("foo", {}, "2");
	t("foo", {}, "52");
	t("foo", {}, "3");
`);

const config: PluginConfig = {
	getOutputFilenames: null,
	parseComments: true,
	functionNames: ["t"],
};

function sampleTranslationData(prefab: TranslationData, enabled: boolean): TranslationData {
	const value = "foo";
	return {
		fragments: Object.fromEntries([0, 1, 2, 3, 42, 52].map(id => ([id, { ...prefab.fragments[id], enabled, value }]))),
		obsolete: prefab.obsolete,
		version: prefab.version,
	};
}

function multiLineComment(source: string) {
	return `/* ${source} */`;
}

function singleLineComments(source: string) {
	return source.split("\n")
		.map(line => `// ${line}`)
		.join("\n");
}

for (const wrap of [null, multiLineComment, singleLineComments]) {
	test(`parse & update: ${wrap ? wrap.name : "plain"}`, t => {
		const processor = new DataProcessor();
		const result = processor.applyUpdate({
			updatedSources: new Map<string, Source>([
				["src/test.tsx", new TypeScriptSource("test.tsx", wrap ? wrap(updateSample) : updateSample, config)],
			]),
		});
		t.is(result.modifiedSources.get("src/test.tsx"), wrap ? wrap(updateSampleResult) : updateSampleResult);

		t.true(processor.translationDataModified);
		t.deepEqual(processor.translationData, sampleTranslationData(processor.translationData, wrap === null));
	});
}

for (const wrap of [multiLineComment, singleLineComments]) {
	test(`parse & update (disabled comments): ${wrap.name}`, t => {
		const processor = new DataProcessor();
		const result = processor.applyUpdate({
			updatedSources: new Map<string, Source>([
				["src/test.tsx", new TypeScriptSource("test.tsx", wrap(updateSample), {
					...config,
					parseComments: false,
				})],
			]),
		});
		t.false(processor.translationDataModified);
		t.is(result.modifiedSources.size, 0);
	});
}

test(`values parsing`, t => {
	const source = new TypeScriptSource("test.tsx", unindent(`
		t("foo", "0");
		t(["foo", "bar"], "1");
	`), config);

	const parsed = source.fragments.map(fragment => {
		return {
			id: fragment.fragmentId,
			value: fragment.value,
		};
	});

	t.deepEqual(parsed, [
		{ id: "0", value: "foo" },
		{ id: "1", value: { type: "plural", value: ["foo", "bar"] } },
	]);
});
