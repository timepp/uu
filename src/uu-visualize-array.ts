
import * as tu from './tu.ts'
import { 
    createElement, 
    fa, 
    createToggleBar, 
    syncExistence
} from './uu-dom.ts'
import { showJsonResult } from './uu-json.ts'
import { createFoldedString } from './uu-text.ts'
import { associateDropdownActions, type DropdownAction } from './uu-controls.ts'
import { showDialog } from './uu-dialog.ts'
import { renderDataInsights } from './uu-data-insights.ts'
import { Pager } from './uu-pager.ts'
import { prompt } from './uu-input.ts'
import { showSelection } from './uu-selection.ts'
import { PropertyFilter } from './uu-propfilter.ts'
import { DraggableSortedContainer } from './uu-dnd.ts'
import { withUI } from './uu-progress.ts'
import { registerDomResource } from './uu-runtime-state.ts'

export type PropRenderOption<T extends object> = {
    formatter?: (item: T, prop: string, dataIndex: number) => string | HTMLElement
    style?: Partial<CSSStyleDeclaration>
    onClick?: (item: T, prop: string, dataIndex: number) => boolean
}
export type ItemAction = (item: any, dataIndex: number) => void
export type ItemActions = Record<string, ItemAction>
export type MultiItemAction<T extends object> = (selectedItems: T[]) => void | Promise<void>
export type MultiItemActions<T extends object> = Record<string, MultiItemAction<T>>
export type WallRenderOption<T extends object> = RenderOption<T> & {
    // Required: returns the image URL for a given item
    imageUrl: (item: T, dataIndex: number) => string
    // Fixed width of each image cell, default '200px'
    imageWidth?: string
    // Vertical gap between images in each column, default '6px'
    rowGap?: string
}

export type TileRenderOption<T extends object> = RenderOption<T> & {
    // Optional: returns content to render before the tile properties.
    header?: (item: T) => HTMLElement
    // Whether to hide property names in the default tile renderer. Default: false.
    hidePropName?: boolean
    // Style of the grid container. Values override the default tile layout.
    containerStyle?: Partial<CSSStyleDeclaration>
}

export type RenderOption<T extends object> = {
    props?: string[]
    propOptions?: Record<string, PropRenderOption<T>>

    propFormatter?: (item: T, prop: string, dataIndex: number) => string | HTMLElement | undefined
    propStyle?: (item: T, prop: string, dataIndex: number) => Partial<CSSStyleDeclaration> | undefined
    onPropClick?: (item: T, prop: string, dataIndex: number) => boolean|undefined
    
    // When used in table mode, this must return a tr element directly.
    itemFormatter?: (item: T, dataIndex: number, props: string[]) => HTMLElement | undefined
    onItemClick?: (item: T, dataIndex: number) => Promise<boolean|undefined>
    itemStyle?: (item: T, dataIndex: number) => Partial<CSSStyleDeclaration> | undefined
}
export type VisualizeConfig<T extends object> = {
    // the default render style is 'table'
    renderStyles: ('table' | 'tile' | 'wall')[]

    showPropSelector: boolean
    showSortButton: boolean
    showFilter: boolean    

    renderOption: RenderOption<T>
    tableRenderOption: RenderOption<T>
    tileRenderOption: TileRenderOption<T>
    wallRenderOption: WallRenderOption<T>
    
    itemActions: ItemActions | ((item: T, dataIndex: number) => ItemActions)

    // Adds named entries to the selection actions menu. Each callback receives all
    // selected items in selection order.
    multiItemActions: MultiItemActions<T>

    // If not empty, raw index will be shown in the first prop with the given prop name
    // note: this prop can be hide / sort as well
    // default: #
    // set it to empty string to hide raw index
    rawIndexProp: string

    // If not empty, an additional prop will be shown with the given name, which contains actions for each item
    // note: this prop can be hide / sort as well
    // default: (Actions)
    // set it to empty string to hide action prop
    actionProp: string

    noDefaultActions: boolean

    // if present, paging will be enabled
    // if not present, all rows will be shown
    pageSize: number

    // if true, nested objects will be flattened using dot notation
    // so that their properties can be shown as props
    // e.g. { a: { b: 1 } } => prop "a.b" with value 1
    flattenNestedObjects: boolean

    // whether to hide props which as the same value for all items
    // default: true
    // take effect only when `props` is not provided
    hideUniformProps: boolean

    stringFoldThreshold: number
    
    // initial sort by settings, if not present, no sorting is applied
    sortBy: {
        prop: string
        order: 'asc' | 'desc'
    }[]

    // Returns a custom sort key, or undefined to use the default property value.
    // dataIndex is the zero-based index in the original array.
    getSortingValue?: (item: T, prop: string, dataIndex: number) => string | number | undefined

    // initial filter string, if not present, no filtering is applied
    filter: string

    // Recommended property filter rows for a new view; saved settings take precedence.
    // Providing nonempty defaults also initially expands the property filter panel.
    initialFilterProps: string[]

    // item filter, used to filter items given the filter string
    // the default filter will do a deep search on all properties of the item
    // It's recommended to provide a custom filter for better performance, if there are many large items
    // Custom filter will be disabled when the filter string is exception
    itemFilter: (item: T, filter: string) => boolean | undefined
    // If not empty, view, filter, sort, column and paging settings are saved to local storage.
    stateKey: string

    // Optional: load more data when user clicks on the total count
    loadMore: () => Promise<T[]>
    onPropertyValueClick: (prop: string, value: string) => void
}

