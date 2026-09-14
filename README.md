# UU

UU aims to provide the following reusable constructs for modern development:

- script development using typescript and Deno
- web development using typescript and Vite, without any transpilation step

## Usage

### With npm

`npm install tpuu`

JavaScript UI dependencies are managed through npm and loaded lazily when their
features are first used.

Font Awesome and UU's shared dialog styles are initialized automatically when
`fa()` and `showDialog()` are first used. Applications can still load a custom
Font Awesome stylesheet URL ahead of time:

```typescript
import { enableFontAwesome } from 'tpuu'

enableFontAwesome('https://example.com/font-awesome/css/all.min.css')
```

Importing `uu.ts` itself has no browser side effects. `enableFontAwesome()`
remains available for explicit early initialization.

### Runtime state

In browser environments, UU exposes a non-enumerable runtime diagnostics
registry at `window.timepp_uu_state`. It tracks module-level mutable values,
lazy dependency status, UU-managed styles and special DOM nodes, and every
localStorage key accessed through UU:

```typescript
console.log(window.timepp_uu_state)
console.log(window.timepp_uu_state.snapshot())
```

Module values are live read-only getters. DOM resources use weak references and
transient entries are removed with their nodes. `snapshot()` returns a
JSON-serializable point-in-time view, including current values for tracked
localStorage keys.

### Without a package installation

Run `npm run build:bundle` to produce `dist/uu.bundle.js`. This self-contained
ES module can be hosted on a CDN and imported directly by browser applications.

### As a Git submodule

When importing directly from the submodule's `src` directory, run `npm install`
inside the UU submodule so its dependencies are available. For frequent local
development, the host repository can instead register the submodule as an npm
workspace, allowing one install at the workspace root.

## Reusing script components

Simply `import * as uu from 'jsr:@timepp/uu' in Deno environment.

## Development

### Using UU as a Git submodule in a Deno project

When UU is checked out as the `uu` submodule of another Deno project, add this
task to the host project's `deno.json`:

```json
{
  "tasks": {
    "install:uu": "deno install --config uu/deno.json --node-modules-dir=auto --no-lock"
  }
}
```

Run `deno task install:uu` from the host project root. This uses UU's Deno
configuration to install its npm dependencies into the host project's
auto-managed `node_modules` directory without modifying the host lock file.

### File structure

- `package.json`: used for publishing the package to npm registry
- `src/uu.ts`: pure public barrel containing export declarations only
- `src/tu.ts`: Non UI specific, can be used in both browser and Deno environments
- `src/uu-dom.ts`, `src/uu-dialog.ts`, `src/uu-progress.ts`: foundational browser UI APIs
- `src/uu-text.ts`, `src/uu-json.ts`, `src/uu-media.ts`: text, JSON, Markdown, and chart APIs
- `src/uu-controls.ts`, `src/uu-selection.ts`, `src/uu-input.ts`: controls and user input APIs
- `src/uu-pager.ts`, `src/uu-components.ts`: paging and composed UI components
- `src/uu-data-insights.ts`, `src/uu-object.ts`, `src/uu-visualize-array.ts`: data visualization APIs
- `src/uu-download.ts`, `src/uu-fontawesome.ts`: browser integration APIs
- `src/uu-runtime-state.ts`: browser runtime diagnostics registry
- `dist`: artifacts for npm
- `script/increase-ver.ts`: script to increase version number
- `script/test.ts`: script for cli test
- `ui-test`: directory for UI tests

### Publishing

First you need to invoke npm command to update the version:

```shell
npm run incver
```

#### Publish to npm

1. Run `npm run build:all` to build the standard and bundled outputs
1. commit local changes (and push to remote repository)
1. Run `npm publish` to publish the package to the npm registry

#### Publish to Deno

1. Run `deno publish --allow-slow-types` to publish the package to the Deno registry

## Todo

- [x] stringify support a callback function to receive the mapping between value and its position in the final string
- [x] hide column if all values are empty (null, undefined, etc) in visualizeArray
