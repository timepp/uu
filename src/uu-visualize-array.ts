
import * as tu from './tu.ts'
import { 
    createElement, 
    showJsonResult, 
    createFoldedString, 
    Pager, 
    fa, 
    createToggleBar, 
    showSelection, 
    syncExistence, 
    createButton, 
    associateDropdownActions, 
    showInDialog, 
    renderDataInsights, 
    prompt
} from './uu.ts'

export type PropRenderOption<T extends object> = {
    formatter?: (item: T, prop: string, dataIndex: number) => string | HTMLElement
    style?: Partial<CSSStyleDeclaration>
    onClick?: (item: T, prop: string, dataIndex: number) => boolean
}
export type ItemAction = (item: any, dataIndex: number) => void
export type ItemActions = Record<string, ItemAction>
export type WallRenderOption<T extends object> = RenderOption<T> & {
    // Required: returns the image URL for a given item
    imageUrl: (item: T, dataIndex: number) => string
    // Fixed width of each image cell, default '200px'
    imageWidth?: string
    // Vertical gap between images in each column, default '6px'
    rowGap?: string
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
    tileRenderOption: RenderOption<T>
    wallRenderOption: WallRenderOption<T>
    
    itemActions: ItemActions | ((item: T, dataIndex: number) => ItemActions)

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

    // initial filter string, if not present, no filtering is applied
    filter: string

    // item filter, used to filter items given the filter string
    // the default filter will do a deep search on all properties of the item
    // It's recommended to provide a custom filter for better performance, if there are many large items
    // Custom filter will be disabled when the filter string is exception
    itemFilter: (item: T, filter: string) => boolean | undefined
    // If not empty, sort and prop settings will be saved to local storage with the given key
    stateKey: string

    // Optional: load more data when user clicks on the total count
    loadMore: () => Promise<T[]>
}

