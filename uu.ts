// uu: a set of utility functions for modern web UI
// hash: a6bc88fddfdde0339e774ae46344c50ed9a1e5cef511ed266986b5af08e86197
// Please do not modify this file directly. Use the following command to update this file on a deno environment:
// deno run -A --reload jsr:@timepp/uu

function traverseObjectInternal(obj: any, maxdepth: number, callback: (path: string[], value: any, type: 'object'|'leaf'|'loop') => void, path: string[], seenObjects: Set<object>): void {
    if (typeof obj !== 'object' || obj === null) {
        callback(path, obj, 'leaf');
        return;
    }

    if (seenObjects.has(obj)) {
        callback(path, obj, 'loop');
    } else {
        seenObjects.add(obj);
        callback(path, obj, 'object');
        if (path.length >= maxdepth) return;
        for (const key in obj) {
            traverseObjectInternal(obj[key], maxdepth, callback, [...path, key], seenObjects);
        }
    }
}

export function traverseObject(obj: any, maxdepth: number, callback: (path: string[], value: any, type: 'object'|'leaf'|'loop') => void): void {
    const seenObjects = new Set<object>()
    traverseObjectInternal(obj, maxdepth, callback, [], seenObjects)
}

// used in json.stringify
export function getStringifyReplacer(limit: {maxStringLength?: number, maxArraySize?:number} = {}) {
    const seen = new WeakMap<object, string>()
    return (key, value) => {
        // circular detection
        if (typeof value === "object" && value !== null) {
            const previousKey = seen.get(value)
            if (previousKey) {
                return `<<circular ref to ${previousKey}>>`
            }
            seen.set(value, key)
        }

        // string length limit
        if (typeof value === 'string' && limit.maxStringLength && value.length > limit.maxStringLength) {
            return `${value.slice(0, limit.maxStringLength - 12)} …${value.length - limit.maxStringLength + 12} more chars…`
        }

        // array size limit
        // maxArraySize 10 => <9 items> -> <10 items> -> <9 items> ... 2 more items ...
        if (Array.isArray(value) && limit.maxArraySize && value.length > limit.maxArraySize) {
            return value.slice(0, limit.maxArraySize - 1).concat(`…${value.length - limit.maxArraySize + 1} more items…`)
        }

        return value
    }
}

export function dataProperties(arr: object[]) {
    const propSet = new Set<string>()
    for (const item of arr) {
        for (const key in item) {
            propSet.add(key)
        }
    }
    return [...propSet]
}

/// get time as YYYY-MM-DD HH:mm:ss
/// timeZoneOffset is in minutes, e.g. 
//     -480: for UTC+8
//     480: for UTC-8
//     0: for UTC
//     undefined: for local device timezone (so the result can be different on different devices)
export function formatTime(d: Date, timeZoneOffset?: number) {
    const t = d.getTime()
    const date = new Date(t - (timeZoneOffset??d.getTimezoneOffset()) * 60 * 1000)
    return date.toISOString().slice(0, 19).replace('T', ' ')
}

export function formatFloat(n: number, digits = 2, mininumDigits = 0) {
    return n.toLocaleString(undefined, { 
        minimumFractionDigits: mininumDigits, 
        maximumFractionDigits: digits,
        useGrouping: false,
    })
}

// catch all excpetion and return a default value if error occurs
export function safeExecute<T>(fn: () => T, defaultValue: T | ((e: unknown) => T)) {
    try {
        return fn()
    } catch (e) {
        if (typeof defaultValue === 'function') {
            return (defaultValue as (e: unknown) => T)(e)
        } else {
            return defaultValue
        }
    }
}

