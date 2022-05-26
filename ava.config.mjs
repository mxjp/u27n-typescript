"use strict";

export default {
	files: [
		"./test_out/test/**/*.js",
		"!**/_*/*",
	],
	ignoredByWatcher: [
		"./src/**/*",
		"./test/**/*",
		"./test_data/**/*",
	],
};