export function visualizeArray<T extends object>(arr: T[], cfg: Partial<VisualizeConfig<T>> = {}) {
    if (arr.length === 0) {
        return createElement(null, 'div', ['alert', 'alert-info', 'mb-0'], 'Data is empty.')
    }

    // helper functions
    const toArrow = (s: string) => s === 'asc' ? '⬆️' : '⬇️'
    const fromArrow = (s: string) => s === '⬆️' ? 'asc' : 'desc'
    const renderStyles = cfg.renderStyles || ['table', 'tile', 'wall']
    const rawIndexProp = cfg.rawIndexProp ?? '#'
    const actionProp = cfg.actionProp ?? '(Actions)'

    // persist state
    const state = tu.createObservableState(cfg.stateKey || null, {
        sortBy: (cfg.sortBy || []) as VisualizeConfig<T>['sortBy'],
        filter: cfg.filter || '',
        pageSize: cfg.pageSize,
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

    function createActionArea(item: T, index: number) {
        const actions = (typeof cfg.itemActions === 'function') ? cfg.itemActions(item, index) : (cfg.itemActions || {})
        const defaultActions = cfg.noDefaultActions ? {} : {
            raw: () => showJsonResult(`Raw data (index: ${index})`, item)
        }
        const allActions = { ...defaultActions, ...actions }
        const container = createElement(null, 'div', ['d-flex', 'gap-2'])
        for (const [name, action] of Object.entries(allActions)) {
            const btn = createElement(container, 'a', ['me-2'], name)
            btn.style.cursor = 'pointer'
            btn.onclick = () => action(item, index)
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
                    return JSON.stringify(v) !== JSON.stringify(firstValue)
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
        const viewOption = getActiveViewRenderOption()
        const props = stateProps || viewOption?.props || cfg.renderOption?.props || meaningfulPropsWithRaw
        if (actionProp && !props.includes(actionProp)) {
            props.push(actionProp)
        }
        return props
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

    function attachItemClickHandler(item: T, index: number, element: HTMLElement) {
        const viewOption = getActiveViewRenderOption()
        const onItemClickFallbackChain = [
            viewOption?.onItemClick,
            cfg.renderOption?.onItemClick
        ].filter(v => !!v) as ((item: T, dataIndex: number) => Promise<boolean|undefined>)[]
        if (onItemClickFallbackChain.length === 0) return
        element.onclick = async (evt) => {
            evt.stopPropagation()
            for (const onItemClickHandler of onItemClickFallbackChain) {
                const handled = await onItemClickHandler(item, index)
                if (handled !== false) break
            }
        }
        element.style.cursor = 'pointer'
    }

    function tableRenderer(startIndex: number, endIndex: number) {
        const table = createElement(null, 'table', ['table', 'table-bordered', 'table-hover', 'mb-0'])
        const tbody = createElement(table, 'tbody')
        const sortBy = state.sortBy || []

        // thead
        const thead = createElement(table, 'thead', ['bg-light'])
        const tr = createElement(thead, 'tr', [])
        for (const prop of getVisibleProps()) {
            const th = createElement(tr, 'th')
            createElement(th, 'span', [], prop)
            const i = sortBy.findIndex(s => s.prop === prop)
            if (i >= 0) {
                const s = sortBy[i]
                createElement(th, 'span', [], toArrow(s.order))
                if (sortBy.length > 1) {
                    createElement(th, 'span', [], `${i + 1}`, { verticalAlign: 'super', fontSize: '0.8em' })
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
                gotoPage(0)
            }
        }

        for (let i = startIndex; i < endIndex; i++) {
            let tr = renderItem(data[i].item, data[i].index)
            if (!tr) {
                // create row in the default way
                tr = createElement(null, 'tr', [], '', getItemStyle(data[i].item, data[i].index))
                for (const [j, prop] of getVisibleProps().entries()) {
                    const td = createElement(tr, 'td')
                    const element = renderPropValue(data[i].item, prop, data[i].index)
                    td.appendChild(element)
                }
            }
            attachItemClickHandler(data[i].item, data[i].index, tr)
            tbody.appendChild(tr)
        }
        return table
    }

    function tileRenderer(startIndex: number, endIndex: number) {
        const container = createElement(null, 'div', [], '', {
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))'
        })

        for (let i = startIndex; i < endIndex; i++) {
            const item = data[i].item
            const dataIndex = data[i].index
            let card = renderItem(data[i].item, data[i].index)
            if (!card) {
                card = createElement(null, 'div', ['card', 'p-1', 'hover-effect'], '')

                // const cardBody = createElement(card, 'div', ['card-body', 'd-flex', 'flex-column', 'gap-2'])
                for (const [j, prop] of getVisibleProps().entries()) {
                    if (!getPropValue(item, prop, dataIndex)) continue
                    const row = createElement(card, 'div', [])
                    if (prop !== actionProp) {
                        createElement(row, 'span', [], `${prop}: `, { opacity: '0.35' })
                    }
                    createElement(row, 'span', [], renderPropValue(item, prop, dataIndex))
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
        const container = createElement(null, 'div', [], '', {
            columnWidth: imageWidth,
            columnGap: rowGap
        })

        for (let i = startIndex; i < endIndex; i++) {
            const item = data[i].item
            const dataIndex = data[i].index

            const imgUrl = wallOption?.imageUrl(item, dataIndex) ?? ''

            // wrapper needs relative positioning for the overlay
            const wrapper = createElement(container, 'div', [], '', {
                position: 'relative',
                overflow: 'hidden',
                lineHeight: '0',
                marginBottom: rowGap
            })
            Object.assign(wrapper.style, getItemStyle(item, dataIndex) || {})

            const img = createElement(wrapper, 'img', [], '', {
                width: '100%',
                height: 'auto',
                display: 'block'
            }) as HTMLImageElement
            img.src = imgUrl
            img.loading = 'lazy'

            // semi-transparent hover overlay listing visible prop values
            const overlay = createElement(wrapper, 'div', [], '', {
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
                const row = createElement(overlay, 'div', [])
                createElement(row, 'span', [], `${prop}: `, { fontWeight: 'bold', opacity: '0.75' })
                createElement(row, 'span', [], renderPropValue(item, prop, dataIndex))
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

    // data is filtered view of arr
    const allData = arr.map((item, index) => ({item, index}))
    let data = allData
    const pager = new Pager(data.length, state.pageSize || Infinity, (page) => gotoPage(page))
    const pagerElem = pager.getElement()

    // overall dom
    const view = createElement(null, 'div', ['border', 'p-2'])
    const toolbar = createElement(view, 'div', ['d-flex', 'gap-1', 'mb-2'])
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
    viewToggle.classList.add('flex-shrink-0')
    toolbar.appendChild(viewToggle)
    const igPropSelector = createElement(toolbar, 'div', ['input-group', 'w-auto', 'flex-shrink-0'])
    const propSelectorBtn = createElement(igPropSelector, 'button', ['btn', 'btn-outline-secondary'], fa('fa-eye'))
    const igSort = createElement(toolbar, 'div', ['input-group', 'w-auto', 'flex-shrink-0'])
    const sortBtn = createElement(igSort, 'button', ['btn', 'btn-outline-secondary'], fa('fa-sort'))
    const sortHint = createElement(igSort, 'span', ['input-group-text'])
    const randomSortBtn = createButton(igSort, ['btn', 'btn-outline-secondary'], fa('fa-random'))
    const igFiler = createElement(toolbar, 'div', ['input-group', 'flex-grow-1'])
    const filterHint = createElement(igFiler, 'span', ['input-group-text'], fa('fa-filter'))
    const filter = createElement(igFiler, 'input', ['form-control'], '')
    const counts = createElement(igFiler, 'span', ['input-group-text'], '20 / 100')
    const pagerPlaceholder = createElement(toolbar, 'div', [])
    const loadMoreBtn = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], fa('fa-plus'))
    const optionBtn = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], fa('fa-bars'))
    const dataContainer = createElement(view, 'div')

    toolbar.replaceChild(pagerElem, pagerPlaceholder)
    filter.value = state.filter || ''

    function gotoPage(page: number) {
        // only visible rows falling into the current page are shown, all others are hidden
        const {startIndex, endIndex} = pager.getPageRange(page)
        console.log(`goto page ${page}, show items from ${startIndex} to ${endIndex}`)
        dataContainer.innerHTML = ''
        dataContainer.appendChild(getRenderer()(startIndex, endIndex))
    }

    function applyFilterAndSort() {
        applyFilter(state.filter || '')
        applySort()
        pager.gotoPage(0)
    }

    function applyFilter(s: string) {
        let hasFilterError = false
        s = s.trim()
        if (s === '') {
            data = allData
        } else {
            const isExpr = /[><]|===?|!==?|&&|\|\||\.\w+\(/.test(s)
            if (isExpr) {
                // advanced filter, we compile this as a function
                const funcCode = `with (item) { return (${s}) }`
                console.log('compile filter function with code:', funcCode)
                try {
                    const filterFunc = new Function('item', funcCode) as (item: T) => boolean
                    data = allData.filter(v => {
                        try {
                            return filterFunc(v.item)
                        } catch (e) {
                            return false
                        }
                    })
                } catch (e) {
                    console.error('invalid filter code', e)
                    hasFilterError = true
                    data = []
                }
            } else {
                data = allData
                const itemFilter = (item: T, filter: string) => {
                    const r = cfg.itemFilter ? cfg.itemFilter(item, filter) : undefined
                    if (r !== undefined) return r
                    return tu.fuzzyFind(item, filter, false) !== null
                }
                for (const c of s.split(' ')) {
                    data = data.filter(v => itemFilter(v.item, c))
                }
            }
        }
        updateCountsDisplay()
        pager.setTotalItems(data.length)
        filter.style.backgroundColor = hasFilterError ? '#ffcccc' : (data.length < arr.length ? '#ccffcc' : '')
    }

    const zhCollator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base' })

    function updateCountsDisplay() {
        counts.innerHTML = ''
        createElement(counts, 'span', [], `${data.length} / ${arr.length}`)
    }

    function applySort() {
        // update sort hint
        const sortBy = state.sortBy || []
        sortHint.textContent = `${sortBy.map(s => `${s.prop} ${toArrow(s.order)}`).join(', ')}`

        // sort the table rows
        if (sortBy.length > 0) {
            data.sort((a, b) => {
                for (const s of sortBy) {
                    const aValue = getPropValue(a.item, s.prop, a.index)
                    const bValue = getPropValue(b.item, s.prop, b.index)
                    if (aValue === bValue) continue
                    let ret = 0
                    if (aValue === undefined) ret = -1
                    else if (bValue === undefined) ret = 1
                    else if (aValue === null) ret = -1
                    else if (bValue === null) ret = 1
                    else if (typeof aValue === 'number' && typeof bValue === 'number') {
                        ret = aValue - bValue
                    } else {
                        ret = zhCollator.compare(`${aValue}`, `${bValue}`)
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
        syncExistence(randomSortBtn, showSortButton)
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

    sortBtn.onclick = async () => {
        // construct all properties
        const allOptions = allPropsWithRaw.map(p => [`${p} ${toArrow('asc')}`, `${p} ${toArrow('desc')}`]).flat()
        const sortOptions = state.sortBy?.map(s => `${s.prop} ${toArrow(s.order)}`)
        const checker = (oldSelection: string[], newSelection: string[]) => {
            if (newSelection.length > oldSelection.length) {
                // a new sort is added, we will make sure to remove old duplicates if there is
                const item = newSelection[newSelection.length - 1]
                const key = item.split(' ')[0]
                return oldSelection.filter(s => s.split(' ')[0] !== key).concat([item])
            }
            return newSelection
       }
        const r = await showSelection('Sort By', allOptions, {showOrder: true, initialSelection: sortOptions, checker})
        if (r === undefined) return
        state.sortBy = r.map(s => {
            const [prop, order] = s.split(' ')
            return {prop, order: fromArrow(order) as 'asc' | 'desc'}
        })
        applySort()
        gotoPage(0)
    }
    propSelectorBtn.onclick = () => selectProps()

    randomSortBtn.onclick = () => {
        state.sortBy = []
        tu.shuffleArray(data)
        sortHint.textContent = `Random`
        gotoPage(0)
    }
    filter.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const v = filter.value
            state.filter = v
            applyFilterAndSort()
        }
    })

    associateDropdownActions(optionBtn, {
        'Insights': async () => {
            const info = tu.getDataInsights(arr)
            console.log('data insights', info)
            // const goodInfo = info.filter(v => v.uniqueValues.length <= 200)
            showInDialog('Data Insights', await renderDataInsights(info))
        },
        'Select Props': () => selectProps(),
        'Change Page Size': async () => {
            const v = await prompt('Page Size', 'Enter number of items per page (enter 0 or negative number to disable paging)', `${state.pageSize || cfg.pageSize || 20}`)
            if (v) {
                const n = parseInt(v)
                if (!isNaN(n)) {
                    state.pageSize = n > 0 ? n : undefined
                    pager.setPageSize(state.pageSize || Infinity)
                    pager.gotoPage(0)
                }
            }
        },
        'View Original Data': () => {
            showJsonResult('Original Data', arr)
        }
    })

    // Load More button
    if (!cfg.loadMore) {
        loadMoreBtn.style.display = 'none'
    } else {
        loadMoreBtn.onclick = async (e) => {
            e.preventDefault()
            try {
                const moreData = await cfg.loadMore!()
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
            }
        }
    }

    // logic start here
    syncRegionExistence()
    applyFilterAndSort()
    return view
}