function createState<T extends object>(object: T, properties: (keyof T)[], stateKey?: string) {
    // 内部存储的状态对象
    const internalState: Partial<T> = {};

    // 初始化 internalState，只包含指定的属性
    properties.forEach((prop) => {
        if (prop in object) {
            internalState[prop] = object[prop];
        }
    });

    // 定义代理对象
    const state = new Proxy(internalState, {
        get(target: Partial<T>, prop: string | symbol, receiver: any) {
            // 将 prop 转换为 keyof T 类型，并检查是否在 properties 中
            const key = prop as keyof T;
            if (properties.includes(key)) {
                return target[key];
            }
            throw new Error(`Property '${String(prop)}' is not managed by this state`);
            // return undefined; // 未指定的属性返回 undefined
        },
        set(target: Partial<T>, prop: string | symbol, value: any) {
            // 将 prop 转换为 keyof T 类型，并检查是否在 properties 中
            const key = prop as keyof T;
            if (properties.includes(key)) {
                target[key] = value;
                saveState();
                return true;
            }
            throw new Error(`Property '${String(prop)}' is not managed by this state`);
        }
    }) as Pick<T, typeof properties[number]>;

    // 加载状态
    function loadState() {
        if (!stateKey) return;
        const stored = localStorage.getItem(stateKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            properties.forEach((prop) => {
                if (prop in parsed) {
                    internalState[prop] = parsed[prop];
                }
            });
        }
    }

    // 保存状态
    function saveState() {
        if (!stateKey) return;
        const persistState: Partial<T> = {};
        properties.forEach((prop) => {
            persistState[prop] = internalState[prop];
        });
        localStorage.setItem(stateKey, JSON.stringify(persistState));
    }

    // 加载初始状态
    loadState();

    return state;
}

/// break text into pieces by given regex matchers
/// each piece is attached with a category
/// return: {content, category}[] that covers the whole text
export function segmentByRegex(text: string, hc: [RegExp, string][]) {
    const matches: { index: number; length: number; content: string; category: string }[] = [];

    // 收集所有匹配项，按照优先级从高到低处理
    for (const [re, category] of hc) {
        for (const match of text.matchAll(re)) {
            if (match.index !== undefined) {
                const matchStart = match.index;
                const matchEnd = matchStart + match.length;

                // 检查是否与已有匹配项重叠
                let overlap = false;
                for (const existingMatch of matches) {
                    const existingStart = existingMatch.index;
                    const existingEnd = existingStart + existingMatch.length;
                    if ((matchStart < existingEnd && matchEnd > existingStart)) {
                        overlap = true;
                        break;
                    }
                }

                // 如果没有重叠，添加到匹配项列表
                if (!overlap) {
                    matches.push({ index: match.index, length: match[0].length, content: match[0], category });
                }
            }
        }
    }

    // 按 `index` 从小到大排序，确保匹配顺序正确
    matches.sort((a, b) => a.index - b.index);
    console.log(matches)
    
    // run through the text and create pieces
    const pieces: { content: string, category: string }[] = [];
    let lastIndex = 0;
    for (const match of matches) {
        const { index, length, content, category } = match;
        if (lastIndex < index) {
            pieces.push({content: text.slice(lastIndex, index), category: ''});
        }
        pieces.push({content, category});
        lastIndex = index + length;
    }
    if (lastIndex < text.length) {
        pieces.push({content: text.slice(lastIndex), category: ''});
    }
    return pieces;
}

/// highlight json text with the following constructs:
/// - key: "key":
/// - string: "string"
/// - number: 123
/// - boolean: true/false
/// - null: null
/// - punctuation: {, }, [, ], :, ,
export function segmentJson(text: string) {
    return segmentByRegex(text, [
        [/"[^"]+":/g, 'key'],
        [/"(?:[^"\\]|\\.)*"/g, 'string'], // 支持转义的字符串匹配
        [/\d+/g, 'number'],
        [/true/g, 'true'],
        [/false/g, 'false'],
        [/null/g, 'null'],
        [/[{}[\]:,]/g, 'punctuation'],
    ]) as {
        content: string,
        category: 'key' | 'string' | 'number' | 'true' | 'false' | 'null' | 'punctuation' | ''
    }[]
}

