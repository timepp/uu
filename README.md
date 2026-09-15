# UU

UU aims to provide the following reusable constructs for modern development:

- script development using typescript and Deno
- web development using typescript and Vite, without any transpilation step

## Usage

### Without a package installation

`uu` can be used directly from esm.sh

```typescript
    const arr = [
        {age: 20, name: 'Alice'},
        {age: 22, name: 'Bob'},
        ...
    ]
    const uu = await import('https://esm.sh/jsr/@timepp/uu@1.0.14')
    document.body.appendChild(uu.visualizeArray())
```
 
### With package installation

`npm install tpuu`

JavaScript UI dependencies are managed through npm and loaded lazily when their
features are first used. Bootstrap CSS is also loaded automatically from a
pinned CDN URL when the first UU element is created. If the application already
provides Bootstrap 5, UU reuses it instead of adding another stylesheet.

Font Awesome and UU's shared dialog styles are initialized automatically when
`fa()` and `showDialog()` are first used. Applications can load custom Bootstrap
and Font Awesome stylesheet URLs ahead of time:

```typescript
import { enableBootstrap, enableFontAwesome } from 'tpuu'

enableBootstrap('https://example.com/bootstrap/css/bootstrap.min.css')
enableFontAwesome('https://example.com/font-awesome/css/all.min.css')
```

To prevent UU from loading Bootstrap—for example when the host supplies
Bootstrap later or uses its own compatible styles—disable automatic loading
before creating any UU elements:

```typescript
import { setBootstrapAutoLoad } from 'tpuu'

setBootstrapAutoLoad(false)
```

Importing `uu.ts` itself has no browser side effects. `enableBootstrap()` and
`enableFontAwesome()` remain available for explicit early initialization.

### As a Git submodule

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

## Diagnostics

uu exposes all its internal states, owned local storages, and injected styles in `window.timepp_uu_state`

## Development

### File structure

- `package.json`: used for publishing the package to npm registry
- `src/uu.ts`: pure public barrel containing export declarations only
- `src/tu.ts`: Non UI specific, can be used in both browser and Deno environments
- `src/uu-dom.ts`, `src/uu-dialog.ts`, `src/uu-progress.ts`: foundational browser UI APIs
- `src/uu-text.ts`, `src/uu-json.ts`, `src/uu-media.ts`: text, JSON, Markdown, and chart APIs
- `src/uu-controls.ts`, `src/uu-selection.ts`, `src/uu-input.ts`: controls and user input APIs
- `src/uu-pager.ts`, `src/uu-components.ts`: paging and composed UI components
- `src/uu-data-insights.ts`, `src/uu-object.ts`, `src/uu-visualize-array.ts`: data visualization APIs
- `src/uu-download.ts`, `src/uu-bootstrap.ts`, `src/uu-fontawesome.ts`: browser integration APIs
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

1. Run `deno publish` to publish the package to the Deno registry

## Todo

- [x] stringify support a callback function to receive the mapping between value and its position in the final string
- [x] hide column if all values are empty (null, undefined, etc) in visualizeArray
