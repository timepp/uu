# UU

UU aims to provide the following reusable constructs for modern development:

- script development using typescript and Deno
- web development using typescript and Vite, without any transpilation step

## Usage

### Without a package installation

`uu` can be used directly from esm.sh. The `/cdn` entry pins dependencies that
must remain singletons, such as CodeMirror, so callers do not need to provide a
long `?deps=` query.

```typescript
    const arr = [
        {age: 20, name: 'Alice'},
        {age: 22, name: 'Bob'},
        ...
    ]
  const uu = await import('https://esm.sh/jsr/@timepp/uu@1.0.22/cdn')
    document.body.appendChild(uu.visualizeArray())
```

Input areas resolve initial values in this order: defaults, the most recent
saved history, then explicitly supplied runtime parameters.

```typescript
const defaults = { query: '', limit: 20 }
const runtimeParams = { query: 'status:active' }
const input = uu.createInputArea(parent, defaults, {}, 'table', 'search', runtimeParams)
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

## Recreating array views

The UI test page includes a **UU Feature Showcase** with 36 synthetic products
from [demo-data.ts](./ui-test/demo-data.ts). Run `deno task ui-test` to try nested filters, custom
sorting and formatting, charts, pagination, table/tile/wall views, selection,
comparison, JSON export, and incremental loading. The demo initially loads
24 products, provides an interaction guide, and has its own resettable saved
settings.

`visualizeArray()` renders a data snapshot. When the data changes, create a new
view and replace the old element. Reuse the same `stateKey` to restore the
user's settings from local storage:

```typescript
const config = { stateKey: 'orders', pageSize: 20 }
let view = uu.visualizeArray(items, config)
document.body.appendChild(view)