export function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export function derivedUrl(oldUrl: string, paramsToAdd: Record<string, string>, paramsToRemove?: RegExp) {
    const url = new URL(oldUrl)
    if (paramsToRemove) {
        const keys = [...url.searchParams.keys()]
        for (const key of keys) {
            if (paramsToRemove.test(key)) {
                url.searchParams.delete(key)
            }
        }
    }
    for (const [key, value] of Object.entries(paramsToAdd)) {
        url.searchParams.set(key, value)
    }
    return url.toString()
}

export function derivedCurrentUrl(paramsToAdd: Record<string, string>, paramsToRemove?: RegExp) {
    return derivedUrl(window.location.href, paramsToAdd, paramsToRemove)
}

export function createElement<K extends keyof HTMLElementTagNameMap>(parent: Element | null, tagName: K, classes: string[] = [], text?: string, style: Partial<CSSStyleDeclaration> = {}) {
    const e = document.createElement(tagName)
    e.classList.add(...classes)
    if (parent) parent.appendChild(e)
    if (text) e.textContent = text
    for (const [key, value] of Object.entries(style)) {
        if (value !== undefined) {
            e.style[key as any] = value as string
        }
    }
    return e
}

export function forEachTableCell(table: HTMLTableElement, callback: (cell: HTMLTableCellElement, row: number, col: number) => void) {
    // row: 0 is header, 1 is first row
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i]
        for (let j = 0; j < row.cells.length; j++) {
            const cell = row.cells[j]
            callback(cell, i, j)
        }
    }
}

export async function callAsyncFunctionWithProgress<T>(fn: () => Promise<T>) {
    const dialog = createElement(document.body, 'dialog', [])
    const dc = createElement(dialog, 'div', [])
    dc.style.textAlign = "center"
    createElement(dc, 'h4', ['m-2'], 'Please wait...')
    // show a centered spinner
    createElement(dc, 'div', ['spinner-border', 'text-primary'], '')
    dialog.showModal()
    try {
        const r = await fn()
        dialog.close()
        dialog.remove()
        return r
    } catch (e) {
        dialog.close()
        dialog.remove()
        throw e
    }
}

export function highlightText(text: string, rules: [RegExp, string][]) {
    const parts = segmentByRegex(text, rules)
    return parts.map(part => {
        const span = createElement(null, 'span', [], part.content)
        if (part.category) {
            span.style.color = part.category
        }
        return span
    })
}

export function createJsonView(content: string) {
    const parts = segmentJson(content)
    const pre = createElement(null, 'pre', [])

    for (const part of parts) {
        const span = createElement(pre, 'span')
        span.textContent = part.content
        switch (part.category) {
            case 'key': span.style.color = 'blue'; break
            // case 'string': span.style.color = 'purple'; break
            case 'number': span.style.color = '#f439e6'; break
            case 'true': span.style.color = 'green'; break
            case 'false': span.style.color = 'red'; break
            case 'null': span.style.backgroundColor = 'yellow'; break
            case 'punctuation': span.style.fontWeight = "800"; break
        }
    }

    return pre
}

export function showInDialog(title: string, content: HTMLElement) {
    const dialog = createElement(document.body, 'dialog', [], '', {minWidth: '50vw'})
    const dc = createElement(dialog, 'div', [])
    const header = createElement(dc, 'div', [])
    header.style.textAlign = "center"
    createElement(header, 'h2', [], title)
    createElement(dc, 'hr', [])

    dc.appendChild(content)

    createElement(dc, 'hr', [])
    const footer = createElement(dc, 'div', ['d-flex', 'justify-content-center'])
    const closeButton = createElement(footer, 'button', ['btn', 'btn-primary'], 'Close')
    closeButton.onclick = () => {
        dialog.close()
        dialog.remove()
    }
    dialog.showModal()
    return dialog
}

