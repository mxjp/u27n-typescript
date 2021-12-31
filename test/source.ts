import { DataProcessor, Source, TranslationData } from "@u27n/core";
import test from "ava";

import { PluginConfig } from "../src/plugin/config.js";
import { PreactSource } from "../src/plugin/source.js";
import { unindent } from "./_utility/unindent.js";

const updateSample = unindent(`
	<T value="foo" />
	<T value="foo" id="7" />
	<T value="foo" id="7" />

	t("foo");
	t("foo", "42");
	t("foo", "42");

	t("foo", {});
	t("foo", {}, "52");
	t("foo", {}, "52");
`);

const updateSampleResult = unindent(`
	<T value="foo" id="0" />
	<T value="foo" id="7" />
	<T value="foo" id="1" />

	t("foo", "2");
	t("foo", "42");
	t("foo", "3");

	t("foo", {}, "4");
	t("foo", {}, "52");
	t("foo", {}, "5");
`);

function sampleTranslationData(prefab: TranslationData, enabled: boolean): TranslationData {
	const value = "foo";
	return {
		fragments: Object.fromEntries([0, 1, 2, 3, 4, 5, 7, 42, 52].map(id => ([id, { ...prefab.fragments[id], enabled, value }]))),
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
		const config: PluginConfig = {
			parseComments: true,
			componentNames: ["T"],
			functionNames: ["t"],
		};

		const processor = new DataProcessor();
		const result = processor.applyUpdate({
			updatedSources: new Map<string, Source>([
				["src/test.tsx", new PreactSource("test.tsx", wrap ? wrap(updateSample) : updateSample, config)],
			]),
		});
		t.is(result.modifiedSources.get("src/test.tsx"), wrap ? wrap(updateSampleResult) : updateSampleResult);

		t.true(processor.translationDataModified);
		t.deepEqual(processor.translationData, sampleTranslationData(processor.translationData, wrap === null));
	});
}

for (const wrap of [multiLineComment, singleLineComments]) {
	test(`parse & update (disabled comments): ${wrap.name}`, t => {
		const config: PluginConfig = {
			parseComments: true,
			componentNames: ["T"],
			functionNames: ["t"],
		};
		const processor = new DataProcessor();
		const result = processor.applyUpdate({
			updatedSources: new Map<string, Source>([
				["src/test.tsx", new PreactSource("test.tsx", wrap(updateSample), {
					...config,
					parseComments: false,
				})],
			]),
		});
		t.false(processor.translationDataModified);
		t.is(result.modifiedSources.size, 0);
	});
}