const nextView = uu.visualizeArray(updatedItems, config)
view.replaceWith(nextView)
view = nextView
```

Saved settings include sorting, committed text and property filters, view mode,
column selection and order, page size (including disabled paging), current page,
and whether the property filter panel is expanded. Page size changes through
either the pager or the options menu are saved. Saved settings override the
configuration defaults.

The current page is restored after filtering and sorting; if there are fewer
pages, it is clamped to the last available page. Changing sorting, filters, or
page size starts at the first page. Empty input does not overwrite saved state.
Without a `stateKey`, settings are not retained between calls.

Property filters use single selection by default: clicking a value selects
only that value, or clears it if it is already the only selected value.
Hold Ctrl while clicking to add or remove individual values for multiple
selection. `All` clears the row. The expanded values dialog keeps direct-click
multiple selection without requiring Ctrl. Selected values are saved with the
property filter state.

Use `initialFilterProps: ['status', 'category']` to recommend property filter
rows for a new view. Nonempty defaults initially expand the filter panel without
selecting any values or excluding items. Saved property filter settings (including
an empty property list) and panel visibility take precedence over these defaults.

Set `flattenNestedObjects: true` to use nested property paths consistently in
display, sorting, property filters, and charts:

```typescript
const view = uu.visualizeArray(items, {
    flattenNestedObjects: true,
    initialFilterProps: ['user.city', 'user.department'],
})
```

Filter properties are independent of visible columns and `hideUniformProps`.
Flattening expands plain objects; arrays, empty objects, and non-plain objects
(such as dates) remain values. Arrays retain multi-value filtering and chart
statistics rather than exposing array indexes. Keys containing dots or brackets,
and empty keys, use JSON-quoted brackets: `["a.b"]` is a literal key, whereas
`a.b` is a nested path. Circular references through expanded objects throw a
`TypeError`. Ordinary dotted paths and the default non-flattened behavior remain
unchanged. Views and filters always retain the original item objects.

Standalone `PropertyFilter` accepts the same `flattenNestedObjects` option
(default `false`). Its `valueGetters` override default property/path lookup and
also register virtual filter properties:

```typescript
const filter = new uu.PropertyFilter(parent, items, 'orders-filter', {
    flattenNestedObjects: true,
    initialProperties: ['orderStatuses'],
    valueGetters: {
        orderStatuses: item => item.orders.map(order => order.status),
    },
})
```

The filter-property picker supports sorting by count (distinct values, highest
first) or property name (ascending/descending), without changing the selected
properties' order. The values dialog likewise supports count and value sorting.
In the property picker, search, icon-only sorting, and select-all/clear actions
are separate groups on the same toolbar, in that order. Options use the same
outline, hover, and primary selected-button styles as the Sort dialog; the
selected-properties area keeps its pale yellow highlight. The selected properties
appear below all options with their label on the same row. Drag
selected properties horizontally to reorder, regardless of the pointer's
vertical position.

Row selection, scroll position, focus, and unsubmitted filter text are not
restored. Random sorting restores the mode, not the previous shuffled order.

## Array selection and actions

Items are always selectable in table, tile, and wall views; `enableSelection`
has been removed. Hover over an item to reveal its checkbox.
Tile cards also show a subtle table-like hover highlight without changing their
background or selected outline. Clicking the item
replaces the selection with that item; clicking its checkbox adds or removes it
without changing other selections. Ctrl-click also toggles an item without
changing other selections. Selected checkboxes remain visible.
Clicking the only selected item again clears the selection.
Selection survives sorting, filtering, paging, and view changes within a view.
Existing item click callbacks still run on item clicks, but not checkbox clicks.
Interactive controls and property click handlers keep their existing behavior.
Selection does not set an item-level pointer cursor; checkboxes, item actions,
and properties with click handlers use pointer cursors.

The options menu separates global features, selection controls, and actions for
the current selection. Clicking outside the menu, choosing an action, or clicking
its trigger again closes it. `Select All` and `Invert Selection` operate on all filtered
results across pages, leaving selections outside the filter unchanged.
Hover over a view and press `F` to toggle the same menu at the mouse position
(clamped to the viewport). The shortcut targets the innermost view and is ignored
while editing text, composing input, or holding Ctrl, Alt, or Meta.
`Clear Selection` clears everything, including hidden selections.
With one item selected, its `itemActions` (including the default raw-data action
unless `noDefaultActions` is set) appear in the final section. `multiItemActions`
appear whenever the selection is nonempty and receive all selected items,
including hidden ones, in selection order. With two or more selected items,
`Compare Selected Items` compares all selected items in selection order using
`compareObjects` and renders the result with `visualizeArray`. The first column
is the recursive property path, followed by the boolean `allSame` column and
the original one-based item numbers (`Item 1`, etc.). Arrays are compared as
whole values, and missing properties display as `<missing>`. All properties,
including matching ones, are shown. Within differing property rows, equal values
share a pale cell background; different `valueIndex` groups receive different
colors. Rows with `allSame: true` have no comparison background colors.
Comparison table settings are saved using the state key
`uu-comparison-result-table`. On first use, `initialFilterProps: ['allSame']`
shows the `allSame` property filter without preselecting a value.

The `(Actions)` property is included by default but can be hidden in the visible
properties dialog, independently for each view mode. Hiding this property does
not remove selection actions from the options menu.

`tileRenderOption.header` accepts a callback returning an `HTMLElement`.
Use `header: item => uu.createHeader(uu.stringToColor(item.name))` for a colored
header. `createHeader(color)` returns a standalone empty padded `div` with a
width of `100%` and a minimum height of `6rem`, using the supplied CSS color
as its background. It can also be composed into other UI elements independently
of `visualizeArray`. When no header callback is provided, tiles use
`createHeader('gray')`. Custom item renderers still control their entire card.

## Custom array sorting

Use `getSortingValue(item, prop, dataIndex)` to customize sort keys without
changing displayed values or filtering:

```typescript
const statusOrder: Record<string, number> = {
    pending: 0,
    running: 1,
    completed: 2,
}

