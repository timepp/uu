// deno-lint-ignore-file no-window
// uu: a set of utility functions for modern web UI

import * as tu from './tu.js'
export * from './tu.js'

export type AnnotatedString = {
    value: string,
    comment?: string
}
export type AutofillProvider = (category: string) => AnnotatedString[]

let autofillProvider = (category: string) => [] as AnnotatedString[]

export function setAutofillProvider(provider: AutofillProvider) {
    autofillProvider = provider
}

export function triggerDownload(data: Blob | string | object, filename: string) {
    const blob = data instanceof Blob ? data : new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' })
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

export function createElement<K extends keyof HTMLElementTagNameMap>(
    parent: Element | null, 
    tagName: K, 
    classes: string[] = [], 
    text?: string, 
    style: Partial<CSSStyleDeclaration> = {},
    attributes: Partial<Record<keyof HTMLElementTagNameMap[K], any>> = {}
) {
    const e = document.createElement(tagName)
    e.classList.add(...classes.filter(c => c))
    if (parent) parent.appendChild(e)
    if (text) e.textContent = text
    for (const [key, value] of Object.entries(style)) {
        if (value !== undefined) {
            e.style[key as any] = value as string
        }
    }
    for (const [key, value] of Object.entries(attributes)) {
        e[key as keyof HTMLElementTagNameMap[K]] = value
    }
    return e
}

export function createButton(parent: Element | null, classes: string[] = [], text: string, onclick = () => {}) {
    const button = createElement(parent, 'button', classes, text)
    button.onclick = onclick
    return button
}

export function createTable(parent: Element|null, columns: string[] = [], classes: string[] = [], styles: Partial<CSSStyleDeclaration> = {}) {
    const tbl = createElement(parent, 'table', classes, '', styles)
    const thead = createElement(tbl, 'thead')
    const tr = createElement(thead, 'tr')
    const headCells = columns.map(c => createElement(tr, 'th', [], c))
    const tbody = createElement(tbl, 'tbody')
    return {
        tbl,
        thead,
        headCells,
        tbody
    }
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

export async function asyncGet<T>(fn: () => T) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const r = fn()
    return r
}

/** Call a longer running synchronous function with a progress dialog
    It runs an async wrapper by setTimeout to avoid blocking the UI thread
    This is only a workaround if you cannot run the function in async context
*/
export function asyncCallFunctionWithProgress(fn: () => void, hint = 'Please wait...') {
    setTimeout(async() => {
        callAsyncFunctionWithProgress(() => asyncGet(fn), hint)
    }, 0)
}

export async function callAsyncFunctionWithProgress<T>(fn: () => Promise<T>, hint = 'Please wait...'): Promise<T> {
    const dialog = createElement(document.body, 'dialog', [])
    const dc = createElement(dialog, 'div', [])
    dc.style.textAlign = "center"
    createElement(dc, 'h4', ['m-2', 'text-center'], hint)
    // show a centered spinner
    const spinner = createElement(dc, 'div', ['spinner-border', 'text-primary'], '')
    dialog.showModal()
    try {
        const r = await fn()
        dialog.close()
        dialog.remove()
        return r
    } catch (e) {
        spinner.remove()
        createElement(dc, 'div', ['text-danger', 'mt-2'], 'Error occurred:')
        createElement(dc, 'hr')
        if (e instanceof Error) {
            createElement(dc, 'pre', ['text-start', 'overflow-auto'], e.stack || e.message)
        } else {
            const jsonView = createJsonView(JSON.stringify(e, null, 2))
            jsonView.style.textAlign = "left"
            dc.appendChild(jsonView)
        }
        createElement(dc, 'hr')
        const buttonContainer = createElement(dc, 'div', ['text-center', 'mt-2'])
        createButton(buttonContainer, ['btn', 'btn-primary'], 'Close', () => {
            dialog.close()
            dialog.remove()
        })
        // dialog.close()
        // dialog.remove()
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
    createElement(main, 'pre', [], content)

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

export function createJsonView(content: string, customColors: [RegExp, string][] = []) {
    const parts = tu.segmentByRegex(content, [...customColors, ...tu.getJsonRegexps() ])
    const pre = createElement(null, 'pre', [])
    pre.style.overflowX = 'wrap'
    // Enable word wrapping for the pre element
    pre.style.whiteSpace = 'pre-wrap'
    pre.style.wordWrap = 'break-word'

    for (const part of parts) {
        const span = createElement(pre, 'span')
        span.textContent = part.content
        // Enable word wrapping for individual spans
        span.style.wordWrap = 'break-word'
        span.style.whiteSpace = 'pre-wrap'
        switch (part.category) {
            case 'key': span.style.color = 'blue'; break
            // case 'string': span.style.color = 'purple'; break
            case 'number': span.style.color = '#f439e6'; break
            case 'true': span.style.color = 'green'; break
            case 'false': span.style.color = 'grey'; break
            case 'null': span.style.color = 'lightblue'; break
            case 'punctuation': span.style.fontWeight = "800"; break
            case '': break
            default: span.style.color = part.category; break
        }
    }

    return pre
}

// more lightweight: for large json
export function createLargeJsonView(content: string) {
    const main = createElement(null, 'pre', [])
    const spans = highlightText(content, [[/"[^"]+":/g, 'blue'], [/…[0-9]+ more (chars|items)…/g, 'red']])
    main.append(...spans)
    return main
}

export function showDialog<T>(classes: string[] = [], style: Partial<CSSStyleDeclaration> = {}, softDismissable = true, onCreate: (dialog: HTMLDialogElement, finisher: (value?: T) => void) => void) {
    const dialog = createElement(document.body, 'dialog', classes, '', style)
    let resolver: ((value?: T) => void)
    const promise = new Promise<T|undefined>((resolve) => {
        resolver = resolve
    })
    const finishFunc = (value?: T) => {
        dialog.close()
        dialog.remove()
        resolver(value)
    }
    if (softDismissable) {
        dialog.addEventListener('cancel', () => {
            finishFunc()
        })
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                finishFunc()
            }
        })
    }
    onCreate(dialog, finishFunc)
    dialog.showModal()
    return promise
}

// If the handler returns true, the dialog will be closed
export type ButtonAction = () => boolean|void|Promise<boolean|void>
export function showInDialog(title: string, content: string|HTMLElement, actions: string[] | Record<string, ButtonAction> = ['Close']) {
    const dialog = createElement(document.body, 'dialog', [], '', {
        minWidth: '50vw', 
        // maxWidth: '90vw',
        maxHeight: '90vh',
        padding: '0',
        border: 'none',
        borderRadius: '8px',
        resize: 'both',
    })
    
    const dc = createElement(dialog, 'div', [], '', {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        // maxHeight: '90vh'
    })
    
    // Fixed header
    const header = createElement(dc, 'div', [], '', {
        // padding: '20px 20px 0 20px',
        // flexShrink: '0'
    })
    header.style.textAlign = "center"
    if (title) {
        createElement(header, 'h4', ['mt-3'], title)
        createElement(dc, 'hr')
    }

    // Scrollable content area
    const contentArea = createElement(dc, 'div', [], '', {
        flex: '1',
        overflow: 'auto',
        padding: '0 10px'
    })
    
    if (typeof content === 'string') {
        contentArea.textContent = content
    } else {
        contentArea.appendChild(content)
    }

    // Fixed footer
    createElement(dc, 'hr')
    const footer = createElement(dc, 'div', ['d-flex', 'justify-content-center'], '', {
        padding: '0 20px 20px 20px',
        flexShrink: '0'
    })

    let resolver: ((value: string) => void)
    const promise = new Promise<string>((resolve) => {
        resolver = resolve
    })
    const finishWith = (action: string) => {
        dialog.close()
        dialog.remove()
        resolver(action)
    }

    if (typeof actions === 'object' && !Array.isArray(actions)) {
        for (const [btnText, handler] of Object.entries(actions)) {
            const button = createElement(footer, 'button', ['btn', 'btn-primary', 'ms-2', 'me-2'], btnText)
            button.onclick = async () => {
                const shouldClose = await handler()
                if (shouldClose) {
                    finishWith(btnText)
                }
            }
        }
    } else {
        for (const btnText of actions) {
            const button = createElement(footer, 'button', ['btn', 'btn-primary', 'ms-2', 'me-2'], btnText)
            button.onclick = () => {
                finishWith(btnText)
            }
        }
    }

    dialog.showModal()
    // trigger reflow
    dialog.style.height = `${dialog.offsetHeight}px`
    return promise
}

// information extractor is used to construct a information pane based on the object data
export type InformationExtractor = (obj: object) => HTMLElement | Promise<HTMLElement>
let informationExtractor: InformationExtractor | null = null
export function setInformationExtractor(extractor: InformationExtractor) {
    informationExtractor = extractor
}

export async function showJsonResult(title: string, content: string | object) {
    const obj = typeof content === 'string' ? JSON.parse(content) : content
    const fullText = JSON.stringify(obj, null, 2)
    const div = await createCodeMirrorJsonViewer(obj)

    const actions: Record<string, ButtonAction> = {
        Copy: () => navigator.clipboard.writeText(fullText),
        Download: () => triggerDownload(obj, `${title.replace(/\s+/g, '_')}.json`),
    }
    if (informationExtractor) {
        actions.Entities = async () => {
            showInDialog('Extracted Entities', await informationExtractor!(obj))
        }
    }
    actions.Close = () => true

    showInDialog(title, div, actions)
}

export async function showConfirmationDialog(title: string, text: string) {
    return showDialog([], { width: '400px' }, true, (dialog, finish) => {
        const dc = createElement(dialog, 'div', ['d-flex', 'flex-column'])
        const header = createElement(dc, 'div', [])
        createElement(header, 'h4', [], title)
        const main = createElement(dc, 'div', [], text, { marginTop: '10px' })
        const footer = createElement(dc, 'div', ['d-flex', 'justify-content-end', 'mt-2'])
        const okBtn = createButton(footer, ['btn', 'btn-primary'], 'OK', () => finish('ok'))
        const cancelBtn = createButton(footer, ['btn', 'btn-secondary', 'ms-2'], 'Cancel', () => finish())
    }).then(r => r === 'ok')
}

export type InputField = {
    tip: string | HTMLElement,
    initialValue?: string,
    multiLine?: boolean
}
export function showInputDialog(title: string, fields: InputField[]) {
    return showDialog<string[]>([], {width: '50vw'}, false, (dialog, finish) => {
        const dc = createElement(dialog, 'div', ['d-flex', 'flex-column'])
        const header = createElement(dc, 'div', [])
        createElement(header, 'h5', [], title)
        createElement(dc, 'hr')
        const gridContainer = createElement(dc, 'div', [], '', {
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '10px',
            alignItems: 'start'
        })
        const inputs: (HTMLInputElement | HTMLTextAreaElement)[] = []
        for (const field of fields) {
            // Create tip cell
            if (typeof field.tip === 'string') {
                createElement(gridContainer, 'div', [], field.tip, { 
                    whiteSpace: 'nowrap',
                    paddingTop: '6px', // Align with input padding
                    textAlign: 'right'
                })
            } else {
                const tipContainer = createElement(gridContainer, 'div', [], '', { 
                    whiteSpace: 'nowrap',
                    textAlign: 'right'
                })
                tipContainer.appendChild(field.tip)
            }
            
            // Create input cell
            const input = createElement(gridContainer, field.multiLine ? 'textarea' : 'input', ['form-control'], '', {})
            input.value = field.initialValue || ''
            if (field.multiLine) {
                (input as HTMLTextAreaElement).rows = 5
            }
            inputs.push(input)
        }
        const finishWithValue = () => finish(inputs.map(i => i.value))

        if (fields.length === 1 && !fields[0].multiLine) {
            inputs[0].addEventListener('keydown', async (evt: Event) => {
                const e = evt as KeyboardEvent
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    finishWithValue()
                }
            })
        }

        createElement(dc, 'hr')
        const footer = createElement(dc, 'div', ['d-flex', 'justify-content-end', 'mt-2'])
        const okBtn = createButton(footer, ['btn', 'btn-primary'], 'OK', () => finishWithValue())
        const cancelBtn = createButton(footer, ['btn', 'btn-secondary', 'ms-2'], 'Cancel', () => finish())
    })
}

export async function prompt(title: string, tip: string | HTMLElement, initialValue?: string) {
    const r = await showInputDialog(title, [{ tip, initialValue, multiLine: false }])
    return r ? r[0] : undefined
}

export async function promptMultiline(title: string, tip: string | HTMLElement, initialValue?: string) {
    const r = await showInputDialog(title, [{ tip, initialValue, multiLine: true }])
    return r ? r[0] : undefined
}

/**
 * Given an user provided handler: create input controls, handle user interactions, and show result area.
 * @param title 
 * @param actionName 
 * @param valueId 
 * @param handler 
 * @param value 
 * @returns 
 */
export function createInputAction(title: string, actionName: string, valueId: string, handler: (value: string) => Promise<HTMLElement>, value?: string) {
    const div = createElement(null, 'div', ['border', 'border-light-subtle', 'rounded'])
    const resultArea = createElement(null, 'div', ['mt-2', 'p-1'])
    const {ig, input, button} = createAutofillInput(title, '', valueId, async v => {
        const result = await callAsyncFunctionWithProgress(() => handler(v), `${actionName}`)
        setContent(resultArea, result)
    }, actionName)
    if (value) {
        input.value = value
        button?.click()
    }
    div.appendChild(ig)
    div.appendChild(resultArea)
    return div
}

export function createAutofillInput(title: string, placeholder: string, valueId = title, handler?: (value: string) => void, btn?: string) {
    const ig = createElement(null, 'div', ['input-group'])
    const label = createElement(ig, 'label', ['input-group-text'], title, {minWidth: '100px'})
    const input = createElement(ig, 'input', ['form-control'], '', {}, {placeholder})
    const history = JSON.parse(localStorage.getItem(`input-history-${valueId}`) || '[]') as string[]
    
    function updateHistory(newValue: string) {
        if (!history.includes(newValue)) {
            history.unshift(newValue)
            localStorage.setItem(`input-history-${valueId}`, JSON.stringify(history.slice(0, 100)))
        }
    }

    let button : HTMLButtonElement | null = null
    if (btn) {
        button = createElement(ig, 'button', ['input-group-btn', 'btn', 'btn-primary'], btn)
        button.onclick = () => {
            if (handler) {
                updateHistory(input.value)
                handler(input.value)
            }
        }
    }
    input.id = valueId
    input.value = localStorage.getItem(`input-${valueId}`) || ''
    label.style.cursor = 'pointer'
    label.onclick = async () => {
        // autofill support
        const predefined = autofillProvider(valueId)
        const candidates = [
            ...predefined,
            ...history.map(h => ({value: h, comment: 'from history'})).filter(p => !predefined.find(pp => pp.value === p.value))
        ]
        if (candidates.length !== 0) {
            const r = await chooseOne(candidates)
            if (r !== undefined) {
                input.value = r
                localStorage.setItem(`input-${valueId}`, input.value)
                // update history

            }
        }
        input.focus()
    }
    // handle pressing enter key to trigger handler
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (handler) {
                updateHistory(input.value)
                handler(input.value)
            }
        }
    })
    input.onchange = () => {
        localStorage.setItem(`input-${valueId}`, input.value)
    }
    return {ig, input, button}
}