function ensureSelectionStyles() {
    const styleId = 'uu-va-selection-styles'
    let style = document.getElementById(styleId)
    if (!style) {
        style = createElement(document.head, 'style', [], `
            .uu-va-selectable { position: relative; }
            .uu-va-selection-cell { position: relative; padding-left: 2rem !important; }
            .uu-va-table .uu-va-selectable.uu-is-selected { outline: none; }
            .uu-va-table .uu-va-selectable.uu-is-selected::after {
                content: '';
                position: absolute;
                inset: 0;
                border: 2px solid var(--bs-primary, #0d6efd);
                box-sizing: border-box;
                pointer-events: none;
                z-index: 2;
            }
            .uu-va-select-checkbox {
                position: absolute;
                top: .5rem;
                left: .4rem;
                width: 1rem;
                height: 1rem;
                margin: 0;
                z-index: 1;
                opacity: 0;
                cursor: pointer;
            }
            .uu-va-selection-cell > .uu-va-select-checkbox {
                top: 50%;
                transform: translateY(-50%);
            }
            .uu-va-selectable:hover > .uu-va-select-checkbox,
            .uu-va-selectable:hover > .uu-va-selection-cell > .uu-va-select-checkbox,
            .uu-va-select-checkbox:checked,
            .uu-va-select-checkbox:focus-visible { opacity: 1; }
        `, {}, { id: styleId })
    }
    registerDomResource(style, 'uu-visualize-array', 'style', `#${styleId}`, 'array-selection-styles')
}