export function showLargeJsonResult(title: string, content: string) {
    const obj = JSON.parse(content)
    const trimmedContent = JSON.stringify(obj, getStringifyReplacer({maxStringLength: 80, maxArraySize: 20}), 2)
    const main = createElement(null, 'pre', [])
    const spans = highlightText(trimmedContent, [[/"[^"]+":/g, 'blue'], [/…[0-9]+ more (chars|items)…/g, 'red']])
    main.append(...spans)
    showInDialog(title, main)
}

export type SelectOption = {
    singleSelect: boolean
    preserveOrder: boolean
    initialSelection: string[]

    // return `newSelection` if the new selection is valid
    // otherwise, return a selection if checker can fix invalid selection
    // otherwise, return an error message
    checker: (oldSelection: string[], newSelection: string[]) => string[] | string
}

export async function showSelection(title: string, data: string[], options: Partial<SelectOption>) {
    const dialog = createElement(document.body, 'dialog', [], '', {width: '80vw'})
    const dc = createElement(dialog, 'div', ['d-flex', 'flex-column'])
    const header = createElement(dc, 'div', [])
    createElement(header, 'h2', [], title)
    const selectedContent = createElement(dc, 'div', [])
    // createElement(dc, 'hr', ['w-100'])
    const toolbar = createElement(dc, 'div', ['btn-group', 'mb-2', 'mt-2'])
    const selectAllBtn = createElement(toolbar, 'button', ['btn', 'btn-primary', 'me-2'], 'Select All')
    const deselectAllBtn = createElement(toolbar, 'button', ['btn', 'btn-primary', 'me-2'], 'Deselect All')
    if (options.singleSelect) {
        selectAllBtn.classList.add('d-none')
        deselectAllBtn.classList.add('d-none')
    }
    // filter text
    const filter = createElement(dc, 'input', ['form-control', 'mt-2', 'mb-2'])
    filter.placeholder = "Filter"
    
    const main = createElement(dc, 'div', ['d-flex', 'overflow-auto', 'flex-wrap'])
    createElement(dc, 'hr', ['w-100'])
    const alert = createElement(dc, 'div', ['alert', 'alert-danger', 'd-none'])
    const footer = createElement(dc, 'div', ['d-flex', 'justify-content-center'])
    const okBtn = createElement(footer, 'button', ['btn', 'btn-primary', 'me-2'], 'OK')

    let selected = options.initialSelection || []

    function syncSelected() {
        selectedContent.innerHTML = ''
        createElement(selectedContent, 'span', ['m-1'], 'Selected: ', {color: 'blue'})
        for (let i = 0; i < selected.length; i++) {
            const item = selected[i]
            const text = options.preserveOrder ? `${i + 1}: ${item}` : item
            createElement(selectedContent, 'span', ['m-1'], text)
        }

        for (const item of main.children) {
            const span = item as HTMLSpanElement
            const isItemSelected = selected.includes(item.textContent!)
            span.classList.toggle('selected', isItemSelected)
            span.style.backgroundColor = isItemSelected ? 'rgba(0, 123, 255, 0.5)' : 'rgb(244, 244, 244)'
        }
    }

    for (const item of data) {
        const span = createElement(main, 'span', ['multi-select', 'rounded-1', 'p-1', 'm-1'], item)
        span.style.cursor = "pointer"
        span.onclick = () => {
            const oldSelection = [...selected]
            const newSelection = options.singleSelect ? [item] : (selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item])
            const r = options.checker?.(oldSelection, newSelection)
            if (typeof r === 'string') {
                // invalid state
                alert.textContent = r
                alert.classList.remove('d-none')
                okBtn.disabled = true
                selected = newSelection
            } else {
                // fixed state
                selected = r || newSelection
                alert.classList.add('d-none')
                okBtn.disabled = false
            }
            syncSelected()
        }
    }

    filter.oninput = () => {
        const v = filter.value.toLowerCase()
        for (const item of main.children) {
            if (item.textContent?.toLowerCase().includes(v)) {
                item.classList.remove('d-none')
            } else {
                item.classList.add('d-none')
            }
        }
    }

    let resolver: ((value: string[]|undefined) => void)
    const promise = new Promise<string[]|undefined>((resolve, reject) => {
        resolver = resolve
    })

    selectAllBtn.onclick = () => {
        selected = options.preserveOrder ? data : [...data]
        alert.classList.add('d-none')
        okBtn.disabled = false
        syncSelected()
    }

    deselectAllBtn.onclick = () => {
        selected = []
        alert.classList.add('d-none')
        okBtn.disabled = false
        syncSelected()
    }

    okBtn.onclick = () => {
        dialog.close()
        dialog.remove()
        resolver(selected)
    }

    // handle esc key to close the dialog
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dialog.close()
            dialog.remove()
            resolver(undefined)
        }
    })

    syncSelected()
    dialog.showModal()
    return promise
}

