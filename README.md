# UU

UU aims to provide the following reusable constructs for modern development:
- script development using typescript and Deno
- web development using typescript and Vite, without any transpilation step

## Usage

### With npm

`npm install tpuu`

## Reusing script components

Simply `import * as uu from 'jsr:@timepp/uu' in Deno environment.

## Development

### File structure

- `package.json`: used for publishing the package to npm registry
- `src/uu.ts`: UI specific library, which is used in the browser.
- `src/tu.ts`: Non UI specific, can be used in both browser and Deno environments
- `dist`: artifacts for npm
- `script/increase-ver.ts`: script to increase version number
- `script/test.ts`: script for cli test
- `ui-test`: directory for UI tests

### Publishing

First you need to invoke npm command to update the version:

```
npm run incver
```

#### Publish to npm

1. Run `npm run build` to build the package
1. commit local changes (and push to remote repository)
1. Run `npm publish` to publish the package to the npm registry

#### Publish to Deno

1. Run `deno publish --allow-slow-types` to publish the package to the Deno registry

## Todo

[x] stringify support a callback function to receive the mapping between value and its position in the final string
[x] hide column if all values are empty (null, undefined, etc) in visualizeArray