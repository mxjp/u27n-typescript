import { Source, SourceUpdates, TranslationData } from "@u27n/core";
import jsStringEscape from "js-string-escape";
import ts from "typescript";

import { PluginConfig } from "./config.js";

interface JsxFragment extends Source.Fragment {
	type: "jsx";
	node: ts.JsxSelfClosingElement;
	commentOffset?: number;
}

interface JsFragment extends Source.Fragment {
	type: "js";
	node: ts.CallExpression;
	commentOffset?: number;
}

type Fragment = JsxFragment | JsFragment;

export class PreactSource extends Source<Fragment> {
	#filename: string;
	#config: PluginConfig;

	public constructor(filename: string, content: string, config: PluginConfig) {
		super(content);
		this.#filename = filename;
		this.#config = config;
	}

	protected parse(): Fragment[] {
		const filename = this.#filename;
		const config = this.#config;

		const componentNames = new Set(config.componentNames);
		const functionNames = new Set(config.functionNames);

		const fragments: Fragment[] = [];
		const sourceFile = ts.createSourceFile(filename, this.content, ts.ScriptTarget.Latest, true);

		(function parse(rootNode: ts.Node, commentOffset?: number) {
			const rootText = rootNode.getFullText();
			const parsedComments = new Set<number>();
			(function traverse(node: ts.Node) {
				if (commentOffset === undefined && config.parseComments) {
					const commentRanges = ts.getLeadingCommentRanges(rootText, node.pos);
					if (commentRanges) {
						commentRanges.forEach(range => {
							if (!parsedComments.has(range.pos)) {
								parsedComments.add(range.pos);
								const [commentText, offset] = getCommentContent(rootText, range);
								const commentSource = ts.createSourceFile(filename, commentText, ts.ScriptTarget.Latest, true);
								parse(commentSource, offset);
							}
						});
					}
				}

				if (ts.isJsxSelfClosingElement(node) && isName(node.tagName, componentNames)) {
					const id = parseStaticValue(getJsxAttribute(node.attributes, "id")?.initializer);
					const value = parseStaticValue(getJsxAttribute(node.attributes, "value")?.initializer);
					fragments.push({
						type: "jsx",
						node,
						commentOffset,

						fragmentId: isValidFragmentId(id) ? id : undefined,
						value: toFragmentValue(value),
						enabled: commentOffset === undefined,
						...getNodeRange(node, commentOffset),
					});
				} else if (ts.isCallExpression(node) && isName(node.expression, functionNames) && node.arguments.length >= 1 && node.arguments.length <= 3) {
					const value = parseStaticValue(node.arguments[0]);
					const id = node.arguments.length > 1 ? parseStaticValue(node.arguments[node.arguments.length - 1]) : undefined;

					fragments.push({
						type: "js",
						node,
						commentOffset,

						fragmentId: isValidFragmentId(id) ? id : undefined,
						value: toFragmentValue(value),
						enabled: commentOffset === undefined,
						...getNodeRange(node, commentOffset),
					});
				}
				ts.forEachChild(node, traverse);
			})(rootNode);
		})(sourceFile);

		fragments.sort((a, b) => {
			return a.start - b.start;
		});

		return fragments;
	}

	public update(_context: Source.UpdateContext): Source.UpdateResult {
		let modified = false;
		const sourceUpdates = new SourceUpdates(this.content);
		const fragments = new Map<string, Source.FragmentUpdate>();

		for (const fragment of this.fragments) {
			const id = _context.updateId(fragment);
			if (id !== fragment.fragmentId) {
				modified = true;
				const offset = fragment.commentOffset ?? 0;

				if (fragment.type === "jsx") {
					const idAttribute = getJsxAttribute(fragment.node.attributes, "id");
					if (idAttribute) {
						sourceUpdates.append({
							start: idAttribute.getStart() + offset,
							end: idAttribute.getEnd() + offset,
							text: `id="${jsStringEscape(id)}"`,
						});
					} else {
						const pos = (fragment.node.getEnd() - 2) + offset;
						sourceUpdates.append({
							start: pos,
							end: pos,
							text: `${/\s/.test(this.content.slice(pos - 1, pos)) ? "" : " "}id="${jsStringEscape(id)}" `,
						});
					}
				} else {
					const args = fragment.node.arguments;
					const idArgument = args.length > 1 ? args[args.length - 1] : null;
					if (idArgument && isValidFragmentId(parseStaticValue(idArgument))) {
						sourceUpdates.append({
							start: idArgument.getStart() + offset,
							end: idArgument.getEnd() + offset,
							text: `"${jsStringEscape(id)}"`,
						});
					} else {
						const pos = (fragment.node.getEnd() - 1) + offset;
						sourceUpdates.append({
							start: pos,
							end: pos,
							text: `, "${jsStringEscape(id)}"`,
						});
					}
				}
			}

			fragments.set(id, {
				oldFragmentId: fragment.fragmentId,
				enabled: fragment.enabled,
				value: fragment.value,
			});
		}

		return {
			content: sourceUpdates.format(),
			fragments,
			modified,
		};
	}
}

function getJsxAttribute(attributes: ts.JsxAttributes, name: string): ts.JsxAttribute | undefined {
	return attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === name) as ts.JsxAttribute;
}

type StaticValue = undefined | string | StaticValue[];

function isValidFragmentId(value: unknown): value is string {
	return typeof value === "string";
}

function toFragmentValue(value: unknown): TranslationData.Value {
	if (typeof value === "string") {
		return value;
	}
	if (Array.isArray(value) && value.every(v => typeof v === "string")) {
		return {
			type: "plural",
			value,
		};
	}
	return null;
}

function parseStaticValue(value?: ts.Expression): StaticValue {
	if (value === undefined) {
		return undefined;
	}
	if (ts.isStringLiteral(value)) {
		return value.text;
	}
	if (ts.isArrayLiteralExpression(value)) {
		return value.elements.map(parseStaticValue);
	}
	if (ts.isJsxExpression(value)) {
		return parseStaticValue(value.expression);
	}
}

function isName(expression: ts.Node, names: Set<string>) {
	if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)) {
		return names.has(expression.name.text);
	}
	if (ts.isIdentifier(expression)) {
		return names.has(expression.text);
	}
	return false;
}

interface NodeRange {
	start: number;
	end: number;
}

function getNodeRange(node: ts.Node, offset = 0): NodeRange {
	return {
		start: node.getStart(undefined, false) + offset,
		end: node.getEnd() + offset,
	};
}

function getCommentContent(text: string, range: ts.CommentRange): [content: string, offset: number] {
	switch (range.kind) {
		case ts.SyntaxKind.SingleLineCommentTrivia: return [text.slice(range.pos + 2, range.end), range.pos + 2];
		case ts.SyntaxKind.MultiLineCommentTrivia: return [text.slice(range.pos + 2, range.end - 2), range.pos + 2];
		default: throw new Error("unknown comment type");
	}
}