export type TableColumnProperty = {
    formater?: (value: any) => string | HTMLElement
    style?: Partial<CSSStyleDeclaration>
}
export type TablePresentation = {
    columnProperties: Record<string, TableColumnProperty>

    // If not empty, raw index will be shown in the first column with the given name
    // note: this column can be hide / sort as well
    // typical usages is passing a '#' here
    rawIndexColumn: string

    // if present, paging will be enabled
    // if not present, all rows will be shown
    pageSize: number

    // use this with caution, as the column width might change due to the combination effect of sorting+paging
    // For example, you click a column header, 
    //    the data in current page are changed
    //    all columns are resized to fit the new data
    //    the column header under your mouse is changed to another one
    //    you wanted to sort in reverse order, so you click at the same position again
    //    but the column header is different now
    // To avoid this, either: set all column width explicitly, or disable paging
    // There will always be a sort dialog no matter what is option is
    enableSortByClickingColumnHeader: boolean

    onCellClick: (item: any, prop: string, dataIndex: number) => void

    columns: string[]
    sortBy: {
        column: string
        order: 'asc' | 'desc'
    }[]
    // If not empty, sort and column settings will be saved to local storage with the given key
    stateKey: string
}

export function createTableFromArray(arr: any[], presentation: Partial<TablePresentation> = {}) {
    // helper functions
    const toArrow = (s: string) => s === 'asc' ? '⬆️' : '⬇️'
    const fromArrow = (s: string) => s === '⬆️' ? 'asc' : 'desc'
    const defaultColumnFormater = (value: any) => {
        if (typeof value === 'object' && value !== null) {
            return safeExecute(() => JSON.stringify(value, null, 2), e => `${e}`)
        } else {
            return value || ''
        }
    }
    
    // overall dom
    const view = createElement(null, 'div')
    const toolbar = createElement(view, 'div', ['input-group', 'mb-3'])
    const fieldSelect = createElement(toolbar, 'button', ['btn', 'btn-primary', 'me-2'], 'Columns')
    const sortBtn = createElement(toolbar, 'button', ['btn', 'btn-primary'], 'Sort')
    const sortHint = createElement(toolbar, 'span', ['input-group-text', 'me-2'], '')
    createElement(toolbar, 'span', ['input-group-text'], 'Filter')
    const filter = createElement(toolbar, 'input', ['form-control'], '')
    const counts = createElement(toolbar, 'span', ['input-group-text'], '20 / 100')

    // now paging section, which looks like 4 buttons and an edit: "<< < [8] > >>
    const paging = createElement(toolbar, 'div', ['btn-group'])
    const firstBtn = createElement(paging, 'button', ['btn', 'btn-primary', 'ms-2'], '<<')
    const prevBtn = createElement(paging, 'button', ['btn', 'btn-primary'], '<')
    const pageText = createElement(paging, 'button', ['btn', 'btn-secondary'], '20 * 2/5')
    const nextBtn = createElement(paging, 'button', ['btn', 'btn-primary'], '>')
    const lastBtn = createElement(paging, 'button', ['btn', 'btn-primary'], '>>')


    const table = createElement(view, 'table', ['table', 'table-bordered', 'table-hover'])
    const thead = createElement(table, 'thead')
    const tbody = createElement(table, 'tbody')

    // local states
    const properties = [presentation.rawIndexColumn, ...dataProperties(arr)].filter(Boolean) as string[]
    let currentPage = 0 // page won't be persisted
    let totalVisible = 0 // total visible rows, used for paging
    const state = createState(presentation, ['columns', 'sortBy'], presentation.stateKey)

    type Row = HTMLTableRowElement & { rawIndex: number }
    
    function constructTable() {
        const tr = createElement(thead, 'tr', [])
        for (const prop of properties) {
            const th = createElement(tr, 'th', [], prop)
            if (presentation.enableSortByClickingColumnHeader) {
                th.style.cursor = 'pointer'
                th.style.userSelect = 'none'
                th.onclick = () => {
                    const s = state.sortBy?.find(s => s.column === prop)
                    if (s) {
                        if (s.order === 'asc') {
                            state.sortBy = [{column: prop, order: 'desc'}]
                        } else if (s.order === 'desc') {
                            state.sortBy = []
                        }
                    } else {
                        state.sortBy = [{column: prop, order: 'asc'}]
                    }
                    applySort()
                }
            }
        }
    
        // create the table body
        for (const [i, item] of arr.entries()) {
            const tr = createElement(tbody, 'tr', []);
            (tr as Row).rawIndex = i
            for (const [j, prop] of properties.entries()) {
                const td = createElement(tr, 'td', [], '', presentation.columnProperties?.[prop]?.style)
                const v = item[prop]
                const formater = presentation.columnProperties?.[prop]?.formater || defaultColumnFormater
                const formattedValue = (prop === presentation.rawIndexColumn)? `${i+1}` : formater(v)
                if (typeof formattedValue === 'string') {
                    td.textContent = formattedValue
                }
                else if (formattedValue instanceof HTMLElement) {
                    td.appendChild(formattedValue)
                }

                if (presentation.onCellClick) {
                    td.onclick = () => {
                        presentation.onCellClick!(item, prop, i)
                    }
                }
            }
        }
    }

    function gotoPage(page: number) {
        const pageSize = presentation.pageSize || Infinity
        const lastPage = Math.floor(totalVisible / pageSize)
        if (page < 0) page = 0
        if (page > lastPage) page = lastPage
        currentPage = page
        applyPaging()
    }

    function applyPaging() {
        const pageSize = presentation.pageSize || Infinity
        // only visible rows falling into the current page are shown, all others are hidden
        let pos = 0
        for (const row of tbody.children) {
            const r = row as Row

            if (r.classList.contains('invisible')) {
                r.classList.toggle('d-none', true)
                continue
            }

            const page = Math.floor(pos / pageSize)
            if (page === currentPage) {
                r.classList.toggle('d-none', false)
            } else {
                r.classList.toggle('d-none', true)
            }
            pos++
        }
        pageText.textContent = `${currentPage + 1} / ${Math.ceil(totalVisible / presentation.pageSize!)}`
        if (!presentation.pageSize) {
            paging.classList.add('d-none')
        }
    }

    function applyFilter(s: string) {
        totalVisible = 0
        let total = 0
        for (const item of tbody.children) {
            let meet = false
            for (const cell of item.children) {
                if (cell.textContent?.toLowerCase().includes(s)) {
                    meet = true
                    break
                }
            }
            total++
            totalVisible += (meet ? 1 : 0)
            item.classList.toggle('invisible', !meet)
        }
        counts.textContent = `${totalVisible} / ${total}`
        currentPage = 0
    }

    function showhideColumns() {
        forEachTableCell(table, (cell, row, col) => {
            cell.style.display = (state.columns??properties).includes(properties[col]) ? '' : 'none'
        })
    }

    function applySort() {
        // update sort hint
        const sortBy = state.sortBy || []
        sortHint.textContent = `${sortBy.map(s => `${s.column} ${toArrow(s.order)}`).join(', ')}`
        
        // update table header to show sort & order
        for (const [index, prop] of properties.entries()) {
            const th = thead.children[0].children[index] as HTMLTableCellElement
            th.innerHTML = '' // clear the header content
            createElement(th, 'span', [], prop)
            const i = sortBy.findIndex(s => s.column === prop)
            if (i >= 0) {
                const s = sortBy[i]
                createElement(th, 'span', [], toArrow(s.order))
                if (sortBy.length > 1) {
                    createElement(th, 'span', [], `${i + 1}`, {verticalAlign: 'super', fontSize: '0.8em'})
                }
            }
        }

        // sort the table rows
        const rows = Array.from(tbody.children) as Row[]
        if (sortBy.length > 0) {
            rows.sort((a, b) => {
                for (const s of sortBy) {
                    const aValue = (s.column === presentation.rawIndexColumn)? a.rawIndex : arr[a.rawIndex][s.column]
                    const bValue = (s.column === presentation.rawIndexColumn)? b.rawIndex : arr[b.rawIndex][s.column]
                    if (aValue < bValue) return s.order === 'asc' ? -1 : 1
                    if (aValue > bValue) return s.order === 'asc' ? 1 : -1
                }
                return 0
            })
        } else {
            rows.sort((a, b) => a.rawIndex - b.rawIndex)
        }

        tbody.innerHTML = ''
        tbody.append(...rows)
        applyPaging()
    }

    fieldSelect.onclick = async () => {
        const r = await showSelection('Select Fields', properties, {initialSelection: state.columns??properties})
        if (r === undefined) return

        // Select all means not just select all this time, but for future as well
        // TODO: find a more descriptive way
        state.columns = (r.length === properties.length)? undefined : r
        showhideColumns()
    }

    sortBtn.onclick = async () => {
        // construct all properties
        const allOptions = properties.map(p => [`${p} ${toArrow('asc')}`, `${p} ${toArrow('desc')}`]).flat()
        const sortOptions = state.sortBy?.map(s => `${s.column} ${toArrow(s.order)}`)
        const checker = (oldSelection: string[], newSelection: string[]) => {
            if (newSelection.length > oldSelection.length) {
                // a new sort is added, we will make sure to remove old duplicates if there is
                const item = newSelection[newSelection.length - 1]
                const key = item.split(' ')[0]
                return oldSelection.filter(s => s.split(' ')[0] !== key).concat([item])
            }
            return newSelection
       }
        const r = await showSelection('Sort By', allOptions, {preserveOrder: true, initialSelection: sortOptions, checker})
        if (r === undefined) return
        state.sortBy = r.map(s => {
            const [column, order] = s.split(' ')
            return {column, order: fromArrow(order) as 'asc' | 'desc'}
        })
        applySort()
    }

    filter.oninput = () => {
        const v = filter.value.toLowerCase()
        applyFilter(v)
        applyPaging()
    }

    pageText.onclick = () => {
        const page = Number(prompt('Page size', `${presentation.pageSize || 20}`))
        gotoPage(page - 1)
    }
    firstBtn.onclick = () => gotoPage(0)
    prevBtn.onclick = () => gotoPage(currentPage - 1)
    nextBtn.onclick = () => gotoPage(currentPage + 1)
    lastBtn.onclick = () => gotoPage(Infinity)

    // logic start here
    constructTable()
    showhideColumns()
    applyFilter('')
    applySort()
    return view
}