export async function chooseOne(data: (string|AnnotatedString)[]) {
    // show a dialog to choose one item from data
    // return the chosen item, or null
    // show comment as tooltip
    return showDialog<string>([], {}, true, (dialog, finish) => {
        const dc = createElement(dialog, 'div', ['d-flex', 'flex-column'])
        const main = createElement(dc, 'div', ['d-flex', 'flex-column'], '', { marginTop: '10px', maxHeight: '60vh' })
        for (const item of data) {
            const value = typeof item === 'string' ? item : item.value
            const comment = typeof item === 'string' ? '' : item.comment
            const div = createElement(main, 'div', ['d-flex', 'align-items-center', 'mb-2'], '', { gap: '10px' })
            const itemDiv = createElement(div, 'div', ['form-control', 'bg-light', 'hover-effect'])
            itemDiv.style.cursor = 'pointer'
            // hover via css    
            const vaultSpan = createElement(itemDiv, 'span', [], value)
            const commentSpan = createElement(itemDiv, 'span', ['text-muted', 'ms-2'], comment, { fontSize: '0.9em' })
            div.onclick = () => finish(value)
        }
    })
}

export type SelectOption = {
    singleSelect: boolean
    preserveOrder: boolean
    initialSelection: string[]

    // return `newSelection` if the new selection is valid
    // otherwise, return a selection if checker can fix invalid selection
    // otherwise, return an error message
    checker: (oldSelection: string[], newSelection: string[]) => string[] | string

    // used to apply custom styles to individual items
    styleModifier: (item: string, elem: HTMLElement) => void
}