const view = uu.visualizeArray(items, {
    sortBy: [{ prop: 'status', order: 'asc' }],
    getSortingValue: (item, prop, dataIndex) => {
        if (prop === 'status') return statusOrder[item.status]
        if (prop === 'createdAt') return Date.parse(item.createdAt)
        return undefined
    },
})
```

The callback returns `string | number | undefined`. Return `undefined` to use
the default property value; `0` and `''` are valid custom keys. `dataIndex` is
the zero-based index in the original array, unaffected by sorting, filtering,
or paging. Return consistent key types for each column: numbers are compared
numerically, and strings use the existing Chinese locale collator.
Default object values are compared using their `tu.stringify()` text, avoiding
implicit object-to-string conversion failures for serialized browser objects.

Custom keys apply to initial sorting, header clicks, and multi-column sorting
in all views. They are not used for random sorting. Callbacks should be pure
and inexpensive because they may run multiple times during comparisons.
The toolbar's slider-icon button (tooltip: `Sort settings`) opens sorting settings; it does not
immediately sort the data. Confirm with `OK` to apply the settings.

## Styling and CSS hooks

`showDialog()` sizes itself to its content by default, including changes after
opening. Explicit `options.style.width` and `height` are preserved, including
viewport units. Manual resizing uses the browser's native dialog resize behavior.
Content exceeding the available viewport scrolls inside `.uu-dialog-content`.
For a view with its own scroll container, constrain the dialog height and use
a flex layout with `min-height: 0` on the content area and nested flex containers.
`showJsonResult()` already does this so scrolling stays inside CodeMirror while
the dialog header and actions remain visible.
Very short dialogs with long, wrapping titles or search panels can leave no
space for the viewer; increase the available height or shorten the title.

UU adds stable `uu-*` classes to the roots and important structural elements of
the UI it creates. Use these classes instead of depending on element nesting or
Bootstrap utility classes:

```css
.uu-dialog {
    border-radius: 12px;
}

.uu-dialog-header {
    background: var(--app-dialog-header);
}

.uu-va-table-row.uu-is-selected {
    outline: 2px solid orange;
}

.uu-input-label {
    min-width: 8rem;
}
```

Common state classes include `uu-is-selected`, `uu-is-active`,
`uu-is-expanded`, `uu-is-folded`, `uu-is-loading`, `uu-is-disabled`,
`uu-is-empty`, `uu-has-error`, and `uu-has-filter`.

Frequently used abbreviated component prefixes are:

| Prefix | Component |
| --- | --- |
| `uu-va-*` | array visualization |
| `uu-pf-*` | property filters |
| `uu-di-*` | data insights |
| `uu-dnd-*` | draggable sorted containers |
| `uu-fold-*` | foldable areas |
| `uu-md` | Markdown content |

Bootstrap, Font Awesome, CodeMirror, and other third-party classes remain
implementation details. UU marks the host elements for third-party widgets but
does not treat their generated internal DOM as part of its CSS hook contract.
Elements returned by custom array item and property formatters receive the
appropriate `uu-va-*` class on their root without an extra wrapper.

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

Development commands are defined in `deno.json`. Run `deno task` to list them,
`deno task test` for tests, and `deno task build:all` for standard and bundled
outputs. Deno tasks resolve the installed development tools from `node_modules`.
The npm `prepublishOnly` hook delegates to the Deno task of the same name, so
`npm publish` still builds the package automatically.

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

To run the array sorting regression checks, start `deno task ui-test`, then run
`(await import('./sorting-test.ts')).runSortingTests()` in the browser console.
For view-state persistence checks, run
`await (await import('./state-test.ts')).runStateTests()`.
For dialog sizing and CodeMirror scrolling checks, run
`await (await import('./dialog-test.ts')).runDialogTests()`.

### Publishing

First update the version:

```shell
deno task incver
```

#### Publish to npm

1. Run `deno task build:all` to build the standard and bundled outputs
1. commit local changes (and push to remote repository)
1. Run `npm publish` to publish the package to the npm registry

#### Publish to Deno

1. Run `deno publish` to publish the package to the Deno registry

## Todo

- [x] stringify support a callback function to receive the mapping between value and its position in the final string
- [x] hide column if all values are empty (null, undefined, etc) in visualizeArray
