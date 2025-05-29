// uu: a set of utility functions for modern web UI
// hash: a6bc88fddfdde0339e774ae46344c50ed9a1e5cef511ed266986b5af08e86197
// Please do not modify this file directly. Use the following command to update this file on a deno environment:
// deno run -A --reload jsr:@timepp/uu/install

import * as tu from './tu.ts'
export * from './tu.ts'

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

// show information dialog, content is normal text, dialog no longer fix height
export function showInfo(title: string, content: string) {
    const dialog = createElement(document.body, 'dialog', [])

    const dc = createElement(dialog, 'div', [])

    const header = createElement(dc, 'div', [])
    header.style.textAlign = "center"
    createElement(header, 'h2', [], title)
    createElement(dc, 'hr', [])

    const main = createElement(dc, 'div', [])
    main.style.maxWidth = "800px"
    const h = tu.segmentByRegex(content, [[/error:/ig, 'red']])
    // main.appendChild(h)

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

export function highlightText(text: string, rules: [RegExp, string][]) {
    const parts = tu.segmentByRegex(text, rules)
    return parts.map(part => {
        const span = createElement(null, 'span', [], part.content)
        if (part.category) {
            span.style.color = part.category
        }
        return span
    })
}

export function createJsonView(content: string) {
    const parts = tu.segmentJson(content)
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

export function showLargeJsonResult(title: string, content: string) {
    const dialog = createElement(document.body, 'dialog', [])
    dialog.style.width = "80vw";  
    dialog.style.height = "80vh"; 

    const dc = createElement(dialog, 'div', [])
    dc.style.width = "100%";   // 宽度100%
    dc.style.height = "100%";  // 高度100%
    dc.style.display = "flex";
    dc.style.alignItems = "center";
    dc.style.flexDirection = "column";

    const header = createElement(dc, 'div', [])
    createElement(header, 'h2', [], title)

    const main = createElement(dc, 'pre', [])
    const spans = highlightText(content, [[/"[^"]+":/g, 'blue'], [/…[0-9]+ more (chars|items)…/g, 'red']])
    main.append(...spans)
    main.style.flexGrow = "1";   // 让 textarea 占满剩余空间
    main.style.width = "100%";   // 宽度100%

    const closeButton = createElement(dc, 'button', ['btn', 'btn-primary'], 'Close')
    closeButton.onclick = () => {
        dialog.close()
        dialog.remove()
    }
    dialog.showModal()
    return dialog
}

export async function showInputDialog(title: string, placeholder: string, initialValue?: string) {
    const dialog = createElement(document.body, 'dialog', [], '', {width: '400px'})
    const dc = createElement(dialog, 'div', ['d-flex', 'flex-column'])
    const header = createElement(dc, 'div', [])
    createElement(header, 'h2', [], title)
    const input = createElement(dc, 'input', ['form-control'], '', {marginTop: '10px'})
    input.placeholder = placeholder
    if (initialValue) input.value = initialValue
    const footer = createElement(dc, 'div', ['d-flex', 'justify-content-end', 'mt-2'])
    const okBtn = createElement(footer, 'button', ['btn', 'btn-primary'], 'OK')
    const cancelBtn = createElement(footer, 'button', ['btn', 'btn-secondary', 'ms-2'], 'Cancel')

    let resolver: ((value: string | undefined) => void)
    const promise = new Promise<string | undefined>((resolve) => {
        resolver = resolve
    })

    okBtn.onclick = () => {
        dialog.close()
        dialog.remove()
        resolver(input.value)
    }
    
    cancelBtn.onclick = () => {
        dialog.close()
        dialog.remove()
        resolver(undefined)
    }

    // handle esc key to close the dialog
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dialog.close()
            dialog.remove()
            resolver(undefined)
        }
    })

    dialog.showModal()
    return promise
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
    columns: string[]
    columnProperties: Record<string, TableColumnProperty>
    sortBy: {
        column: string
        order: 'asc' | 'desc'
    }[]

    // If not empty, raw index will be shown in the first column with the given name
    // note: this column can be hide / sort as well
    // typical usages is passing a '#' here
    rawIndexColumn: string

    pageSize?: number
    onRowClick: (item: any) => void
    stateKey: string // used to save the state of the table in local storage
}

export function createTableFromArray(arr: any[], presentation: Partial<TablePresentation> = {}) {
    // helper functions
    const toArrow = (s: string) => s === 'asc' ? '⬆️' : '⬇️'
    const fromArrow = (s: string) => s === '⬆️' ? 'asc' : 'desc'
    const defaultColumnFormater = (value: any) => {
        if (typeof value === 'object' && value !== null) {
            return tu.safeExecute(() => JSON.stringify(value, null, 2), e => `${e}`)
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


    const table = createElement(view, 'table', ['table', 'table-striped', 'table-bordered', 'table-hover'])
    const thead = createElement(table, 'thead')
    const tbody = createElement(table, 'tbody')

    // local states
    const properties = [presentation.rawIndexColumn, ...tu.dataProperties(arr)].filter(Boolean) as string[]
    let currentPage = 0 // page won't be persisted
    let totalVisible = 0 // total visible rows, used for paging
    const state = tu.createState(presentation, ['columns', 'sortBy'], presentation.stateKey)

    type Row = HTMLTableRowElement & { rawIndex: number }
    
    function constructTable() {
        const tr = createElement(thead, 'tr', [])
        for (const prop of properties) {
            const th = createElement(tr, 'th', [], prop, {cursor: 'pointer', userSelect: 'none'})
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
    
        // create the table body
        for (const [i, item] of arr.entries()) {
            const tr = createElement(tbody, 'tr', []);
            (tr as Row).rawIndex = i
            for (const prop of properties) {
                const td = createElement(tr, 'td', [], '', presentation.columnProperties?.[prop]?.style)
                const v = item[prop]
                const formater = presentation.columnProperties?.[prop]?.formater || defaultColumnFormater
                const formattedValue = (prop === presentation.rawIndexColumn)? `${i}` : formater(v)
                if (typeof formattedValue === 'string') {
                    td.textContent = formattedValue
                }
                else if (formattedValue instanceof HTMLElement) {
                    td.appendChild(formattedValue)
                }
            }
    
            if (presentation.onRowClick) {
                tr.onclick = () => {
                    presentation.onRowClick!(item)
                }
                tr.style.cursor = 'pointer'
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

        // Note: select all means not just select all this time, but for future as well
        //       so we cannot just save the current full set of properties
        //       we need to save `undefined` to express this semantics
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