export async function showSelection(title: string, data: string[], options: Partial<SelectOption>) {
    const dialog = createElement(document.body, 'dialog', [], '', {width: '80vw'})
    const dc = createElement(dialog, 'div', ['d-flex', 'flex-column'])
    const header = createElement(dc, 'div', [])
    createElement(header, 'h3', [], title)
    // createElement(dc, 'hr', ['w-100'])
    const selectedContent = createElement(dc, 'span', ['form-control'])
    const toolbar = createElement(dc, 'div', ['input-group', 'mb-4', 'mt-2'])
    const filter = createElement(toolbar, 'input', ['form-control'], '')
    const selectAllBtn = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], '☑')
    const unSelectAllBtn = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], '☐')

    if (options.singleSelect) {
        selectAllBtn.classList.add('d-none')
        unSelectAllBtn.classList.add('d-none')
    }
    // filter text
    filter.placeholder = "Filter"
    
    const main = createElement(dc, 'div', ['d-flex', 'overflow-auto', 'flex-wrap', 'gap-2'], '', {backgroundColor: 'rgb(255, 255, 244)'})
    createElement(dc, 'hr', ['w-100'])
    const alert = createElement(dc, 'div', ['alert', 'alert-danger', 'd-none'])
    const footer = createElement(dc, 'div', ['d-flex', 'justify-content-center'])
    const okBtn = createElement(footer, 'button', ['btn', 'btn-primary', 'me-2'], 'OK')

    let selected = options.initialSelection || []

    function syncSelected() {
        selectedContent.innerHTML = ''
        createElement(selectedContent, 'span', ['me-2'], 'Selected: ', {color: 'blue'})
        for (let i = 0; i < selected.length; i++) {
            const item = selected[i]
            const text = options.preserveOrder ? `${i + 1}: ${item}` : item
            createElement(selectedContent, 'span', ['me-1'], text)
        }

        for (const item of Array.from(main.children)) {
            const span = item as HTMLSpanElement
            const isItemSelected = selected.includes(item.textContent!)
            span.classList.toggle('selected', isItemSelected)
            span.style.backgroundColor = isItemSelected ? 'rgba(0, 123, 255, 0.5)' : 'rgb(244, 244, 244)'
        }
    }

    for (const item of data) {
        const span = createElement(main, 'span', ['rounded-1', 'p-2', 'text-center', 'd-inline-block'], item, {minWidth: '100px'})
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
        if (options.styleModifier) {
            options.styleModifier(item, span)
        }
    }

    filter.oninput = () => {
        const v = filter.value.toLowerCase()
        for (const item of Array.from(main.children)) {
            syncClass(item as HTMLElement, 'd-none', !item.textContent?.toLowerCase().includes(v))
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

    unSelectAllBtn.onclick = () => {
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

export type ColumnProperty = {
    formater?: (value: any, item?: any) => string | HTMLElement
    style?: Partial<CSSStyleDeclaration>
    onCellClick?: (item: any, dataIndex: number) => void
}
export type ItemAction = (item: any, dataIndex: number) => void
export type ItemActions = Record<string, ItemAction>
export type VisualizeConfig<T extends object> = {
    // the default render style is 'table'
    renderStyle: 'table' | 'tile'

    showColumnSelector: boolean
    showSortButton: boolean
    showFilter: boolean    

    columnProperties: Record<string, ColumnProperty>
    columnFormater: (item: T, prop: string) => string | HTMLElement
    itemActions: ItemActions | ((item: T, dataIndex: number) => ItemActions)

    // used only for 'tile' render style
    itemFormater: (item: T, dataIndex: number, columns: string[]) => HTMLElement
    itemStyle: (item: T, dataIndex: number) =>Partial<CSSStyleDeclaration>

    // If not empty, raw index will be shown in the first column with the given name
    // note: this column can be hide / sort as well
    // typical usages is passing a '#' here
    rawIndexColumn: string

    // if present, paging will be enabled
    // if not present, all rows will be shown
    pageSize: number

    // if true, nested objects will be flattened using dot notation
    // so that their properties can be shown as columns
    // e.g. { a: { b: 1 } } => column "a.b" with value 1
    flattenNestedObjects: boolean

    // Do not add the default action column if no action is given manually
    noDefaultAction: boolean

    onCellClick: (item: T, prop: string, dataIndex: number) => void

    // initial columns to show, if not present, all columns are shown
    columns: string[]
    // initial sort by settings, if not present, no sorting is applied
    sortBy: {
        column: string
        order: 'asc' | 'desc'
    }[]
    // initial filter string, if not present, no filtering is applied
    filter: string

    // item filter, used to filter items given the filter string
    // the default filter will do a deep search on all properties of the item
    // It's recommended to provide a custom filter for better performance, if there are many large items
    itemFilter: (item: T, filter: string) => boolean
    // If not empty, sort and column settings will be saved to local storage with the given key
    stateKey: string
}

export function visualizeArray<T extends object>(arr: T[], cfg: Partial<VisualizeConfig<T>> = {}) {
    // helper functions
    const toArrow = (s: string) => s === 'asc' ? '⬆️' : '⬇️'
    const fromArrow = (s: string) => s === '⬆️' ? 'asc' : 'desc'
    const generalColumnFormatter = (item: T, prop: string) => {
        const value = item[prop as keyof T]
        if (typeof value === 'object' && value !== null) {
            // return createJsonView(JSON.stringify(value, null, 2))
            return tu.stringify(value)
        } else {
            return `${value}`
        }
    }
    const itemFilter = cfg.itemFilter || ((item: T, filter: string) => {
        return tu.fuzzyFind(item, filter) !== null
    })
    const renderStyle = cfg.renderStyle || 'table'
    
    // overall dom
    const view = createElement(null, 'div')
    const toolbar = createElement(view, 'div', ['input-group', 'mb-1'])
    const fieldSelect = createElement(toolbar, 'button', ['btn', 'btn-secondary', 'me-2'], 'Columns')
    const sortBtn = createElement(toolbar, 'button', ['btn', 'btn-secondary'], 'Sort')
    const sortHint = createElement(toolbar, 'span', ['input-group-text'])
    const randomSortBtn = createButton(toolbar, ['btn', 'btn-secondary', 'me-2'], '⧉')
    const filterHint = createElement(toolbar, 'span', ['input-group-text'], 'Filter')
    const filter = createElement(toolbar, 'input', ['form-control'], '')
    const counts = createElement(toolbar, 'span', ['input-group-text', 'me-2'], '20 / 100')
    const pagerWrapper = createElement(toolbar, 'div', [])
    const optionBtn = createElement(toolbar, 'button', ['ms-2', 'btn', 'btn-secondary'], '≡')
    const dataContainer = createElement(view, 'div')

    // now paging section, which looks like 4 buttons and an edit: "<< < [8] > >>

    let allProps = tu.dataProperties(arr)
    if (cfg.flattenNestedObjects) {
        const props = new Set<string>()
        tu.traverseObject(arr, -1, (p, v, t) => {
            if (t === 'leaf') props.add(p.slice(1).join('.'))
        })
        allProps = [...props]
    }
    let valueFetcher = (item: any, prop: string): any => item[prop]
    if (cfg.flattenNestedObjects) {
        valueFetcher = (item: any, prop: string): any => {
            const parts = prop.split('.')
            let v = item
            for (const part of parts) {
                if (v === null || v === undefined) {
                    return undefined
                }
                v = v[part]
            }
            return v
        }
    }

    // properties used to construct table columns
    // presentation columns should be put before other columns but after raw index column
    const presentationColumns = cfg.columns ?? []
    const properties = [
        cfg.rawIndexColumn, 
        ...presentationColumns,
        ...allProps.filter(p => !presentationColumns.includes(p))
    ].filter(v => !!v) as string[]
    
    const state = tu.createState(cfg, ['columns', 'sortBy', 'filter'], cfg.stateKey)
    filter.value = state.filter || ''

    function tableRenderer(startIndex: number, endIndex: number) {
        const table = createElement(null, 'table', ['table', 'table-bordered', 'table-hover'])
        const thead = createElement(table, 'thead', ['bg-light'])
        const tbody = createElement(table, 'tbody')
        const tr = createElement(thead, 'tr', [])
        const sortBy = state.sortBy || []
        for (const prop of state.columns ?? properties) {
            const th = createElement(tr, 'th')
            createElement(th, 'span', [], prop)
            const i = sortBy.findIndex(s => s.column === prop)
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
                const s = state.sortBy?.find(s => s.column === prop)
                if (s) {
                    if (s.order === 'asc') {
                        state.sortBy = [{ column: prop, order: 'desc' }]
                    } else if (s.order === 'desc') {
                        state.sortBy = []
                    }
                } else {
                    state.sortBy = [{ column: prop, order: 'asc' }]
                }
                applySort()
            }
        }

        if (!cfg.noDefaultAction || (cfg.itemActions)) {
            const th = createElement(tr, 'th', ['actions-cell'], 'Actions')
        }
        for (let i = startIndex; i < endIndex; i++) {
            tbody.append(createRow(data[i].item, data[i].index))
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
            if (cfg.itemFormater) {
                container.appendChild(cfg.itemFormater(data[i].item, data[i].index, state.columns ?? properties))
                continue
            }

            const item = data[i].item
            const dataIndex = data[i].index
            const card = createElement(container, 'div', ['card', 'p-1', 'hover-effect'], '', cfg.itemStyle?.(item, dataIndex))
            // const cardBody = createElement(card, 'div', ['card-body', 'd-flex', 'flex-column', 'gap-2'])
            for (const [j, prop] of (state.columns ?? properties).entries()) {
                const div = createElement(card, 'div', [], '', cfg.columnProperties?.[prop]?.style)
                if (cfg.columnProperties?.[prop]?.onCellClick) {
                    div.style.cursor = 'pointer'
                }
                div.style.wordBreak = 'break-all'
                const v = valueFetcher(item, prop)
                const specificFormater = cfg.columnProperties?.[prop]?.formater
                const swrapper = specificFormater ? (item: T, prop: string) => specificFormater(item[prop as keyof T], item) : null
                const formater = swrapper || cfg.columnFormater || generalColumnFormatter
                const formattedValue = (prop === cfg.rawIndexColumn) ? `${dataIndex + 1}` : formater(item, prop)
                if (typeof formattedValue === 'string') {
                    div.textContent = formattedValue
                }
                else if (formattedValue instanceof HTMLElement) {
                    div.appendChild(formattedValue)
                }

                const specificClickHandler = cfg.columnProperties?.[prop]?.onCellClick
                if (specificClickHandler) {
                    div.onclick = () => {
                        if (window.getSelection()?.toString()) return;
                        specificClickHandler(item, dataIndex)
                    }
                } else if (cfg.onCellClick) {
                    div.onclick = () => {
                        if (window.getSelection()?.toString()) return;
                        cfg.onCellClick!(item, prop, dataIndex)
                    }
                }
            }
            if (!cfg.noDefaultAction || (cfg.itemActions)) {
                const td = createElement(card, 'div', ['actions-cell'])
                const actions = (typeof cfg.itemActions === 'function') ? cfg.itemActions(item, dataIndex) : (cfg.itemActions || {})
                const defaultActions = cfg.noDefaultAction ? {} : {
                    raw: () => showJsonResult(`Raw data (index: ${dataIndex})`, item)
                }
                const allActions = { ...defaultActions, ...actions }
                for (const [name, action] of Object.entries(allActions)) {
                    const btn = createElement(td, 'a', ['me-2'], name)
                    btn.style.cursor = 'pointer'
                    btn.onclick = () => action(item, dataIndex)
                }
            }
        }
        return container
    }

    const renderer = (renderStyle === 'table') ? tableRenderer : tileRenderer

    function createRow(item: T, dataIndex: number) {
        const tr = createElement(null, 'tr', [], '', cfg.itemStyle?.(item, dataIndex));
        for (const [j, prop] of (state.columns??properties).entries()) {
            const td = createElement(tr, 'td', [], '', cfg.columnProperties?.[prop]?.style)
            if (cfg.columnProperties?.[prop]?.onCellClick) {
                td.style.cursor = 'pointer'
            }
            td.style.wordBreak = 'break-all'
            const v = valueFetcher(item, prop)
            const specificFormater = cfg.columnProperties?.[prop]?.formater
            const swrapper = specificFormater ? (item: T, prop: string) => specificFormater(item[prop as keyof T], item) : null
            const formater = swrapper || cfg.columnFormater || generalColumnFormatter
            const formattedValue = (prop === cfg.rawIndexColumn) ? `${dataIndex + 1}` : formater(item, prop)
            if (typeof formattedValue === 'string') {
                td.textContent = formattedValue
            }
            else if (formattedValue instanceof HTMLElement) {
                td.appendChild(formattedValue)
            }

            const specificClickHandler = cfg.columnProperties?.[prop]?.onCellClick
            if (specificClickHandler) {
                td.onclick = () => {
                    if (window.getSelection()?.toString()) return;
                    specificClickHandler(item, dataIndex)
                }
            } else if (cfg.onCellClick) {
                td.onclick = () => {
                    if (window.getSelection()?.toString()) return;
                    cfg.onCellClick!(item, prop, dataIndex)
                }
            }
        }

        if (!cfg.noDefaultAction || (cfg.itemActions)) {
            const td = createElement(tr, 'td', ['actions-cell'])
            const actions = (typeof cfg.itemActions === 'function') ? cfg.itemActions(item, dataIndex) : (cfg.itemActions || {})
            const defaultActions = cfg.noDefaultAction ? {} : {
                raw: () => showJsonResult(`Raw data (index: ${dataIndex})`, item)
            }
            const allActions = { ...defaultActions, ...actions }
            for (const [name, action] of Object.entries(allActions)) {
                const btn = createElement(td, 'a', ['me-2'], name)
                btn.style.cursor = 'pointer'
                btn.onclick = () => action(item, dataIndex)
            }
        }
        return tr
    }

    // data is filtered view of arr
    const allData = arr.map((item, index) => ({item, index}))
    let data = allData
    const pageSize = cfg.pageSize || Infinity
    const pager = new Pager(data.length, pageSize, (page) => gotoPage(page))
    const pagerElem = pager.getElement()
    pagerWrapper.appendChild(pagerElem)

    function gotoPage(page: number) {
        // only visible rows falling into the current page are shown, all others are hidden
        const {startIndex, endIndex} = pager.getPageRange(page)
        dataContainer.innerHTML = ''
        dataContainer.appendChild(renderer(startIndex, endIndex))
    }

    function applyFilter(s: string) {
        data = allData.filter(v => itemFilter(v.item, s))
        counts.textContent = `${data.length} / ${arr.length}`
        // currentPage = 0
        pager.setTotalItems(data.length)
        // TODO: there are too many 'gotoPage' calls. 
        applySort()
    }

    function applySort() {
        // update sort hint
        const sortBy = state.sortBy || []
        sortHint.textContent = `${sortBy.map(s => `${s.column} ${toArrow(s.order)}`).join(', ')}`

        // sort the table rows
        if (sortBy.length > 0) {
            data.sort((a, b) => {
                for (const s of sortBy) {
                    const aValue = (s.column === cfg.rawIndexColumn)? a.index : a.item[s.column as keyof T]
                    const bValue = (s.column === cfg.rawIndexColumn)? b.index : b.item[s.column as keyof T]
                    if (aValue === bValue) continue
                    let ret = 0
                    if (aValue === undefined) ret = -1
                    else if (bValue === undefined) ret = 1
                    else if (aValue === null) ret = -1
                    else if (bValue === null) ret = 1
                    else if (typeof aValue === 'number' && typeof bValue === 'number') {
                        ret = aValue - bValue
                    } else {
                        ret = `${aValue}`.localeCompare(`${bValue}`, 'zh-Hans-CN', { sensitivity: 'base' })
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

        gotoPage(0)
    }

    function syncRegionExistence() {
        // we directly remove unneeded elements in toolbar
        // rather than hiding them, so that toolbar looks cleaner (e.g. radius of borders)
        
        const showColumnSelector = cfg.showColumnSelector ?? true// ?? (properties.length > 1)
        const showSortButton = cfg.showSortButton ?? true
        const showFilter = cfg.showFilter ?? true// (arr.length > 1)

        syncExistence(fieldSelect, showColumnSelector)
        syncExistence(sortBtn, showSortButton)
        syncExistence(sortHint, showSortButton)
        syncExistence(randomSortBtn, showSortButton)
        syncExistence(filter, showFilter)
        syncExistence(filterHint, showFilter)
        syncExistence(counts, showFilter)
        syncExistence(pagerWrapper, !!cfg.pageSize)

        if (toolbar.lastElementChild) {
            (toolbar.lastElementChild as HTMLElement).classList.remove('me-2')
        }
    }

    fieldSelect.onclick = async () => {
        const r = await showSelection('Select Fields', properties, {
            initialSelection: state.columns??properties, 
            preserveOrder: true,
            styleModifier: (item, elem) => {
                if (item === cfg.rawIndexColumn) {
                    elem.style.fontWeight = 'bold'
                    elem.style.borderBottom = '2px solid blue'
                }
            }
        })
        if (r === undefined) return

        state.columns = r
        gotoPage(pager.currentPage)
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

    randomSortBtn.onclick = () => {
        state.sortBy = []
        tu.shuffleArray(data)
        sortHint.textContent = `Random`
        gotoPage(0)
    }

    filter.oninput = () => {
        const v = filter.value.toLowerCase()
        state.filter = v
        applyFilter(v)
    }

    associateDropdownActions(optionBtn, {
        'Insights': () => {
            const info = tu.getDataInsights(arr)
            showJsonResult('Data Insights', info)
        },
        'Select Columns': () => fieldSelect.click(),
    })

    // logic start here
    syncRegionExistence()
    applyFilter(state.filter || '')
    applySort()
    return view
}

export function createFoldedString(content: string, maxLength: number) {
    if (content.length <= maxLength) {
        return createElement(null, 'span', [], content)
    } else {
        const c = Math.floor((maxLength - 3) / 2)
        const leftContent = content.slice(0, c)
        const rightContent = content.slice(content.length - c)
        const shortContent = leftContent + `...` + rightContent
        const span = createElement(null, 'span', [], shortContent)
        // hover to show full content
        span.title = content
        return span
    }
}

export function showAll(collection: NodeListOf<HTMLElement>) {
    collection.forEach((el) => {
        el.style.display = '';
    });
}

export function hideAll(collection: NodeListOf<HTMLElement>) {
    collection.forEach((el) => {
        el.style.display = 'none';
    });
}

export function rgbValue(obj: {r: number, g: number, b: number}) {
    return `rgb(${obj.r}, ${obj.g}, ${obj.b})`;
}

export function getStringColor(str: string) {
    const v = tu.simpleHash(str)
    const h = v % 360
    return `hsl(${h}, 100%, 90%)`
}

export function syncClass(element: HTMLElement, className: string, enabled: boolean) {
    if (enabled) {
        element.classList.add(className);
    } else {
        element.classList.remove(className);
    }
}

export function syncChildClass(parent: HTMLElement, childSelector: string, className: string, enabled: boolean) {
    const children = parent.querySelectorAll<HTMLElement>(childSelector);
    children.forEach(child => syncClass(child, className, enabled));
}

export function syncDisplay(element: HTMLElement, visible: boolean) {
    element.style.display = visible ? '' : 'none';
}

export function syncExistence(element: HTMLElement, shouldExist: boolean) {
    if (!shouldExist) {
        element.remove()
    }
}

export function syncChildDisplay(parent: HTMLElement, childSelector: string, visible: boolean) {
    const children = parent.querySelectorAll<HTMLElement>(childSelector);
    children.forEach(child => syncDisplay(child, visible));
}

export function setContent(parent: HTMLElement, ...nodes: (string | Node)[]) {
    parent.innerHTML = ''
    parent.append(...nodes)
}

export class Pager {
    toolbar: HTMLElement
    privBtn: HTMLButtonElement
    nextBtn: HTMLButtonElement
    lastBtn: HTMLButtonElement
    firstBtn: HTMLButtonElement
    pageText: HTMLElement
    currentPage = 0
    constructor(private totalItems: number, private pageSize: number, private onPageChange: (pageIndex: number, pageSize: number) => void) {
        this.toolbar = createElement(null, 'div', ['btn-group'])
        const btnClass = ['btn', 'btn-secondary']
        this.firstBtn = createElement(this.toolbar, 'button', btnClass, '<<')
        this.privBtn = createElement(this.toolbar, 'button', btnClass, '<')
        this.pageText = createElement(this.toolbar, 'button', ['btn', 'btn-secondary'], '1 / 1')
        this.nextBtn = createElement(this.toolbar, 'button', btnClass, '>')
        this.lastBtn = createElement(this.toolbar, 'button', btnClass, '>>')
        this.firstBtn.onclick = () => this.gotoPage(0)
        this.privBtn.onclick = () => this.gotoPage(this.currentPage - 1)
        this.nextBtn.onclick = () => this.gotoPage(this.currentPage + 1)
        this.lastBtn.onclick = () => this.gotoPage(Infinity)
        this.pageText.onclick = async () => {
            const page = await prompt('Go to Page', 'Enter page number', `${this.currentPage + 1}`)
            if (page) {
                this.gotoPage(Number(page) - 1)
            }
        }
        // this.gotoPage(this.currentPage)
        this.updateUI()
    }

    setPageSize(pageSize: number) {
        this.pageSize = pageSize
        this.gotoPage(this.currentPage)
    }

    setTotalItems(totalItems: number) {
        this.totalItems = totalItems
        this.gotoPage(this.currentPage)
    }

    getPageRange(page: number) {
        const startIndex = this.pageSize === Infinity ?0 : page * this.pageSize
        const endIndex = Math.min(startIndex + this.pageSize, this.totalItems)
        return { startIndex, endIndex }
    }

    private updateUI() {
        const totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize))
        this.pageText.textContent = `${this.currentPage + 1} / ${totalPages}`
        this.privBtn.disabled = this.currentPage <= 0
        this.firstBtn.disabled = this.currentPage <= 0
        this.nextBtn.disabled = this.currentPage >= totalPages - 1
        this.lastBtn.disabled = this.currentPage >= totalPages - 1
    }

    gotoPage(page: number) {
        const totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize))
        if (page < 0) page = 0
        if (page >= totalPages) page = totalPages - 1
        this.currentPage = page
        this.updateUI()
        this.onPageChange(this.currentPage, this.pageSize)
    }

    getElement() {
        return this.toolbar
    }
}

export function createToggleBar(values: (string|HTMLElement)[], value: number, onNewValue: (v: number) => void) {
    const div = createElement(null, 'div', ['btn-group'])
    const buttons: HTMLButtonElement[] = []
    function updateUI(selectedIndex: number) {
        for (let i = 0; i < buttons.length; i++) {
            const selected = i === selectedIndex
            syncClass(buttons[i], 'btn-primary', selected)
            syncClass(buttons[i], 'btn-secondary', !selected)
        }
    }
    for (const v of values) {
        const btn = createButton(div, ['btn'], '', () => {
            const index = values.indexOf(v)
            updateUI(index)
            onNewValue(index)
        })
        btn.append(typeof v === 'string'? createElement(null, 'span', [], v): v)
        buttons.push(btn)
    }
    updateUI(value)
    return div
}

export function associateDropdownActions(elem: HTMLElement, actions: Record<string, () => void> | {name: string, action: () => void}[]) {
    type DropdownElement = HTMLElement & { dropdown?: HTMLElement }
    const e = elem as DropdownElement
    e.onclick = async (evt) => {
        console.log('dropdown button clicked')
        if (e.dropdown) {
            // drop down already there, won't create a new one
            return
        }

        console.log('create new dropdown')
        const dropdown = createElement(document.body, 'div', ['dropdown-menu', 'show'], '', {
            position: 'absolute',
            zIndex: '1050'
        })
        const rect = e.getBoundingClientRect()
        
        // Position dropdown and check for overflow
        let left = rect.left
        let top = rect.bottom
        
        // Add dropdown to DOM temporarily to get its dimensions
        document.body.appendChild(dropdown)
        
        // Adjust horizontal position if dropdown would overflow right edge
        const dropdownWidth = dropdown.offsetWidth || 200 // fallback width
        const viewportWidth = window.innerWidth
        if (left + dropdownWidth > viewportWidth) {
            left = rect.right - dropdownWidth
        }
        
        // Adjust vertical position if dropdown would overflow bottom edge
        const dropdownHeight = dropdown.offsetHeight || 100 // fallback height
        const viewportHeight = window.innerHeight
        if (top + dropdownHeight > viewportHeight) {
            top = rect.top - dropdownHeight
        }
        
        dropdown.style.left = `${left}px`
        dropdown.style.top = `${top}px`
        e.dropdown = dropdown

        if (!Array.isArray(actions)) {
            actions = Object.entries(actions).map(([name, action]) => ({name, action}))
        }

        for (const {name, action} of actions) {
            const item = createElement(dropdown, 'a', ['dropdown-item'], name)
            item.style.cursor = 'pointer'
            item.onclick = () => {
                action()
            }
        }

        // Delay adding document click listener to avoid closing dropdown immediately
        // This ensures the current click event completes before registering the listener
        function closeDropdown() {
            if (e.dropdown) {
                e.dropdown.remove()
                delete e.dropdown
                document.removeEventListener('click', closeDropdown)
            }
        }
        setTimeout(() => {
            document.addEventListener('click', closeDropdown)
        }, 0)
    }
}

export function createFoldableArea(title: string, content: HTMLElement, initiallyFolded: boolean = true) {
    // create a foldable area using bootstrap card
    const card = createElement(null, 'div', ['card', 'mb-2'])
    const cardHeader = createElement(card, 'div', ['card-header', 'd-flex', 'justify-content-between', 'align-items-center'], '', {cursor: 'pointer'})
    const titleElem = createElement(cardHeader, 'span', [], title)
    const toggleBtn = createElement(cardHeader, 'button', ['btn', 'btn-sm', 'btn-outline-secondary'], initiallyFolded ? '+' : '−')
    const cardBody = createElement(card, 'div', ['card-body'], '', {display: initiallyFolded ? 'none' : ''})
    cardBody.appendChild(content)

    cardHeader.onclick = () => {
        const isFolded = cardBody.style.display === 'none'
        cardBody.style.display = isFolded ? '' : 'none'
        toggleBtn.textContent = isFolded ? '−' : '+'
    }
    return card
}

class CodeMirrorLoader {
  static modules:any = null;

  static async getModules() {
    if (!this.modules) {
      const [
        { EditorState },
        { EditorView, lineNumbers, Decoration, hoverTooltip },
        { syntaxHighlighting, defaultHighlightStyle },
        { json }
      ] = await callAsyncFunctionWithProgress(() => Promise.all([
        import("https://cdn.skypack.dev/@codemirror/state@6"),
        import("https://cdn.skypack.dev/@codemirror/view@6"),
        import("https://cdn.skypack.dev/@codemirror/language@6"),
        import("https://cdn.skypack.dev/@codemirror/lang-json@6")
      ]));

      this.modules = {
        EditorState,
        EditorView,
        lineNumbers,
        Decoration,
        hoverTooltip,
        syntaxHighlighting,
        defaultHighlightStyle,
        json
      };
    }
    return this.modules;
  }
}

export async function createCodeMirrorJsonViewer(obj: object) {
    const { EditorState, EditorView, lineNumbers, Decoration, hoverTooltip, syntaxHighlighting, defaultHighlightStyle, json } = await CodeMirrorLoader.getModules();
    const parent = createElement(null, 'div', [], '', { border: '1px solid #ddd', borderRadius: '4px' });

    // // 定义一个标记装饰（高亮 + 样式）
    const commentMark = Decoration.mark({
      attributes: { class: "cm-highlight" },
      inclusive: false, // 是否包含边界
    });

    // // 你的注释数据：{ from, to, text }
    const comments = [
      { from: 14, to: 18, text: "这里是“测试文本”，表示我们正在实验功能。" },
      // 可以加更多
    ];

    // // 创建 Decoration Set
    const commentDecorations = Decoration.set(
      comments.map(c => commentMark.range(c.from, c.to))
    );

    // // hover tooltip 扩展
    // const commentTooltip = hoverTooltip((view:any, pos:number) => {
    //   // 查找 pos 是否落在某个 comment 范围内
    //   for (const c of comments) {
    //     if (pos >= c.from && pos <= c.to) {
    //       return {
    //         pos: c.from,
    //         end: c.to,
    //         above: true,        // 提示框显示在上方（可改成 false 在下方）
    //         create: () => {
    //           const dom = document.createElement("div");
    //           dom.className = "cm-tooltip";
    //           dom.textContent = c.text;
    //           return { dom };
    //         }
    //       };
    //     }
    //   }
    //   return null; // 没找到返回 null，不显示
    // });

    const state = EditorState.create({
      doc: JSON.stringify(obj, null, 2),
      extensions: [
        lineNumbers(),                          // 显示行号
        syntaxHighlighting(defaultHighlightStyle), // 默认语法高亮样式
        json(),                                 // JSON 语言支持（解析 + 高亮）
        EditorState.readOnly.of(true),          // 状态级只读：禁止通过键盘/粘贴等修改内容
        EditorView.editable.of(false),           // 视图级不可编辑：内容 DOM 不可编辑（更彻底的只读）
        // commentDecorations,
        // commentTooltip
      ]
    });
    const view = new EditorView({ state, parent });
    return parent;
}

class MarkdownLoader {
    static module: any = null;
    static async getModule() {
        if (!this.module) {
            this.module = await import("https://esm.sh/markdown-it");
        }
        return this.module;
    }
}

export async function createMarkdownViewer(markdownText: string) {
    const { default: markdownIt } = await MarkdownLoader.getModule();

    const md = markdownIt({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true,
    });
    const htmlContent = md.render(markdownText)
    const container = createElement(null, 'div')
    container.innerHTML = htmlContent
    // make links open in new tab
    const links = container.querySelectorAll('a')
    links.forEach(link => {
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noopener noreferrer')
    })
    return container
}
