# UU

UU aims to provide the following reusable constructs for modern development:
- script development using typescript and Deno
- web development using typescript and Vite, without any transpilation step

## Usage

### With package manager

### Without package manager

Since browser do not natively support importing remote modules, the reusing is done by the following steps:
1. Run `deno run -A --reload jsr:@timepp/uu/install` to copy necessary files directly to your local repo. This can be considered as a simplified step to `npm install` but without the heavy node_modules folder and transpilation configurations.
2. Import the files in your code using `import { ... } from './path/to/your/local/uu/...`
3. (optional) Run `deno run -A --reload jsr:@timepp/uu/install` at any time to upgrade the files to the latest version.

## Reusing script components

Simply `import * as uu from 'jsr:@timepp/uu' in Deno environment.

## Development

### File structure

- `package.json`: used for publishing the package to npm registry
- `src/uu.ts`: UI specific library, which is used in the browser.
- `src/tu.ts`: Non UI specific, can be used in both browser and Deno environments

### Build for the `install` command

1. config files targeted for `install` in `assets.ts`
2. run `build.ts` to hash the files and add them to bootstrap-assets