export function visualizeArray<T extends object>(arr: T[], cfg: Partial<VisualizeConfig<T>> = {}): HTMLDivElement {
    if (arr.length === 0) {
        return createElement(null, 'div', ['uu-va', 'uu-va-empty', 'uu-is-empty', 'alert', 'alert-info', 'mb-0'], 'Data is empty.')
    }
    ensureSelectionStyles()

    // helper functions
    const toArrow = (s: string) => s === 'asc' ? '⬆️' : '⬇️'
    const renderStyles = cfg.renderStyles || ['table', 'tile', 'wall']
    const rawIndexProp = cfg.rawIndexProp ?? '#'
    const actionProp = cfg.actionProp ?? '(Actions)'
    const selectedIndexes = new Set<number>()
    const selectionElements = new Map<number, HTMLElement>()

    // persist state
    const state = tu.createObservableState(cfg.stateKey || null, {
        sortBy: (cfg.sortBy || []) as VisualizeConfig<T>['sortBy'],
        randomSort: false,
        filter: cfg.filter || '',
        pageSize: cfg.pageSize,
        currentPage: 0,
        propertyFilterExpanded: (cfg.initialFilterProps?.length ?? 0) > 0,
        renderStyle: renderStyles[0],
        tableProps: undefined as string[] | undefined,
        tileProps: undefined as string[] | undefined,
        wallProps: undefined as string[] | undefined,
    }, () => { })

    // get prop value
    function getPropValue(item: T, prop: string, index: number) {
        if (prop === rawIndexProp) {
            return index + 1
        }
        if (prop === actionProp) {
            return `action #${index + 1}`
        }
        if (!cfg.flattenNestedObjects) {
            return item[prop as keyof T]
        }
        const parts = prop.split('.')
        let v = item as any
        for (const part of parts) {
            if (v === null || v === undefined) {
                return undefined
            }
            v = v[part]
        }
        return v
    }

    function getActiveViewRenderOption() {
        if (state.renderStyle === 'table') return cfg.tableRenderOption
        if (state.renderStyle === 'tile') return cfg.tileRenderOption
        return cfg.wallRenderOption
    }

    function getItemActions(item: T, index: number) {
        const actions = (typeof cfg.itemActions === 'function') ? cfg.itemActions(item, index) : (cfg.itemActions || {})
        const defaultActions = cfg.noDefaultActions ? {} : {
            raw: () => showJsonResult(`Raw data (index: ${index})`, item)
        }
        return {...defaultActions, ...actions}
    }

    async function runItemAction(name: string, action: () => unknown) {
        try {
            await action()
        } catch (error) {
            console.error(`item action "${name}" failed`, error)
            const message = error instanceof Error ? error.message : String(error)
            const content = createElement(null, 'pre', ['text-danger', 'overflow-auto'], message)
            showDialog(`Error executing action "${name}"`, content)
        }
    }

    function createActionArea(item: T, index: number) {
        const allActions = getItemActions(item, index)
        const container = createElement(null, 'div', ['uu-va-actions', 'd-flex', 'gap-2'])
        for (const [name, action] of Object.entries(allActions)) {
            const btn = createElement(container, 'a', ['uu-va-action', 'me-2'], name)
            btn.style.cursor = 'pointer'
            btn.onclick = async (event) => {
                event.stopPropagation()
                await runItemAction(name, () => action(item, index))
            }
        }
        return container
    }

    const generalPropFormatter = (item: T, prop: string, dataIndex: number) => {
        const value = getPropValue(item, prop, dataIndex)
        if (typeof value === 'object' && value !== null) {
            // return createJsonView(JSON.stringify(value, null, 2))
            return tu.stringify(value)
        } else if (prop === actionProp) {
            // create action buttons
            return createActionArea(item, dataIndex)
        } else {
            return `${value}`
        }
    }

    // returns an html element for the given prop of the given item
    function renderPropValue(item: T, prop: string, index: number) {
        const viewOption = getActiveViewRenderOption()
        // now render the property, try formatters until getting a non-undefined result
        const formatterFallbackChain = [
            viewOption?.propOptions?.[prop]?.formatter,
            viewOption?.propFormatter,
            cfg.renderOption?.propOptions?.[prop]?.formatter,
            cfg.renderOption?.propFormatter,
            generalPropFormatter
        ]
        let value = undefined
        for (const formatter of formatterFallbackChain) {
            if (!formatter) continue
            value = formatter(item, prop, index)
            if (value !== undefined) break
        }
        // wrap string with html element
        if (typeof value === 'string') {
            value = createFoldedString(value, cfg.stringFoldThreshold??120)
        }
        // value is HTML element now
        const element = value as HTMLElement
        element.classList.add('uu-va-value')
        if (state.renderStyle === 'table') element.classList.add('uu-va-table-value')
        else if (state.renderStyle === 'tile') element.classList.add('uu-va-tile-value')
        else element.classList.add('uu-va-wall-value')

        // get style in the same way
        const styleFallbackChain = [
            () => viewOption?.propOptions?.[prop]?.style,
            viewOption?.propStyle,
            () => cfg.renderOption?.propOptions?.[prop]?.style,
            cfg.renderOption?.propStyle
        ]
        const mergedStyle = {} as Partial<CSSStyleDeclaration>
        for (const styleGetter of styleFallbackChain) {
            if (!styleGetter) continue
            const style = styleGetter(item, prop, index)
            if (style !== undefined) {
                Object.assign(mergedStyle, style)
                break
            }
        }
        
        Object.assign(element.style, mergedStyle)

        // onclick: execute onclick chain backwards until one handler returns true
        const onClickFallbackChain = [
            viewOption?.propOptions?.[prop]?.onClick,
            viewOption?.onPropClick,
            cfg.renderOption?.propOptions?.[prop]?.onClick,
            cfg.renderOption?.onPropClick
        ].filter(v => !!v)
        if (onClickFallbackChain.length > 0) {
            element.onclick = (evt) => {
                evt.stopPropagation()
                if (window.getSelection()?.toString()) return
                for (const onClickHandler of onClickFallbackChain) {
                    if (!onClickHandler) continue
                    const handled = onClickHandler(item, prop, index)
                    if (handled !== false) break
                }
            }
            element.style.cursor = 'pointer'
        }

        return element
    }

    function calculateProps() {
        let allProps = tu.dataProperties(arr)
        if (cfg.flattenNestedObjects) {
            const props = new Set<string>()
            tu.traverseObject(arr, -1, (p, v, t) => {
                const path = p.slice(1).join('.')
                if (path && v instanceof Array) {
                    props.add(path)
                    return 0
                }
                if (t === 'leaf') props.add(path)
            })
            allProps = [...props]

        }
        const presentationProps = cfg.renderOption?.props ?? []
        const allPropsWithRaw = [
            rawIndexProp,
            ...presentationProps,
            ...allProps.filter(p => !presentationProps.includes(p)),
            actionProp
        ].filter(v => !!v) as string[]
        let meaningfulProps = allProps
        const hideUniformProps = cfg.hideUniformProps ?? true
        if (hideUniformProps && arr.length > 1) {
            meaningfulProps = allProps.filter(p => {
                const firstValue = getPropValue(arr[0], p, 0)
                return arr.some((item, index) => {
                    const v = getPropValue(item, p, index)
                    return tu.stringify(v) !== tu.stringify(firstValue)
                })
            })
        }
        const meaningfulPropsWithRaw = [
            rawIndexProp,
            ...presentationProps,
            ...meaningfulProps.filter(p => !presentationProps.includes(p)),
            actionProp
        ].filter(v => !!v) as string[]

        return { allPropsWithRaw, meaningfulPropsWithRaw }
    }

    let { allPropsWithRaw, meaningfulPropsWithRaw } = calculateProps()

    // properties used to construct visible props
    // presentation props should be put before other props but after raw index prop

    function getVisibleProps() {
        const stateProps = state.renderStyle === 'table' ? state.tableProps : state.renderStyle === 'tile' ? state.tileProps : state.wallProps
        if (stateProps) return stateProps
        const viewOption = getActiveViewRenderOption()
        const props = viewOption?.props || cfg.renderOption?.props || meaningfulPropsWithRaw
        return actionProp && !props.includes(actionProp) ? [...props, actionProp] : props
    }

    function renderItem(item: T, index: number) {
        const viewOption = getActiveViewRenderOption()
        const itemFormatterFallbackChain = [
            viewOption?.itemFormatter,
            cfg.renderOption?.itemFormatter
        ].filter(v => !!v) as ((item: T, dataIndex: number, props: string[]) => HTMLElement)[]
        for (const itemFormatter of itemFormatterFallbackChain) {
            const r = itemFormatter(item, index, getVisibleProps())
            if (r) return r
        }
    }

    function getItemStyle(item: T, index: number) {
        const viewOption = getActiveViewRenderOption()
        const itemStyleFallbackChain = [
            viewOption?.itemStyle,
            cfg.renderOption?.itemStyle
        ].filter(v => !!v) as ((item: T, dataIndex: number) => Partial<CSSStyleDeclaration>)[]
        let style = undefined
        for (const itemStyleGetter of itemStyleFallbackChain) {
            style = itemStyleGetter(item, index)
            if (style) break
        }
        return style
    }

    function getSelectedItems(): T[] {
        return [...selectedIndexes]
            .map(index => arr[index])
            .filter((item): item is T => item !== undefined)
    }

    function syncItemSelection(element: HTMLElement, index: number) {
        const selected = selectedIndexes.has(index)
        element.setAttribute('aria-selected', `${selected}`)
        element.classList.toggle('uu-is-selected', selected)
        element.classList.toggle('table-primary', state.renderStyle === 'table' && selected)
        const checkbox = element.querySelector<HTMLInputElement>('.uu-va-select-checkbox')
        if (checkbox) checkbox.checked = selected
        if (state.renderStyle !== 'table') {
            if (selected) {
                if (element.dataset.uuUnselectedOutline === undefined) {
                    element.dataset.uuUnselectedOutline = element.style.outline
                    element.dataset.uuUnselectedOutlineOffset = element.style.outlineOffset
                }
                element.style.outline = '3px solid var(--bs-primary, #0d6efd)'
                element.style.outlineOffset = '-3px'
            } else if (element.dataset.uuUnselectedOutline !== undefined) {
                element.style.outline = element.dataset.uuUnselectedOutline
                element.style.outlineOffset = element.dataset.uuUnselectedOutlineOffset || ''
                delete element.dataset.uuUnselectedOutline
                delete element.dataset.uuUnselectedOutlineOffset
            }
        }
    }

    function syncSelection() {
        for (const [index, element] of selectionElements) {
            syncItemSelection(element, index)
        }
    }

    function attachItemClickHandler(item: T, index: number, element: HTMLElement) {
        const viewOption = getActiveViewRenderOption()
        const onItemClickFallbackChain = [
            viewOption?.onItemClick,
            cfg.renderOption?.onItemClick
        ].filter(v => !!v) as ((item: T, dataIndex: number) => Promise<boolean|undefined>)[]
        element.classList.add('uu-va-selectable')
        let checkboxHost = element
        if (element instanceof HTMLTableRowElement) {
            checkboxHost = element.cells[0] || element.insertCell()
            checkboxHost.classList.add('uu-va-selection-cell')
        }
        const checkbox = createElement(null, 'input', ['uu-va-select-checkbox'], '', {}, { type: 'checkbox' })
        checkbox.setAttribute('aria-label', `Select item ${index + 1}`)
        checkboxHost.prepend(checkbox)
        checkbox.onclick = event => event.stopPropagation()
        checkbox.onchange = () => {
            if (checkbox.checked) selectedIndexes.add(index)
            else selectedIndexes.delete(index)
            syncSelection()
        }
        selectionElements.set(index, element)
        syncItemSelection(element, index)
        element.addEventListener('click', async evt => {
            evt.stopPropagation()
            const target = evt.target
            if (target instanceof Element && target.closest('a, button, input, select, textarea, label')) return
            if (globalThis.getSelection?.()?.toString()) return
            const deselect = selectedIndexes.size === 1 && selectedIndexes.has(index)
            selectedIndexes.clear()
            if (!deselect) selectedIndexes.add(index)
            syncSelection()
            for (const onItemClickHandler of onItemClickFallbackChain) {
                const handled = await onItemClickHandler(item, index)
                if (handled !== false) break
            }
        })
    }

    function compareSelectedItems() {
        const selected = [...selectedIndexes]
            .map(index => ({ item: arr[index], index }))
            .filter((entry): entry is { item: T, index: number } => entry.item !== undefined)
        if (selected.length < 2) {
            return showDialog('Compare Selected Items', 'Select at least two items first.', { actions: ['Close'] })
        }
        const objects = selected.map(({ item, index }) => ({ name: `Item ${index + 1}`, obj: item }))
        const comparisons = tu.compareObjects(objects)
        const rows = comparisons.map(comparison => Object.fromEntries<string | boolean>([
            ['prop', comparison.prop],
            ['allSame', comparison.allSame],
            ...comparison.values.map(({ name, value }): [string, string] => [name, value]),
        ]))
        const content = createElement(null, 'div', ['uu-va-compare'])
        content.appendChild(visualizeArray(rows, {
            stateKey: 'uu-comparison-result-table',
            initialFilterProps: ['allSame'],
            renderStyles: ['table'],
            rawIndexProp: '',
            actionProp: '',
            hideUniformProps: false,
            renderOption: { props: ['prop', 'allSame', ...objects.map(({ name }) => name)] },
            tableRenderOption: {
                itemFormatter: (item, dataIndex, props) => {
                    const row = createElement(null, 'tr', ['uu-va-table-row', 'uu-va-compare-row'])
                    for (const prop of props) {
                        const value = comparisons[dataIndex].values.find(value => value.name === prop)
                        const cell = createElement(row, 'td', ['uu-va-table-cell', value ? 'uu-va-compare-value' : prop === 'prop' ? 'uu-va-compare-name' : 'uu-va-compare-all-same'])
                        if (value && !comparisons[dataIndex].allSame) {
                            const color = `hsl(${value.valueIndex * 137.508 % 360}, 70%, 93%)`
                            cell.style.backgroundColor = color
                            cell.style.setProperty('--bs-table-bg', color)
                        }
                        const text = createFoldedString(String(item[prop]), cfg.stringFoldThreshold ?? 120)
                        text.classList.add('uu-va-value', 'uu-va-table-value')
                        cell.appendChild(text)
                    }
                    return row
                },
            },
        }))
        return showDialog('Compare Selected Items', content, {
            actions: ['Close'],
            style: { minWidth: '70vw', maxWidth: '90vw', maxHeight: '80vh' }
        })
    }

    function tableRenderer(startIndex: number, endIndex: number) {
        const table = createElement(null, 'table', ['uu-va-table', 'table', 'table-bordered', 'table-hover', 'mb-0'])
        const tbody = createElement(table, 'tbody', ['uu-va-table-body'])
        const sortBy = state.sortBy || []

        // thead
        const thead = createElement(table, 'thead', ['uu-va-table-head', 'bg-light'])
        const tr = createElement(thead, 'tr', ['uu-va-table-head-row'])
        for (const prop of getVisibleProps()) {
            const th = createElement(tr, 'th', ['uu-va-table-head-cell'])
            createElement(th, 'span', ['uu-va-sort-label'], prop)
            const i = sortBy.findIndex(s => s.prop === prop)
            if (i >= 0) {
                const s = sortBy[i]
                createElement(th, 'span', ['uu-va-sort-order'], toArrow(s.order))
                if (sortBy.length > 1) {
                    createElement(th, 'span', ['uu-va-sort-order'], `${i + 1}`, { verticalAlign: 'super', fontSize: '0.8em' })
                }
            }

            th.style.cursor = 'pointer'
            th.style.userSelect = 'none'
            th.onclick = () => {
                const s = state.sortBy?.find(s => s.prop === prop)
                if (s) {
                    if (s.order === 'asc') {
                        state.sortBy = [{ prop, order: 'desc' }]
                    } else if (s.order === 'desc') {
                        state.sortBy = []
                    }
                } else {
                    state.sortBy = [{ prop, order: 'asc' }]
                }
                applySort()
                pager.gotoPage(0)
            }
        }

        for (let i = startIndex; i < endIndex; i++) {
            let tr = renderItem(data[i].item, data[i].index)
            if (!tr) {
                // create row in the default way
                tr = createElement(null, 'tr', ['uu-va-table-row'], '', getItemStyle(data[i].item, data[i].index))
                for (const [j, prop] of getVisibleProps().entries()) {
                    const td = createElement(tr, 'td', ['uu-va-table-cell'])
                    const element = renderPropValue(data[i].item, prop, data[i].index)
                    td.appendChild(element)
                }
                tr.classList.add('uu-va-table-row')
            }
            attachItemClickHandler(data[i].item, data[i].index, tr)
            tbody.appendChild(tr)
        }
        return table
    }

    function tileRenderer(startIndex: number, endIndex: number) {
        const container = createElement(null, 'div', ['uu-va-tiles'], '', {
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))',
            ...cfg.tileRenderOption?.containerStyle
        })

        for (let i = startIndex; i < endIndex; i++) {
            const item = data[i].item
            const dataIndex = data[i].index
            let card = renderItem(data[i].item, data[i].index)
            if (!card) {
                card = createElement(null, 'div', ['uu-va-tile', 'card', 'p-1'], '')

                const header = cfg.tileRenderOption?.header?.(item)
                if (header) {
                    header.classList.add('uu-va-tile-header')
                    card.appendChild(header)
                }

                // const cardBody = createElement(card, 'div', ['card-body', 'd-flex', 'flex-column', 'gap-2'])
                for (const [j, prop] of getVisibleProps().entries()) {
                    if (!getPropValue(item, prop, dataIndex)) continue
                    const row = createElement(card, 'div', ['uu-va-tile-row'])
                    if (!cfg.tileRenderOption?.hidePropName && prop !== actionProp) {
                        createElement(row, 'span', ['uu-va-tile-name'], `${prop}: `, { opacity: '0.35' })
                    }
                    card.classList.add('uu-va-tile')
                    createElement(row, 'span', ['uu-va-tile-value'], renderPropValue(item, prop, dataIndex))
                }
            }
            const style = getItemStyle(item, dataIndex)
            Object.assign(card.style, style || {})
            container.appendChild(card)
            attachItemClickHandler(data[i].item, data[i].index, card)
        }
        return container
    }

    function wallRenderer(startIndex: number, endIndex: number) {
        const wallOption = cfg.wallRenderOption
        const imageWidth = wallOption?.imageWidth || '200px'
        const rowGap = wallOption?.rowGap || '6px'
        const container = createElement(null, 'div', ['uu-va-wall'], '', {
            columnWidth: imageWidth,
            columnGap: rowGap
        })

        for (let i = startIndex; i < endIndex; i++) {
            const item = data[i].item
            const dataIndex = data[i].index

            const imgUrl = wallOption?.imageUrl(item, dataIndex) ?? ''

            // wrapper needs relative positioning for the overlay
            const wrapper = createElement(container, 'div', ['uu-va-wall-item'], '', {
                position: 'relative',
                overflow: 'hidden',
                lineHeight: '0',
                marginBottom: rowGap
            })
            Object.assign(wrapper.style, getItemStyle(item, dataIndex) || {})

            const img = createElement(wrapper, 'img', ['uu-va-wall-image'], '', {
                width: '100%',
                height: 'auto',
                display: 'block'
            }) as HTMLImageElement
            img.src = imgUrl
            img.loading = 'lazy'

            // semi-transparent hover overlay listing visible prop values
            const overlay = createElement(wrapper, 'div', ['uu-va-wall-overlay'], '', {
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                padding: '4px 6px',
                fontSize: '0.75em',
                lineHeight: '1.4',
                opacity: '0',
                transition: 'opacity 0.2s',
                overflowY: 'auto',
                maxHeight: '60%'
            })
            for (const prop of getVisibleProps()) {
                const val = getPropValue(item, prop, dataIndex)
                if (val === undefined || val === null) continue
                const row = createElement(overlay, 'div', ['uu-va-wall-row'])
                createElement(row, 'span', ['uu-va-wall-name'], `${prop}: `, { fontWeight: 'bold', opacity: '0.75' })
                createElement(row, 'span', ['uu-va-wall-value'], renderPropValue(item, prop, dataIndex))
            }

            wrapper.addEventListener('mouseenter', () => { overlay.style.opacity = '1' })
            wrapper.addEventListener('mouseleave', () => { overlay.style.opacity = '0' })

            attachItemClickHandler(item, dataIndex, wrapper)
        }
        return container
    }

    function getRenderer() {
        return state.renderStyle === 'table' ? tableRenderer : state.renderStyle === 'tile' ? tileRenderer : wallRenderer
    }

    // data flows through: allData -> text filter -> property filter -> sort/render
    const allData = arr.map((item, index) => ({item, index}))
    let textFilteredData = allData
    let data = allData
    const pager = new Pager(data.length, state.pageSize && state.pageSize > 0 ? state.pageSize : Infinity, (page, pageSize) => {
        state.currentPage = page
        // Zero survives JSON serialization and distinguishes disabled paging from an unset default.
        state.pageSize = pageSize === Infinity ? 0 : pageSize
        gotoPage(page)
    })
    const pagerElem = pager.getElement()

    // overall dom
    const view = createElement(null, 'div', ['uu-va', 'border', 'p-2'])
    const toolbar = createElement(view, 'div', ['uu-va-toolbar', 'd-flex', 'gap-1', 'mb-2'])
    const renderStyleToIndex = (s: 'table' | 'tile' | 'wall') => renderStyles.indexOf(s)
    const indexToRenderStyle = (i: number) => renderStyles[i]
    const enabledRenderStyleIcons = renderStyles.map(s => {
        if (s === 'table') return fa('fa-table')
        if (s === 'tile') return fa('fa-grip-horizontal')
        if (s === 'wall') return fa('fa-image')
        return document.createElement('span')
    })
    const viewToggle = createToggleBar(enabledRenderStyleIcons, renderStyleToIndex(state.renderStyle), (v) => {
        const nextRenderStyle = indexToRenderStyle(v)
        if (state.renderStyle === nextRenderStyle) return
        state.renderStyle = nextRenderStyle
        pager.refreshCurrentPage()
    })
    viewToggle.classList.add('uu-va-view', 'flex-shrink-0')
    toolbar.appendChild(viewToggle)
    const igPropSelector = createElement(toolbar, 'div', ['uu-va-props', 'input-group', 'w-auto', 'flex-shrink-0'])
    const propSelectorBtn = createElement(igPropSelector, 'button', ['uu-btn', 'uu-va-props-btn', 'btn', 'btn-outline-secondary'], fa('fa-eye'))
    const igSort = createElement(toolbar, 'div', ['uu-va-sort', 'input-group', 'w-auto', 'flex-shrink-0'])
    const sortBtn = createElement(igSort, 'button', ['uu-btn', 'uu-va-sort-btn', 'btn', 'btn-outline-secondary'], fa('fa-sort'))
    const sortHint = createElement(igSort, 'span', ['uu-va-sort-hint', 'input-group-text'])
    const igFiler = createElement(toolbar, 'div', ['uu-va-filter-group', 'input-group', 'flex-grow-1'])
    const filter = createElement(igFiler, 'input', ['uu-va-filter', 'form-control'], '')
    const filterHint = createElement(igFiler, 'span', ['uu-va-filter-toggle', 'input-group-text'], fa('fa-filter'))
    const counts = createElement(igFiler, 'span', ['uu-va-count', 'input-group-text'], '20 / 100')
    const pagerPlaceholder = createElement(toolbar, 'div', ['uu-va-pager'])
    const loadMoreBtn = createElement(toolbar, 'button', ['uu-btn', 'uu-va-load-more', 'btn', 'btn-outline-secondary'], fa('fa-plus'))
    const optionBtn = createElement(toolbar, 'button', ['uu-btn', 'uu-va-options', 'btn', 'btn-outline-secondary'], fa('fa-bars'))
    const propertyFilterArea = createElement(view, 'div', ['uu-va-pf', 'mb-1'], '', { display: state.propertyFilterExpanded ? '' : 'none' })
    propertyFilterArea.classList.toggle('uu-is-active', state.propertyFilterExpanded)
    const dataContainer = createElement(view, 'div', ['uu-va-data'])

    const propertyFilter = new PropertyFilter<T>(propertyFilterArea, allData.map(v => v.item), cfg.stateKey ? `${cfg.stateKey}:property-filter` : '', {
        initialProperties: cfg.initialFilterProps,
        onChange: () => {
            applyPropertyFilter()
            applySort()
            pager.gotoPage(0)
        }
    })

    toolbar.replaceChild(pagerElem, pagerPlaceholder)
    pagerElem.classList.add('uu-va-pager')
    filter.value = state.filter || ''

    function gotoPage(page: number) {
        // only visible rows falling into the current page are shown, all others are hidden
        const {startIndex, endIndex} = pager.getPageRange(page)
        console.log(`goto page ${page}, show items from ${startIndex} to ${endIndex}`)
        selectionElements.clear()
        view.classList.toggle('uu-va-view-table', state.renderStyle === 'table')
        view.classList.toggle('uu-va-view-tiles', state.renderStyle === 'tile')
        view.classList.toggle('uu-va-view-wall', state.renderStyle === 'wall')
        dataContainer.replaceChildren()
        dataContainer.appendChild(getRenderer()(startIndex, endIndex))
    }

    function applyFilterAndSort(page = 0) {
        applyTextFilter(state.filter || '')
        applyPropertyFilter()
        applySort()
        pager.gotoPage(page)
    }

    function applyTextFilter(s: string) {
        let hasFilterError = false
        s = s.trim()
        if (s === '') {
            textFilteredData = allData
        } else {
            const isExpr = /[><]|===?|!==?|&&|\|\||\.\w+\(/.test(s)
            if (isExpr) {
                // advanced filter, we compile this as a function
                const funcCode = `with (item) { return (${s}) }`
                console.log('compile filter function with code:', funcCode)
                try {
                    const filterFunc = new Function('item', funcCode) as (item: T) => boolean
                    textFilteredData = allData.filter(v => {
                        try {
                            return filterFunc(v.item)
                        } catch (e) {
                            return false
                        }
                    })
                } catch (e) {
                    console.error('invalid filter code', e)
                    hasFilterError = true
                    textFilteredData = []
                }
            } else {
                textFilteredData = allData
                const itemFilter = (item: T, filter: string) => {
                    const r = cfg.itemFilter ? cfg.itemFilter(item, filter) : undefined
                    if (r !== undefined) return r
                    return tu.fuzzyFind(item, filter, false) !== null
                }
                for (const c of s.split(' ')) {
                    textFilteredData = textFilteredData.filter(v => itemFilter(v.item, c))
                }
            }
        }
        propertyFilter.setItems(textFilteredData.map(v => v.item))
        filter.style.backgroundColor = hasFilterError ? '#ffcccc' : (textFilteredData.length < arr.length ? '#ccffcc' : '')
        filter.classList.toggle('uu-has-error', hasFilterError)
        view.classList.toggle('uu-has-filter', s !== '')
    }

    function applyPropertyFilter() {
        const filteredItems = new Set(propertyFilter.getFilteredItems(textFilteredData.map(v => v.item)))
        data = textFilteredData.filter(v => filteredItems.has(v.item))
        updateCountsDisplay()
        pager.setTotalItems(data.length)
        filterHint.classList.toggle('text-success', propertyFilter.getSummary().length > 0)
    }

    const zhCollator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base' })

    function updateCountsDisplay() {
        counts.replaceChildren()
        createElement(counts, 'span', ['uu-va-count-value'], `${data.length} / ${arr.length}`)
    }

    function getSortingValue(item: T, prop: string, dataIndex: number) {
        const value = cfg.getSortingValue?.(item, prop, dataIndex)
        return value === undefined ? getPropValue(item, prop, dataIndex) : value
    }

    function applySort() {
        // update sort hint
        const sortBy = state.sortBy || []
        sortHint.textContent = state.randomSort ? 'Random' : `${sortBy.map(s => `${s.prop} ${toArrow(s.order)}`).join(', ')}`

        // sort the table rows
        if (state.randomSort) {
            tu.shuffleArray(data)
        } else if (sortBy.length > 0) {
            data.sort((a, b) => {
                for (const s of sortBy) {
                    const aValue = getSortingValue(a.item, s.prop, a.index)
                    const bValue = getSortingValue(b.item, s.prop, b.index)
                    if (aValue === bValue) continue
                    let ret = 0
                    if (aValue === undefined) ret = -1
                    else if (bValue === undefined) ret = 1
                    else if (aValue === null) ret = -1
                    else if (bValue === null) ret = 1
                    else if (typeof aValue === 'number' && typeof bValue === 'number') {
                        ret = aValue - bValue
                    } else {
                        const aText = typeof aValue === 'object' ? tu.stringify(aValue) : String(aValue)
                        const bText = typeof bValue === 'object' ? tu.stringify(bValue) : String(bValue)
                        ret = zhCollator.compare(aText, bText)
                    }
                    // console.log(`"${aValue}" vs "${bValue}" => ${ret}`)
                    if (ret !== 0) {
                        ret = s.order === 'asc' ? ret : -ret
                        return ret
                    }
                }
                return 0
            })
        } else {
            data.sort((a, b) => a.index - b.index)
        }
    }

    function syncRegionExistence() {
        // we directly remove unneeded elements in toolbar
        // rather than hiding them, so that toolbar looks cleaner (e.g. radius of borders)
        
        const showPropSelector = cfg.showPropSelector ?? true// ?? (properties.length > 1)
        const showSortButton = cfg.showSortButton ?? true
        const showFilter = cfg.showFilter ?? true// (arr.length > 1)
        const showViewToggle = renderStyles.length > 1

        syncExistence(viewToggle, showViewToggle)
        syncExistence(igPropSelector, showPropSelector)
        syncExistence(sortBtn, showSortButton)
        syncExistence(sortHint, showSortButton)
        syncExistence(filter, showFilter)
        syncExistence(filterHint, showFilter)
        syncExistence(counts, showFilter)
        syncExistence(pagerPlaceholder, !!state.pageSize)

        if (toolbar.lastElementChild) {
            (toolbar.lastElementChild as HTMLElement).classList.remove('me-2')
        }
    }

    async function selectProps() {
        const r = await showSelection('visible props for ' + state.renderStyle, allPropsWithRaw, {
            initialSelection: getVisibleProps(), 
            showOrder: true,
            styleModifier: (item, elem) => {
                if (item === rawIndexProp) {
                    elem.style.fontWeight = 'bold'
                    elem.style.borderBottom = '2px solid blue'
                }
            }
        })
        if (r === undefined) return

        if (state.renderStyle === 'table') {
            state.tableProps = r
        } else if (state.renderStyle === 'tile') {
            state.tileProps = r
        } else {
            state.wallProps = r
        }
        gotoPage(pager.currentPage)
    }

    function showSortDialog() {
        type SortSetting = VisualizeConfig<T>['sortBy'][number]
        type SortResult = { sortBy: SortSetting[], randomSort: boolean }
        return showDialog<SortResult>('Sort By', undefined, {
            actions: ['Random', 'OK', 'Cancel'],
            softDismissable: true,
            style: { width: '80vw' }
        }, (elements, finish) => {
            let sortBy = (state.sortBy || []).map(setting => ({ ...setting }))
            let randomSort = state.randomSort
            const container = createElement(elements.contentArea, 'div', ['uu-va-sort-dialog', 'd-flex', 'flex-column'])
            const statusBar = createElement(container, 'div', ['uu-va-sort-status', 'form-control', 'd-flex', 'align-items-center'])
            createElement(statusBar, 'span', ['me-2', 'text-primary'], 'Sort:')
            const selectedItems = new DraggableSortedContainer(statusBar, {
                emptyText: '(none)',
                showOrder: true,
                interactive: true,
                removable: false,
                onChange: labels => {
                    const previous = sortBy
                    sortBy = labels
                        .map(label => previous.find(setting => sortLabel(setting) === label))
                        .filter((setting): setting is SortSetting => setting !== undefined)
                    updateUI()
                }
            })
            selectedItems.root.classList.add('uu-va-sort-selected')
            const toolbar = createElement(container, 'div', ['uu-va-sort-toolbar', 'input-group', 'my-2'])
            const filter = createElement(toolbar, 'input', ['uu-va-sort-filter', 'form-control'], '', {}, { placeholder: 'Filter' })
            const properties = createElement(container, 'div', ['uu-va-sort-props', 'd-flex', 'overflow-auto', 'flex-wrap', 'gap-2', 'p-2'])
            const propertyButtons = new Map<string, { button: HTMLButtonElement, order: HTMLElement }>()
            const sortLabel = (setting: SortSetting) => `${setting.prop} ${toArrow(setting.order)}`

            function updateUI() {
                selectedItems.setStrings(sortBy.map(sortLabel))
                for (const [prop, elements] of propertyButtons) {
                    const setting = sortBy.find(item => item.prop === prop)
                    elements.button.classList.toggle('btn-primary', !!setting)
                    elements.button.classList.toggle('btn-outline-secondary', !setting)
                    elements.order.textContent = setting ? toArrow(setting.order) : ''
                }
                const randomButton = elements.buttons['Random']
                randomButton.classList.toggle('btn-warning', randomSort)
                randomButton.classList.toggle('btn-outline-secondary', !randomSort)
                randomButton.replaceChildren(fa('fa-random'), document.createTextNode(` Random: ${randomSort ? 'On' : 'Off'}`))
            }

            for (const prop of allPropsWithRaw) {
                const button = createElement(properties, 'button', ['uu-btn', 'uu-va-sort-prop', 'btn', 'btn-outline-secondary', 'd-inline-flex', 'align-items-center', 'gap-1'], '', {
                    minWidth: '100px'
                }) as HTMLButtonElement
                createElement(button, 'span', ['uu-va-sort-prop-name'], prop)
                const order = createElement(button, 'span', ['uu-va-sort-prop-order'], '', { minWidth: '1.5em' })
                propertyButtons.set(prop, { button, order })
                button.onclick = () => {
                    const index = sortBy.findIndex(setting => setting.prop === prop)
                    if (index < 0) sortBy.push({ prop, order: 'asc' })
                    else if (sortBy[index].order === 'asc') sortBy[index] = { prop, order: 'desc' }
                    else sortBy.splice(index, 1)
                    updateUI()
                }
            }
            filter.oninput = () => {
                const value = filter.value.toLowerCase()
                for (const [prop, elements] of propertyButtons) {
                    elements.button.style.display = prop.toLowerCase().includes(value) ? '' : 'none'
                }
            }
            elements.buttons['Random'].onclick = () => {
                randomSort = !randomSort
                updateUI()
            }
            elements.buttons['OK'].onclick = () => finish({ sortBy, randomSort })
            elements.buttons['Cancel'].onclick = () => finish()
            updateUI()
            try { filter.focus({ preventScroll: true }) } catch { filter.focus() }
        })
    }

    sortBtn.onclick = async () => {
        const r = await showSortDialog()
        if (r === undefined) return
        state.sortBy = r.sortBy
        state.randomSort = r.randomSort
        applySort()
        pager.gotoPage(0)
    }
    propSelectorBtn.onclick = () => selectProps()

    filterHint.style.cursor = 'pointer'
    filterHint.title = 'Show or hide property filters'
    filterHint.onclick = () => {
        state.propertyFilterExpanded = !state.propertyFilterExpanded
        propertyFilterArea.style.display = state.propertyFilterExpanded ? '' : 'none'
        propertyFilterArea.classList.toggle('uu-is-active', state.propertyFilterExpanded)
    }

    filter.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const v = filter.value
            state.filter = v
            applyFilterAndSort()
        }
    })

    const dropdownActions: Record<string, () => void | Promise<void> | Promise<unknown>> = {
        'Charts': async () => {
            const info = tu.getPropStat(arr)
            console.log('prop stat', info)
            // const goodInfo = info.filter(v => v.uniqueValues.length <= 200)
            const content = await renderDataInsights(info, cfg.onPropertyValueClick)
            showDialog<string>('Charts', content, {
                style: {
                    minWidth: '90vw',
                    minHeight: '90vh',
                }
            })
        },
        'Select Props': () => selectProps(),
        'Change Page Size': async () => {
            const v = await prompt('Page Size', 'Enter number of items per page (enter 0 or negative number to disable paging)', `${state.pageSize ?? 20}`)
            if (v) {
                const n = parseInt(v)
                if (!isNaN(n)) {
                    pager.setPageSize(n > 0 ? n : Infinity)
                    pager.gotoPage(0)
                }
            }
        },
        'View Original Data': () => {
            showJsonResult('Original Data', arr)
        }
    }
    associateDropdownActions(optionBtn, () => {
        const entries: DropdownAction[] = Object.entries(dropdownActions).map(([name, action]) => ({ name, action }))
        entries.push(
            { separator: true },
            { name: 'Select All', action: () => {
                for (const { index } of data) selectedIndexes.add(index)
                syncSelection()
            } },
            { name: 'Invert Selection', action: () => {
                for (const { index } of data) {
                    if (selectedIndexes.has(index)) selectedIndexes.delete(index)
                    else selectedIndexes.add(index)
                }
                syncSelection()
            } },
            { name: 'Clear Selection', action: () => {
                selectedIndexes.clear()
                syncSelection()
            } }
        )
        if (selectedIndexes.size > 0) {
            const selectionActions: DropdownAction[] = []
            if (selectedIndexes.size === 1) {
                const index = [...selectedIndexes][0]
                const item = arr[index]
                for (const [name, action] of Object.entries(getItemActions(item, index))) {
                    selectionActions.push({ name, action: () => runItemAction(name, () => action(item, index)) })
                }
            }
            for (const [name, action] of Object.entries(cfg.multiItemActions || {})) {
                selectionActions.push({ name, action: () => runItemAction(name, () => action(getSelectedItems())) })
            }
            if (selectedIndexes.size >= 2) {
                selectionActions.push({ name: 'Compare Selected Items', action: () => compareSelectedItems() })
            }
            if (selectionActions.length > 0) entries.push({ separator: true }, ...selectionActions)
        }
        return entries
    })

    // Load More button
    if (!cfg.loadMore) {
        loadMoreBtn.style.display = 'none'
    } else {
        loadMoreBtn.onclick = async (e) => {
            e.preventDefault()
            view.classList.add('uu-is-loading')
            try {
                const moreData = await withUI(() => cfg.loadMore!(), 'Loading more data...')
                if (moreData && moreData.length > 0) {
                    // Update arr with new data
                    arr.push(...moreData)
                    // Recreate allData and reapply filters
                    allData.length = 0
                    arr.forEach((item, index) => allData.push({ item, index }));
                    ({ allPropsWithRaw, meaningfulPropsWithRaw } = calculateProps());
                    applyFilterAndSort()
                } else {
                    loadMoreBtn.disabled = true
                }
            } catch (error) {
                console.error('Failed to load more data:', error)
                alert('加载数据失败: ' + error)
            } finally {
                view.classList.remove('uu-is-loading')
            }
        }
    }

    // logic start here
    syncRegionExistence()
    applyFilterAndSort(state.currentPage)
    return view
}