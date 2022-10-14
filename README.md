# U27N Typescript Plugin
This is a U27N plugin for translating typescript or plain javascript sources.

When writing text fragments, this plugin will automatically add and update fragment ids:

```ts
t("Hello World!");
// will be changed to:
t("Hello World!", "<some id>");
```

## Setup
```bash
npm install --save-dev @u27n/typescript
```

Add the following to your `u27n.json` file:
```js
{
    "include": [
        // Include typescript and javascript sources:
        "./src/*.{ts,tsx,js,jsx}"
    ],

    "plugins": [
        // Use all defaults:
        "@u27n/typescript",

        // Or customize the following default config:
        {
            "entry": "@u27n/typescript",
            "config": {
                // Path of the tsconfig file that is used
                // for mapping output filenames:
                "tsconfig": "./tsconfig.json",

                // If true, the parser tries to parse comment content as typescript
                // and marks fragments found in comments as disabled.
                "parseComments": false,

                // An array of function names to use.
                "functionNames": ["t"]
            }
        }
    ]
}
```
