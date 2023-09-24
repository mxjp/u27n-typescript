const { resolve } = require("node:path");

module.exports = {
	root: true,
	extends: "./node_modules/@mpt/eslint-rules/typescript.json",
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: resolve(__dirname, './tsconfig.json'),
	}
}
