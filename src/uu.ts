// deno-lint-ignore-file no-window
// uu: a set of utility functions for modern web UI

import * as tu from './tu.ts'
export * from './tu.ts'

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

let _isFaAvailable: boolean | undefined
export function isFontAwesomeAvailable() {
    if (_isFaAvailable === undefined) {
        const span = document.createElement('i')
        span.className = 'fa'
        span.style.display = 'none'
        document.body.appendChild(span)
        const fontFamily = getComputedStyle(span).fontFamily
        _isFaAvailable = fontFamily.includes('Awesome')
        span.remove()
    }
    return _isFaAvailable
}

export function enableFontAwesome(cdnUrl?: string) {
    const url = cdnUrl || 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
    // Reset cache so isFontAwesomeAvailable will recheck
    _isFaAvailable = undefined
}

export function fa(...classNames: string[]) {
    if (isFontAwesomeAvailable()) {
        return createElement(null, 'i', ['fa', ...classNames])
    }
    const text = classNames[0].replace('fa-', '')
    const cvt: Record<string, string> = {
        'bars': '☰',
    }
    return createElement(null, 'span', [], cvt[text] || text)
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    parent: Element | null, 
    tagName: K, 
    classes: string[] = [], 
    child?: string|HTMLElement, 
    style: Partial<CSSStyleDeclaration> = {},
    attributes: Partial<Record<keyof HTMLElementTagNameMap[K], any>> = {}
) {
    const e = document.createElement(tagName)
    if (classes.length > 0) e.classList.add(...classes.filter(c => c))
    if (parent) parent.appendChild(e)
    if (child) {
        if (typeof child === 'string') {
            e.textContent = child
        } else {
            e.appendChild(child)
        }
    }
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

export function createButton(parent: Element | null, classes: string[] = [], child: string|HTMLElement, onclick = () => {}) {
    const button = createElement(parent, 'button', classes, child)
    button.onclick = onclick
    return button
}

export function createCheck(parent: Element | null, classes: string[] = [], labelText: string, checked = false, onChange = (checked: boolean) => {}) {
    // 使用 label 替代 button，利用 label 的原生特性实现点击文字切换 checkbox
    // 使用 d-flex 和 align-items-center 实现垂直居中对齐
    const btn = createElement(parent, 'label', ['btn', 'd-flex', 'align-items-center', ...classes])
    
    const checkbox = createElement(btn, 'input', ['me-2'], '', {}, {type: 'checkbox'})
    // 消除 checkbox 可能存在的默认 margin 导致的对齐偏差
    checkbox.style.marginTop = '0'
    createElement(btn, 'span', [], labelText)

    checkbox.checked = checked
    checkbox.onchange = () => {
        onChange(checkbox.checked)
    }

    return { btn, checkbox }
}

export function createCheckBtn(parent: Element | null, classes: string[] = [], labelText: string, accentColor?: string, checked = false, onChange = (checked: boolean) => {}) {
    const div = createElement(parent, 'div', ['input-group', 'w-auto', ...classes])
    div.style.cursor = 'pointer'
    const label = createElement(div, 'label', ['input-group-text'], '', {userSelect: 'none'})
    const checkbox = createElement(label, 'input', ['me-2'], '', {}, {type: 'checkbox'})
    createElement(label, 'span', ['me-2'], ' ', {backgroundColor: '#cccccc', width: '1px', height: '80%'})
    label.append(labelText)
    label.style.cursor = 'pointer'

    checkbox.checked = checked
    if (accentColor) label.style.backgroundColor = checked ? accentColor : ''
    checkbox.onchange = () => {
        if (accentColor) label.style.backgroundColor = checkbox.checked ? accentColor : ''
        onChange(checkbox.checked)
    }

    return { div, checkbox }
}

export function createTable(parent: Element|null, props: string[] = [], classes: string[] = [], styles: Partial<CSSStyleDeclaration> = {}) {
    const tbl = createElement(parent, 'table', classes, '', styles)
    const thead = createElement(tbl, 'thead')
    const tr = createElement(thead, 'tr')
    const headCells = props.map(p => createElement(tr, 'th', [], p))
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
        } else if (typeof e === 'string') {
            createElement(dc, 'pre', ['text-start', 'overflow-auto'], e)
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

// If the handler returns true, the dialog will be closed
export type ButtonAction = () => boolean|void|Promise<boolean|void>

export interface DialogOptions<T> {
    classes?: string[]
    style?: Partial<CSSStyleDeclaration>
    softDismissable?: boolean // default: true
    actions?: string[] | Record<string, ButtonAction>
}

export type DialogElements = {
    dialog: HTMLDialogElement,
    header: HTMLDivElement,
    closeButton: HTMLButtonElement,
    contentArea: HTMLDivElement,
    footer: HTMLDivElement,
    buttons: Record<string, HTMLButtonElement>
}

export function showDialog<T>(
    title: string, 
    content: string | HTMLElement | undefined = undefined, 
    options: DialogOptions<T> = {},
    onCreate?: (elements: DialogElements, finisher: (value?: T) => void) => void
) {
    const dialog = createElement(document.body, 'dialog', options.classes || [], '', {
        padding: '5px',
        display: 'flex',
        flexDirection: 'column',
        resize: 'both',
        ...(options.style || {})
    })
    // create a top bar with title and a close button to the right
    const header = createElement(dialog, 'div', ['d-flex', 'justify-content-between', 'align-items-center', 'pb-2', 'border-bottom', 'mb-2', 'mt-1', 'pe-2'])
    const titleElem = createElement(header, 'h4', ['m-0', 'ms-2'], title)
    const closeButton = createElement(header, 'button', ['btn', 'btn-close'])

    let resolver: ((value?: T) => void)
    const promise = new Promise<T|undefined>((resolve) => {
        resolver = resolve
    })
    const finishFunc = (value?: T) => {
        dialog.close()
        dialog.remove()
        resolver(value)
    }
    dialog.addEventListener('cancel', () => {
        finishFunc()
    })
    if (options.softDismissable ?? true) {
        dialog.addEventListener('mousedown', (e) => {
            if (e.target === dialog) {
                const rect = dialog.getBoundingClientRect()
                const me = e as MouseEvent
                if (me.clientX < rect.left || me.clientX > rect.right || me.clientY < rect.top || me.clientY > rect.bottom) {
                    finishFunc()
                }
            }
        })
    }
    closeButton.onclick = () => finishFunc()

    const { actions } = options
    const buttons: Record<string, HTMLButtonElement> = {}
    const dc = createElement(dialog, 'div', [], '', {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        minHeight: '0'
    })
    const contentArea = createElement(dc, 'div', [], '', {
        flex: '1',
        overflow: 'auto',
        padding: '0 10px'
    }, {
        tabIndex: -1
    })
    if (content) {
        if (typeof content === 'string') {
            contentArea.textContent = content
        } else if (content instanceof HTMLElement) {
            contentArea.appendChild(content)
        }
    }

    const footer = createElement(dc, 'div', ['mt-2', 'mb-2'])
    
    if (actions) { // Only add footer if actions exist
        createElement(footer, 'hr')
        const footerToolbar = createElement(footer, 'div', ['d-flex', 'justify-content-center', 'gap-2'], '', {
            flexShrink: '0'
        })

        const acts = actions
        if (Array.isArray(acts)) {
            for (const btnText of acts) {
                const button = createElement(footerToolbar, 'button', ['btn', 'btn-outline-secondary'], btnText)
                button.onclick = () => {
                    finishFunc(btnText as any)
                }
                buttons[btnText] = button
            }
        } else {
            for (const [btnText, handler] of Object.entries(acts)) {
                const button = createElement(footerToolbar, 'button', ['btn', 'btn-outline-secondary'], btnText)
                button.onclick = async () => {
                    const shouldClose = await handler()
                    if (shouldClose) {
                        finishFunc(btnText as any)
                    }
                }
                buttons[btnText] = button
            }
        }
    }

    if (onCreate) {
        onCreate({ dialog, header, closeButton, contentArea, footer, buttons }, finishFunc)
    }
    dialog.showModal()
    // Keep current page scroll position when moving focus into the dialog.
    try {
        contentArea.focus({ preventScroll: true })
    } catch {
        contentArea.focus()
    }

    // reflow
    if (content || actions) {
        dialog.style.height = `${dialog.offsetHeight + 1}px`
        dialog.style.width = `${dialog.offsetWidth + 1}px`
    }
    return promise
}

export function showInDialog(title: string, content: string|HTMLElement, actions: string[] | Record<string, ButtonAction> = ['Close']) {
    return showDialog<string>(title, content, {
        actions,
        softDismissable: false
    })
}

// information extractor is used to construct a information pane based on the object data
export type InformationExtractor = (obj: object) => HTMLElement | Promise<HTMLElement>
let informationExtractor: InformationExtractor | null = null
export function setInformationExtractor(extractor: InformationExtractor) {
    informationExtractor = extractor
}

export type EntityParser = (path: string[], value: any) => EntityRenderer|undefined
let globalEntityParser: EntityParser | null = null
export function setGlobalEntityParser(parser: EntityParser) {
    globalEntityParser = parser
}

export async function showJsonResult(title: string, content: string | object, parser?: EntityParser) {
    const obj = typeof content === 'string' ? JSON.parse(content) : content
    const fullText = JSON.stringify(obj, null, 2)
    const entityParser = (parser || globalEntityParser)? (path: string[], value: any) => {
        if (parser) {
            const r = parser(path, value)
            if (r) return r
        }
        if (globalEntityParser) {
            return globalEntityParser(path, value)
        }
    }: undefined
    let stringFoldThreshold = 80
    const createJsonViewer = async () => {
        return await createCodeMirrorJsonViewer(obj, {
            stringFoldThreshold,
            visualizeCallback: entityParser
        })
    }

    const div = createElement(null, 'div')
    div.append(await createJsonViewer())

    const actions: Record<string, ButtonAction> = {
        "Fold Less": async () => {
            stringFoldThreshold += 80
            div.replaceChildren(await createJsonViewer())
        },
        "Fold More": async () => {
            stringFoldThreshold -= 80
            if (stringFoldThreshold < 80) stringFoldThreshold = 80
            div.replaceChildren(await createJsonViewer())
        },
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

export function showGeneralText(title: string, content: string) {
    const pre = createElement(null, 'pre')
    pre.style.maxWidth = '80vw'
    pre.style.whiteSpace = 'pre-wrap'
    pre.style.wordBreak = 'break-all'
    pre.textContent = content
    showDialog(title, pre, {
        actions: {
            parseJson: () => {
                const objects = tu.extractJsonObjects(content)
                showJsonResult('Parsed JSON Objects', objects)
            }
        }
    })
}

export async function showConfirmationDialog(title: string, text: string) {
    const r = await showDialog(title, text, {
        style: { width: '400px' },
        softDismissable: false,
        actions: ['OK', 'Cancel']
    })
    return r === 'OK'
}

export type InputField = {
    tip: string,
    initialValue?: string,
    multiLine?: boolean
}
export function showInputDialog(title: string, fields: InputField[]) {
    return showDialog<string[]>(title, undefined, {
        classes: [],
        style: {width: '50vw'},
        actions: ['OK', 'Cancel'],
        softDismissable: false
    }, (elements, finish) => {
        const inputArea = createInputArea(elements.contentArea, fields.map(f => (
            {
                type: 'input',
                id: f.tip.toString(),
                label: f.tip,
                initialValue: f.initialValue,
                multiLine: f.multiLine
            })
        ))

        const finishWithValue = () => finish(Object.values(inputArea.inputs).map(input => input.value))

        if (fields.length === 1 && !fields[0].multiLine) {
            const firstInput = Object.values(inputArea.inputs)[0]
            firstInput.addEventListener('keydown', async (evt: Event) => {
                const e = evt as KeyboardEvent
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    finishWithValue()
                }
            })
        }

        elements.buttons['OK'].onclick = () => finishWithValue()
        elements.buttons['Cancel'].onclick = () => finish()
    })
}

export async function prompt(title: string, tip: string | HTMLElement, initialValue?: string) {
    return showDialog<string>(title, undefined, {
        classes: [],
        style: {width: '50vw'},
        actions: ['OK', 'Cancel'],
        softDismissable: true
    }, (elements, finish) => {
        createElement(elements.contentArea, 'div', ['text-muted', 'mb-1'], tip)
        const input = createElement(elements.contentArea, 'input', ['form-control'], '', {}, { value: initialValue || '' })
        const finishWithValue = () => finish(input.value)
        input.addEventListener('keydown', async (evt: Event) => {
                const e = evt as KeyboardEvent
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    finishWithValue()
                }
        })

        elements.buttons['OK'].onclick = () => finishWithValue()
        elements.buttons['Cancel'].onclick = () => finish()
    })
}

export async function promptMultiline(title: string, tip: string | HTMLElement, initialValue?: string) {
    return showDialog<string>(title, undefined, {
        classes: [],
        style: {width: '50vw'},
        actions: ['OK', 'Cancel'],
        softDismissable: true
    }, (elements, finish) => {
        createElement(elements.contentArea, 'div', ['text-muted', 'mb-1'], tip)
        const input = createElement(elements.contentArea, 'textarea', ['form-control'], '', {}, { value: initialValue || '' })
        input.rows = 5
        const finishWithValue = () => finish(input.value)
        elements.buttons['OK'].onclick = () => finishWithValue()
        elements.buttons['Cancel'].onclick = () => finish()
    })
}

export type InputElement = string | {
    name: string
    valueId?: string // For input type
    initialValue?: string // For input type
    onClick?: (params: Record<string, string>) => HTMLElement | Promise<HTMLElement> | void
}

export type Input = {
    type: 'input' | 'button' | 'select',
    id: string,
    label?: string,
    options?: string[], // for select
    grow?: number,
    initialValue?: string
}
/**
 * Simple form: createInputArea(parent, 'input:name Name | input:age Age | button:search Search')
 */
export function createInputArea(parent: Element|null, elements: string | Input[]) {
    if (typeof elements === 'string') {
        // schema in the string: input:user User Name | input:age | button:search
        const parts = elements.split('|').map(p => p.trim())
        const params = parts.map(part => {
            const colonPos = part.indexOf(':')
            const spacePos = part.indexOf(' ')
            if (colonPos === -1) {
                throw new Error(`Invalid input area schema: ${part}`)
            }
            const type = part.substring(0, colonPos)
            const id = (spacePos === -1) ? part.substring(colonPos + 1) : part.substring(colonPos + 1, spacePos)
            const name = (spacePos === -1) ? undefined : part.substring(spacePos + 1)
            return { type: type as 'input' | 'button' | 'select', id, name }
        })
        return createInputArea(parent, params)
    }
    const inputs: Record<string, HTMLInputElement> = {}
    const buttons: Record<string, HTMLButtonElement> = {}
    const selects: Record<string, HTMLSelectElement> = {}
    const div = createElement(parent, 'div', ['d-flex', 'gap-2', 'overflow-auto'])
    for (const e of elements) {
        if (e.type === 'input') {
            const {ig, input} = createAutofillInput(e.label || e.id, '', e.initialValue || '', e.id)
            // make input group grow to fill available space
            ig.classList.add(`flex-shrink-0`, 'w-auto')
            ig.style.flexGrow = (e.grow || 1).toString()
            // ig.style.width = '0'
            div.appendChild(ig)
            inputs[e.id] = input
        } else if (e.type === 'button') {
            const btn = createButton(div, ['btn', 'btn-primary'], e.label || e.id)
            buttons[e.id] = btn
        } else if (e.type === 'select') {
            const ig = createElement(div, 'div', ['input-group', 'flex-shrink-0', 'w-auto'])
            const label = createElement(ig, 'label', ['input-group-text'], e.label || e.id, {minWidth: '100px'})
            const select = createElement(ig, 'select', ['form-select'], '', {}, {id: e.id})
            if (e.options) {
                for (const option of e.options) {
                    const optionElem = createElement(select, 'option', [], option, {}, {value: option})
                    if (e.initialValue && e.initialValue === option) {
                        optionElem.selected = true
                    }
                }
            }
            selects[e.id] = select
        }
    }
    return { div, inputs, buttons, selects }
}

export function createDataArea(parent: Element|null, foldable: boolean, params: InputElement[]) {
    const div = createElement(parent, 'div', ['border', 'border-light-subtle', 'mb-2'])
    const regulatedParams = params.map(p => (typeof p === 'string')? { name: p } : p)
    const inputArea = createElement(div, 'div', ['p-1', 'd-flex', 'gap-2', 'overflow-auto'])
    const resultArea = createElement(div, 'div', ['mt-2', 'p-1'])
    const inputs = {} as Record<string, HTMLInputElement>

    const state = tu.createObservableState(null, {showResult: true}, s => {
        resultArea.style.display = s.showResult ? '' : 'none'
    })

    if (foldable) {
        const toggleBtn = createElement(inputArea, 'button', ['btn', 'btn-secondary'])
        toggleBtn.title = 'Show/Hide Result Area'
        toggleBtn.onclick = () => state.showResult = !state.showResult
        state.addObserver(s => toggleBtn.replaceChildren(s.showResult ? fa('fa-chevron-up') : fa('fa-chevron-down')))
    }

    for (const p of regulatedParams) {
        if (p.onClick) {
            // button
            const btn = createButton(inputArea, ['btn', 'btn-primary'], p.name, async () => {
                if (!p.onClick) return
                const params = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value]))
                const r = await callAsyncFunctionWithProgress(async () => await p.onClick!(params))
                if (r) {
                    setContent(resultArea, r)
                }
                state.showResult = true
            })
            btn.style.whiteSpace = 'nowrap'
        } else {
            // input
            const {ig, input} = createAutofillInput(p.name, '', p.initialValue || '', p.valueId || p.name)
            // make input group grow to fill available space
            ig.classList.add('flex-grow-1')
            ig.style.minWidth = '200px'
            inputArea.appendChild(ig)
            inputs[p.valueId || p.name] = input
        }
    }
    return div
}

/**
 * Given an user provided handler: create input controls, handle user interactions, and show result area.
 */
export function createInputAction(title: string, actionName: string, valueId: string, handler: (value: string) => Promise<HTMLElement>, value?: string) {
    const div = createElement(null, 'div', ['border', 'border-light-subtle', 'rounded'])
    const resultArea = createElement(null, 'div', ['mt-2', 'p-1'])
    const {ig, input, button} = createAutofillInput(title, '', '', valueId, async v => {
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

export function createAutofillInput(title: string, placeholder: string, initialValue: string, valueId = title, handler?: (value: string) => void, btn?: string) {
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
    input.value = initialValue || localStorage.getItem(`input-${valueId}`) || ''
    label.style.cursor = 'pointer'
    label.onclick = async () => {
        // autofill support
        const predefined = autofillProvider(valueId)
        const candidates = [
            ...predefined,
            ...history.map(h => ({value: h, comment: 'from history'})).filter(p => !predefined.find(pp => pp.value === p.value))
        ]
        // add current value to candidates if not exists
        if (!candidates.find(c => c.value === input.value) && input.value.trim() !== '') {
            candidates.unshift({value: input.value, comment: 'current value'})
        }
        if (candidates.length !== 0) {
            const r = await chooseOne(candidates)
            if (r !== undefined) {
                input.value = r
                localStorage.setItem(`input-${valueId}`, input.value)
                updateHistory(r)
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
    const r = await showSelection('Please choose one item', data, {pickAndClose: true, showStatus: false, showToolbar: false})
    return r ? r[0] : undefined
}

export type SelectionItem = AnnotatedString | string
export type DraggableSortedContainerOption = {
    showOrder: boolean
    interactive: boolean
    removable: boolean
    emptyText: string
    onChange: (items: string[]) => void
}

export class DraggableSortedContainer {
    root: HTMLElement
    private items: string[] = []
    private dragFromIndex = -1

    constructor(parent: Element | null, private cfg: Partial<DraggableSortedContainerOption> = {}) {
        this.root = createElement(parent, 'div', ['d-flex'], '', {
            whiteSpace: 'nowrap',
            overflow: 'auto',
            textOverflow: 'ellipsis'
        })
    }

    setStrings(arr: string[]) {
        this.items = [...arr]
        this.render()
    }

    getStrings(arr: string[] = []) {
        arr.length = 0
        arr.push(...this.items)
        return arr
    }

    private emitChange() {
        this.cfg.onChange?.([...this.items])
    }

    private render() {
        this.root.innerHTML = ''

        if (this.items.length === 0) {
            createElement(this.root, 'span', ['text-muted'], this.cfg.emptyText || '(none)')
            return
        }

        for (const [i, item] of this.items.entries()) {
            const chip = createElement(this.root, 'span', ['me-1', 'px-1', 'rounded', 'd-inline-flex', 'align-items-center'], '', {
                border: '1px solid #cccccc',
                backgroundColor: '#f8f9fa',
                userSelect: 'none'
            })
            createElement(chip, 'span', ['me-1'], this.cfg.showOrder ? `${i + 1}: ${item}` : item)

            const clearDropHint = () => {
                chip.style.borderColor = '#cccccc'
                chip.style.boxShadow = ''
            }

            const interactive = this.cfg.interactive ?? true
            if (interactive) {
                chip.draggable = true
                chip.title = 'Drag to reorder'

                chip.ondragstart = (evt: DragEvent) => {
                    this.dragFromIndex = i
                    evt.dataTransfer?.setData('text/plain', `${i}`)
                    if (evt.dataTransfer) evt.dataTransfer.effectAllowed = 'move'
                    chip.style.opacity = '0.6'
                }

                chip.ondragend = () => {
                    chip.style.opacity = '1'
                    this.dragFromIndex = -1
                    clearDropHint()
                }

                chip.ondragover = (evt: DragEvent) => {
                    evt.preventDefault()
                    const rect = chip.getBoundingClientRect()
                    const insertAfter = evt.clientX > rect.left + rect.width / 2
                    chip.style.borderColor = insertAfter ? '#198754' : '#0d6efd'
                    chip.style.boxShadow = insertAfter
                        ? 'inset -3px 0 0 #198754'
                        : 'inset 3px 0 0 #0d6efd'
                }

                chip.ondragleave = () => {
                    clearDropHint()
                }

                chip.ondrop = (evt: DragEvent) => {
                    evt.preventDefault()
                    clearDropHint()

                    const raw = evt.dataTransfer?.getData('text/plain')
                    const from = raw ? parseInt(raw, 10) : this.dragFromIndex
                    if (Number.isNaN(from) || from < 0 || from >= this.items.length || from === i) return

                    const rect = chip.getBoundingClientRect()
                    const insertAfter = evt.clientX > rect.left + rect.width / 2
                    const insertIndex = i + (insertAfter ? 1 : 0)

                    const newItems = [...this.items]
                    const [moved] = newItems.splice(from, 1)
                    const adjustedIndex = from < insertIndex ? insertIndex - 1 : insertIndex
                    newItems.splice(adjustedIndex, 0, moved)

                    this.items = newItems
                    this.render()
                    this.emitChange()
                }
            }

            if (this.cfg.removable ?? true) {
                const removeBtn = createElement(chip, 'a', ['text-decoration-none'], '✕', { cursor: 'pointer' })
                removeBtn.title = 'Remove'
                removeBtn.draggable = false
                removeBtn.onclick = () => {
                    this.items = this.items.filter((_, index) => index !== i)
                    this.render()
                    this.emitChange()
                }
            }
        }
    }
}

export type SelectOption = {
    singleSelect: boolean
    pickAndClose: boolean
    initialSelection: string[]
    showOrder: boolean
    showToolbar: boolean
    showStatus: boolean

    // when true, selected items in status bar can be reordered and removed quickly
    // default: true
    statusInteractive: boolean

    // return `newSelection` if the new selection is valid
    // otherwise, return a selection if checker can fix invalid selection
    // otherwise, return an error message
    checker: (oldSelection: string[], newSelection: string[]) => string[] | string

    // used to apply custom styles to individual items
    styleModifier: (item: string, elem: HTMLElement) => void

    // dialog styles
    dlgStyle: Partial<CSSStyleDeclaration>
}

export function showSelection(title: string, options: SelectionItem[], cfg: Partial<SelectOption> = {}) {
    return showDialog<string[]>(title, undefined, {
        classes: [], 
        style: {width: '80vw', ...cfg.dlgStyle}, 
        actions: ['OK', 'Cancel'],
        softDismissable: true
    }, (de, finish) => {
        // local state
        let selection = cfg.initialSelection || []
        const elements = {} as Record<string, HTMLSpanElement>
        let currentAlert = ''

        // UI
        const dc = createElement(de.contentArea, 'div', ['d-flex', 'flex-column'])
        const statusBar = createElement(dc, 'span', ['form-control'])
        const selectedPrefix = createElement(statusBar, 'span', ['me-2'], 'Selected: ', { color: 'blue' })
        const selectedItems = new DraggableSortedContainer(statusBar, {
            emptyText: '(none)',
            showOrder: cfg.showOrder,
            interactive: (cfg.statusInteractive ?? true) && !cfg.singleSelect,
            removable: (cfg.statusInteractive ?? true) && !cfg.singleSelect,
            onChange: (newSelection) => onSelectionChange(selection, newSelection)
        })
        const toolbar = createElement(dc, 'div', ['input-group', 'mb-4', 'mt-2'])
        const filter = createElement(toolbar, 'input', ['form-control'], '', {}, {placeholder: 'Filter'})
        const selectAllBtn = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], '☑')
        const unSelectAllBtn = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], '☐')
        const main = createElement(dc, 'div', ['d-flex', 'overflow-auto', 'flex-wrap', 'gap-2', 'p-2'])
        const alert = createElement(dc, 'div', ['alert', 'alert-danger', 'd-none'])

        if (cfg.pickAndClose) cfg.singleSelect = true

        syncDisplay(toolbar, cfg.showToolbar ?? true)
        syncDisplay(statusBar, cfg.showStatus ?? true)
        syncDisplay(selectAllBtn, !cfg.singleSelect)
        syncDisplay(unSelectAllBtn, !cfg.singleSelect)
        syncDisplay(de.footer, !cfg.pickAndClose)

        function updateUI() {
            if (!statusBar.firstChild) {
                statusBar.appendChild(selectedPrefix)
                statusBar.appendChild(selectedItems.root)
            }
            selectedItems.setStrings(selection)

            for (const [value, div] of Object.entries(elements)) {
                const isItemSelected = selection.includes(value)
                div.classList.toggle('selected', isItemSelected)
                //div.style.backgroundColor = isItemSelected ? 'rgba(0, 123, 255, 0.5)' : 'rgb(244, 244, 244)'
                div.style.border = '2px solid'
                div.style.borderColor = isItemSelected ? '#0d6efd' : '#cccccc'
            }

            alert.textContent = currentAlert
            syncDisplay(alert, currentAlert !== '')
        }

        function onSelectionChange(oldSelection: string[], newSelection: string[]) {
            const r = cfg.checker?.(oldSelection, newSelection)
            if (typeof r === 'string') {
                // invalid state
                currentAlert = r
                selection = newSelection
            } else {
                // fixed state
                currentAlert = ''
                selection = r || newSelection
                if (cfg.pickAndClose && selection.length > 0) {
                    finish(selection)
                    return
                }
            }
            updateUI()
        }

        for (const d of options.map(o => typeof o === 'string' ? { value: o } : o)) {
            const div = createElement(main, 'div', ['rounded', 'hover-effect', 'text-center', 'p-2'], '', { cursor: 'pointer', minWidth: '100px' })
            createElement(div, 'span', [], d.value)
            if (d.comment) {
                createElement(div, 'span', [], '', { border: '1px solid #cccccc', margin: '0 5px', width: '1px', height: '80%' })
                createElement(div, 'span', ['text-muted'], d.comment)
            }
            elements[d.value] = div
            cfg.styleModifier?.(d.value, div)
            div.onclick = () => {
                const newSelection = cfg.singleSelect ? [d.value] : (selection.includes(d.value) ? selection.filter(v => v !== d.value) : [...selection, d.value])
                onSelectionChange(selection, newSelection)
            }
        }

        filter.oninput = () => {
            const v = filter.value.toLowerCase()
            // for (const item of Array.from(main.children)) {
            //     syncDisplay(item as HTMLElement, item.textContent?.toLowerCase().includes(v))
            // }
            for (const [value, elem] of Object.entries(elements)) {
                console.log(value, v, value.toLowerCase().includes(v), elem)
                syncDisplay(elem as HTMLElement, value.toLowerCase().includes(v))
            }
        }

        selectAllBtn.onclick = () => onSelectionChange(selection, Object.keys(elements))
        unSelectAllBtn.onclick = () => onSelectionChange(selection, [])
        de.buttons['OK'].onclick = () => finish(selection)
        de.buttons['Cancel'].onclick = () => finish()

        updateUI()
        try {
            filter.focus({ preventScroll: true })
        } catch {
            filter.focus()
        }
    })
}

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
    onItemClick?: (item: T, dataIndex: number) => boolean|undefined
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

    // now paging section, which looks like 4 buttons and an edit: "<< < [8] > >>

    const hideUniformProps = cfg.hideUniformProps??true
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
        console.log('createActionArea', item, index)
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

    // properties used to construct visible props
    // presentation props should be put before other props but after raw index prop
    const presentationProps = cfg.renderOption?.props ?? []
    const allPropsWithRaw = [
        rawIndexProp,
        ...presentationProps,
        ...allProps.filter(p => !presentationProps.includes(p)),
        actionProp
    ].filter(v => !!v) as string[]
    let meaningfulProps = allProps
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
        ...meaningfulProps.filter(p => !presentationProps.includes(p))
    ].filter(v => !!v) as string[]

    function getVisibleProps() {
        const stateProps = state.renderStyle === 'table' ? state.tableProps : state.renderStyle === 'tile' ? state.tileProps : state.wallProps
        const viewOption = getActiveViewRenderOption()
        return stateProps || viewOption?.props || cfg.renderOption?.props || meaningfulPropsWithRaw
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
        ].filter(v => !!v) as ((item: T, dataIndex: number) => boolean)[]
        if (onItemClickFallbackChain.length === 0) return
        element.onclick = (evt) => {
            evt.stopPropagation()
            for (const onItemClickHandler of onItemClickFallbackChain) {
                const handled = onItemClickHandler(item, index)
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
            let card = renderItem(data[i].item, data[i].index)
            if (!card) {
                const item = data[i].item
                const dataIndex = data[i].index
                card = createElement(container, 'div', ['card', 'p-1', 'hover-effect'], '', getItemStyle(item, dataIndex))

                // const cardBody = createElement(card, 'div', ['card-body', 'd-flex', 'flex-column', 'gap-2'])
                for (const [j, prop] of getVisibleProps().entries()) {
                    const element = renderPropValue(item, prop, dataIndex)
                    card.appendChild(element)
                }
            }

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
        counts.textContent = `${data.length} / ${arr.length}`
        pager.setTotalItems(data.length)
        filter.style.backgroundColor = hasFilterError ? '#ffcccc' : (data.length < arr.length ? '#ccffcc' : '')
    }

    const zhCollator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base' })

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
        }
    })

    // logic start here
    syncRegionExistence()
    applyFilterAndSort()
    return view
}

export type VisualizeObjectConfig<T extends object> = {
}

export function visualizeObject(obj: object, cfg: Partial<VisualizeObjectConfig<any>> = {}) {
    // create a table to render object properties
    const table = createElement(null, 'table', ['table', 'table-bordered'])
    const tbody = createElement(table, 'tbody')
    const props = tu.dataProperties([obj])
    for (const prop of props) {
        const tr = createElement(tbody, 'tr')
        createElement(tr, 'th', [], prop)
        const value = obj[prop as keyof typeof obj] as any
        const td = createElement(tr, 'td', [], value instanceof Object ? tu.stringify(value) : `${value}`)
    }
    return table
}

export function createFoldedString(content: string, maxLength: number) {
    if (content.length <= maxLength) {
        return createElement(null, 'span', [], content)
    } else {
        const f = tu.getStringFoldingIndicator(content.length, maxLength)
        const visibleLength = content.length - f.foldedLength
        const c = Math.floor(visibleLength / 2)
        const leftContent = content.slice(0, c)
        const rightContent = content.slice(content.length - c)
        // const shortContent = leftContent + `...` + rightContent
        const div = createElement(null, 'div')
        const folder = createElement(div, 'span', ['me-1'], '>>')
        const shortContent = createElement(div, 'span')
        createElement(shortContent, 'span', [], leftContent)
        const foldIndicator = createElement(shortContent, 'span', ['text-muted', 'border'], f.foldIndicator)
        createElement(shortContent, 'span', [], rightContent)
        const longContent = createElement(div, 'span', [], content, { display: 'none' })
        folder.style.color = 'blue'
        folder.style.cursor = 'pointer'
        folder.onclick = () => {
            if (folder.textContent === '>>') {
                folder.textContent = '<<'
            } else {
                folder.textContent = '>>'
            }
            syncDisplay(shortContent, folder.textContent === '>>')
            syncDisplay(longContent, folder.textContent === '<<')
        }
        foldIndicator.style.cursor = 'pointer'
        foldIndicator.onclick = () => showGeneralText('Full Content', content)
        
        return div
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

export function getStringColor(str: string, s = 100, l = 90) {
    const v = tu.simpleHash(str)
    const h = v % 360
    return `hsl(${h}, ${s}%, ${l}%)`
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
    pageSizeCtrl: HTMLElement
    currentPage = 0
    constructor(private totalItems: number, private pageSize: number, private onPageChange: (pageIndex: number, pageSize: number) => void) {
        this.toolbar = createElement(null, 'div', ['input-group', 'w-auto', 'flex-shrink-0'])
        const btnClass = ['btn', 'btn-secondary']
        this.firstBtn = createElement(this.toolbar, 'button', btnClass, '<<')
        this.privBtn = createElement(this.toolbar, 'button', btnClass, '<')
        this.pageText = createElement(this.toolbar, 'button', ['btn', 'btn-secondary'], '1 / 1')
        this.pageSizeCtrl = createElement(this.toolbar, 'span', ['btn', 'btn-secondary'], '[20]')
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
        this.pageSizeCtrl.onclick = async () => {
            const size = await prompt('Page Size', 'Enter number of items per page (enter 0 or negative number to disable paging)', `${this.pageSize}`)
            if (size) {
                const n = parseInt(size)
                if (!isNaN(n)) {
                    this.setPageSize(n > 0 ? n : Infinity)
                    this.gotoPage(0)
                }
            }
        }
        // this.gotoPage(this.currentPage)
        this.updateUI()
    }

    setPageSize(pageSize: number) {
        this.pageSize = pageSize
    }

    setTotalItems(totalItems: number) {
        this.totalItems = totalItems
    }

    getPageRange(page: number) {
        const startIndex = this.pageSize === Infinity ?0 : page * this.pageSize
        const endIndex = Math.min(startIndex + this.pageSize, this.totalItems)
        return { startIndex, endIndex }
    }

    private updateUI() {
        const totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize))
        this.pageText.textContent = `${this.currentPage + 1} / ${totalPages}`
        this.pageSizeCtrl.textContent = `📄 ${this.pageSize === Infinity ? '' : this.pageSize}`
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

    refreshCurrentPage() {
        this.gotoPage(this.currentPage)
    }

    getElement() {
        return this.toolbar
    }
}

export function createButtonGroup(parent: Element | null, buttons: Record<string, () => void>) {
    const div = createElement(parent, 'div', ['btn-group'])
    for (const [name, action] of Object.entries(buttons)) {
        createButton(div, ['btn', 'btn-outline-secondary'], name, action)
    }
    return div
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
        
        // Check if the element is inside a dialog
        const dialog = e.closest('dialog')
        const container = dialog || document.body
        
        const dropdown = createElement(container, 'div', ['dropdown-menu', 'show'], '', {
            position: 'fixed',
            zIndex: '1050'
        })
        const rect = e.getBoundingClientRect()
        
        // Position dropdown and check for overflow
        // If inside dialog, we need to adjust coordinates relative to the dialog
        let left = rect.left
        let top = rect.bottom
        
        // Add dropdown to DOM temporarily to get its dimensions
        container.appendChild(dropdown)
        
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

export function createFoldableArea(parent: Element | null, title: string, content?: HTMLElement, initiallyFolded = true) {
    // create a foldable area using bootstrap card
    const div = createElement(parent, 'div', ['card', 'mb-2', 'mt-2'])
    const header = createElement(div, 'div', ['card-header', 'd-flex', 'justify-content-between', 'align-items-center'], '', {cursor: 'pointer'})
    const titleElem = createElement(header, 'span', [], title)
    const toggleBtn = createElement(header, 'button', ['btn', 'btn-sm', 'btn-outline-secondary'])
    const body = createElement(div, 'div', ['card-body', 'p-1'])
    if (content) {
        body.appendChild(content)
    }

    const state = tu.createObservableState(null, { folded: initiallyFolded }, s => {
        toggleBtn.replaceChildren(s.folded ? fa('fa-chevron-down') : fa('fa-chevron-up'))
        body.style.display = s.folded ? 'none' : ''
        div.style.borderColor = s.folded ? '#ccc' : '#007bff'
    })

    header.onclick = () => state.folded = !state.folded
    return { div, header, body, toggleBtn }
}

class CodeMirrorLoader {
    static modules: any = null;

    static async getModules() {
        if (!this.modules) {

            // This is to ensure all codemirror modules use the same version of @codemirror/state
            // Otherwise, there will be conflicts, with errors like 
            // "Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple 
            // instances of @codemirror/state are loaded, breaking instanceof checks."
            const stateVer = "6.5.3";
            const deps = `?deps=@codemirror/state@${stateVer}`;

            const [
                state, view, lang, json, search
            ] = await callAsyncFunctionWithProgress(() => Promise.all([
                import(`https://esm.sh/@codemirror/state@${stateVer}`),
                import(`https://esm.sh/@codemirror/view${deps}`),
                import(`https://esm.sh/@codemirror/language${deps}`),
                import(`https://esm.sh/@codemirror/lang-json${deps}`),
                import(`https://esm.sh/@codemirror/search${deps}`)
            ]));

            this.modules = {
                EditorState: state.EditorState,
                EditorView: view.EditorView,
                lineNumbers: view.lineNumbers,
                Decoration: view.Decoration,
                hoverTooltip: view.hoverTooltip,
                keymap: view.keymap,
                syntaxHighlighting: lang.syntaxHighlighting,
                defaultHighlightStyle: lang.defaultHighlightStyle,
                json: json.json,
                search: search.search,
                searchKeymap: search.searchKeymap,
                openSearchPanel: search.openSearchPanel
            };
        }
        return this.modules;
    }
}

export type EntityRenderer = {
    anchorStyle: string,
    render: () => HTMLElement | Promise<HTMLElement>
}
export type VisualizeCallback = (path: string[], value: any) => EntityRenderer|undefined

export type JsonViewerOptions = {
    stringFoldThreshold?: number
    visualizeCallback?: VisualizeCallback
}

export async function createCodeMirrorJsonViewer(obj: object, options: JsonViewerOptions = {}) {
    const { EditorState, EditorView, lineNumbers, Decoration, hoverTooltip, syntaxHighlighting, defaultHighlightStyle, json, search, searchKeymap, openSearchPanel, keymap } = await CodeMirrorLoader.getModules();
    const parent = createElement(null, 'div', [], '', { border: '1px solid #ddd', borderRadius: '4px', height: '100%', overflow: 'hidden' });
    const visulizers = [] as {
        start: number,
        end: number,
        type: 'fold' | 'visualizer',
        marker: any,
        render: EntityRenderer|string
    }[]
    const doc = tu.safeStringify(obj, 2, options.stringFoldThreshold ?? 80, Infinity, false, (path, value, start, end, isTrimmed) => {
        const renderer = options.visualizeCallback?.(path, value)
        if (renderer) {
            visulizers.push({ 
                type: 'visualizer',
                start, 
                end, 
                marker: Decoration.mark({attributes: { style: renderer.anchorStyle }, inclusive: false }),
                render: renderer });
        } else if (typeof value === 'string' && isTrimmed) {
            // this is string folding, we need to higlight it and when hover, show full string with \r\n processed
            visulizers.push({
                type: 'fold',
                start,
                end,
                marker: Decoration.mark({attributes: { style: 'text-decoration: underline dotted; cursor: help;' }, inclusive: false }),
                render: value
            });
        }
    }).str

    // // 创建 Decoration Set
    const commentDecorations = Decoration.set(
      visulizers.map(v => v.marker.range(v.start, v.end))
    );

    // hover tooltip 扩展
    const commentTooltip = hoverTooltip((view:any, pos:number) => {
      // 查找 pos 是否落在某个 comment 范围内
      for (const c of visulizers.filter(v => v.type === 'visualizer')) {
        if (pos >= c.start && pos <= c.end) {
          return {
            pos: c.start,
            end: c.end,
            above: true,        // 提示框显示在上方（可改成 false 在下方）
            create: () => {
              const dom = document.createElement("div");
              const rendered = (c.render as EntityRenderer).render();
              if (rendered instanceof Promise) {
                rendered.then(element => {
                  dom.appendChild(element);
                });
              } else {
                dom.appendChild(rendered);
              }
              return { dom };
            }
          };
        }
      }
      return null; // 没找到返回 null，不显示
    });

    // 点击事件处理器
    const clickHandler = EditorView.domEventHandlers({
      click: (event: MouseEvent, view: any) => {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos === null) return false
        
        // 查找点击位置是否在某个 visualizer 范围内
        for (const c of visulizers) {
          if (pos >= c.start && pos <= c.end) {
            // 找到了，显示对话框
            if (typeof c.render === 'string') {
                showGeneralText('Full Content', c.render)
            } else {
                const rendered = c.render.render()
                if (rendered instanceof Promise) {
                    rendered.then(element => {
                        showDialog('Details', element)
                    })
                } else {
                    showDialog('Details', rendered)
                }
            }
            return true
          }
        }
        return false
      }
    })

    const state = EditorState.create({
      doc,
      extensions: [
        lineNumbers(),                          // 显示行号
        syntaxHighlighting(defaultHighlightStyle), // 默认语法高亮样式
        json(),                                 // JSON 语言支持（解析 + 高亮）
        EditorState.readOnly.of(true),          // 状态级只读：禁止通过键盘/粘贴等修改内容
         EditorView.decorations.of(commentDecorations), // 应用注释装饰
         commentTooltip,                        // 保留 hover tooltip
         clickHandler,                          // 添加点击处理器
        EditorView.theme({
                        "&": { height: "100%", maxWidth: "100%" },
                        ".cm-scroller": { overflow: "auto", maxWidth: "100%" },
                        ".cm-content": { 
                            whiteSpace: "pre-wrap !important", 
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            maxWidth: "100%"
                        },
                        ".cm-line": { 
                            whiteSpace: "pre-wrap !important", 
                            wordBreak: "break-word !important",
                            overflowWrap: "anywhere !important",
                            maxWidth: "100%"
                        }
        }),
        search({ top: true }),                  // 搜索功能，搜索框在顶部
        keymap.of(searchKeymap)               // 搜索相关快捷键
      ]
    });
    const view = new EditorView({ state, parent });
    parent.style.width = '100%'
    parent.style.maxWidth = '80vw'
    parent.style.minHeight = '400px'
    parent.style.maxHeight = '70vh'
    return parent;
}

export async function createCodeMirrorJsonEditor(initialText: string) {
    const { EditorState, EditorView, lineNumbers, syntaxHighlighting, defaultHighlightStyle, json, search, searchKeymap } = await CodeMirrorLoader.getModules();
    const parent = createElement(null, 'div', [], '', { border: '1px solid #ddd', borderRadius: '4px', height: '400px', overflow: 'hidden' });
    const state = EditorState.create({
        doc: initialText,
        extensions: [
            lineNumbers(),                          // 显示行号
            syntaxHighlighting(defaultHighlightStyle), // 默认语法高亮样式
            json(),                                 // JSON 语言支持（解析 + 高亮）
            EditorView.theme({
                "&": { height: "100%" },
                ".cm-scroller": { overflow: "auto" },
                ".cm-content": { whiteSpace: "pre-wrap", wordBreak: "break-word" } // 自动换行
            })
        ]
    });
    const view = new EditorView({ state, parent });

    return {
        div: parent,
        getValue: () => view.state.doc.toString(),
        setValue: (text: string) => {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: text }
            });
        }
    }
}

class MarkdownLoader {
    static module: any = null;
    static async getModule() {
        if (!this.module) {
            this.module = await callAsyncFunctionWithProgress(() => import("https://esm.sh/markdown-it"), 'Loading Markdown-It module...');
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

let chartJsModule: any = null;
export async function createChart(parent: HTMLElement, width: string, height: string, config: any) {
    if (!chartJsModule) {
        chartJsModule = await callAsyncFunctionWithProgress(() => import("https://esm.sh/chart.js/auto"), 'Loading Chart.js...');
    }
    const chartWrapper = createElement(parent, 'div', [], '', {
        // position: 'relative',
        height: `${height}`,
        width: `${width}`,
        maxWidth: '100%',
    })
    const div = createElement(chartWrapper, 'canvas')
    const Chart = chartJsModule.default;
    const chart = new Chart(div.getContext('2d'), config);
    return { canvas: div, chart };
}

export type DataType = 'integer' | 'float' | 'boolean' | 'date' | 'colorName' | 'general'
export function guessDataType(data: string | string[]) : DataType {
    // guess data type wrapped in strings
    if (typeof data === 'string') {
        // number
        if (!isNaN(Number(data))) {
            return data.includes('.') ? 'float' : 'integer'
        }
        // boolean
        const lower = data.toLowerCase()
        if (lower === 'true' || lower === 'false') return 'boolean'
        // color name
        const colorNames = ['red', 'green', 'blue', 'yellow', 'black', 'white', 'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'cyan', 'magenta', 'lime', 'teal', 'navy', 'maroon', 'olive', 'silver', 'gold']
        if (colorNames.includes(lower)) return 'colorName'
        // date
        const date = new Date(data)
        if (!isNaN(date.getTime())) return 'date'
        return 'general'
    } else {
        const types = data.map(guessDataType)
        const stat = tu.groupBy(types, t => t)
        if (stat[0][1].length / data.length >= 0.8) {
            return stat[0][0] as 'integer' | 'float' | 'boolean' | 'date' | 'general'
        }
        return 'general'
    }
}

export async function renderDataInsights(info: tu.DataPropStat[]) {
    const div = createElement(null, 'div')
    // bar chart for selected prop, y axis: count, x axis: unique values / bins
    // configurable:
    // - pick which prop to show
    // - x axis sort by value or count
    // - hide high-count values to make long tail clearer
    // - numeric/date values support configurable bin size for histogram view
    const controls = createElement(div, 'div', ['d-flex', 'flex-wrap', 'gap-2', 'align-items-end', 'mb-2'])
    const chartHost = createElement(div, 'div', ['border', 'border-light-subtle', 'rounded', 'p-2'])
    const chartHeader = createElement(chartHost, 'div', ['d-flex', 'justify-content-between', 'align-items-center', 'mb-2'])
    const title = createElement(chartHeader, 'h6', ['m-0'], 'Data insights')
    const subtitle = createElement(chartHeader, 'small', ['text-muted'], '')
    const chartBody = createElement(chartHost, 'div')

    if (info.length === 0) {
        createElement(chartBody, 'div', ['text-muted'], 'No data insights available.')
        return div
    }

    const propGroup = createElement(controls, 'div', [])
    createElement(propGroup, 'label', ['form-label', 'mb-1'], 'Property')
    const propSelect = createElement(propGroup, 'select', ['form-select']) as HTMLSelectElement
    for (const stat of info) {
        createElement(propSelect, 'option', [], stat.propName, {}, { value: stat.propName })
    }

    const sortGroup = createElement(controls, 'div', [])
    createElement(sortGroup, 'label', ['form-label', 'mb-1'], 'Sort by')
    const sortSelect = createElement(sortGroup, 'select', ['form-select']) as HTMLSelectElement
    createElement(sortSelect, 'option', [], 'Count (desc)', {}, { value: 'count' })
    createElement(sortSelect, 'option', [], 'Value (asc)', {}, { value: 'value' })

    const binGroup = createElement(controls, 'div', [])
    const binLabel = createElement(binGroup, 'label', ['form-label', 'mb-1'], 'Bin size')
    const binInput = createElement(binGroup, 'input', ['form-control'], '', {}, {
        type: 'number',
        min: 1,
        step: 1,
        value: 1
    }) as HTMLInputElement
    const dateBinSelect = createElement(binGroup, 'select', ['form-select'], '', { display: 'none' }) as HTMLSelectElement
    createElement(dateBinSelect, 'option', [], 'Minute', {}, { value: 'minute' })
    createElement(dateBinSelect, 'option', [], 'Hour', {}, { value: 'hour' })
    createElement(dateBinSelect, 'option', [], 'Day', {}, { value: 'day' })
    createElement(dateBinSelect, 'option', [], 'Month', {}, { value: 'month' })
    createElement(dateBinSelect, 'option', [], 'Year', {}, { value: 'year' })

    const hideGroup = createElement(controls, 'div', [])
    createElement(hideGroup, 'label', ['form-label', 'mb-1'], 'Hide count >')
    const hideAboveInput = createElement(hideGroup, 'input', ['form-control'], '', {}, {
        type: 'number',
        min: 0,
        step: 1,
        value: ''
    }) as HTMLInputElement
    hideAboveInput.placeholder = 'No limit'

    const hideLowGroup = createElement(controls, 'div', [])
    createElement(hideLowGroup, 'label', ['form-label', 'mb-1'], 'Hide count <')
    const hideBelowInput = createElement(hideLowGroup, 'input', ['form-control'], '', {}, {
        type: 'number',
        min: 0,
        step: 1,
        value: ''
    }) as HTMLInputElement
    hideBelowInput.placeholder = 'No limit'

    let currentChart: any = null

    function isFiniteNumberString(v: string) {
        const n = Number(v)
        return Number.isFinite(n)
    }

    function toDateLabel(t: number) {
        const d = new Date(t)
        const y = d.getFullYear()
        const m = `${d.getMonth() + 1}`.padStart(2, '0')
        const day = `${d.getDate()}`.padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    function toDateTimeLabel(t: number, unit: 'minute' | 'hour' | 'day' | 'month' | 'year') {
        const d = new Date(t)
        const y = d.getFullYear()
        const m = `${d.getMonth() + 1}`.padStart(2, '0')
        const day = `${d.getDate()}`.padStart(2, '0')
        const h = `${d.getHours()}`.padStart(2, '0')
        const min = `${d.getMinutes()}`.padStart(2, '0')
        if (unit === 'year') return `${y}`
        if (unit === 'month') return `${y}-${m}`
        if (unit === 'day') return `${y}-${m}-${day}`
        if (unit === 'hour') return `${y}-${m}-${day} ${h}:00`
        return `${y}-${m}-${day} ${h}:${min}`
    }

    function floorDateToBoundary(dt: Date, unit: 'minute' | 'hour' | 'day' | 'month' | 'year') {
        const d = new Date(dt)
        d.setSeconds(0, 0)
        if (unit === 'minute') return d
        d.setMinutes(0)
        if (unit === 'hour') return d
        d.setHours(0)
        if (unit === 'day') return d
        d.setDate(1)
        if (unit === 'month') return d
        d.setMonth(0)
        return d
    }

    function aggregateNumeric(values: { value: string, count: number }[], unit: number) {
        const map = new Map<number, number>()
        for (const item of values) {
            const n = Number(item.value)
            if (!Number.isFinite(n)) continue
            const bucket = Math.floor(n / unit) * unit
            map.set(bucket, (map.get(bucket) || 0) + item.count)
        }
        return [...map.entries()].map(([bucket, count]) => ({
            value: unit === 1 ? `${bucket}` : `${bucket} ~ ${bucket + unit}`,
            count,
            _sortValue: bucket,
        }))
    }

    function aggregateDate(values: { value: string, count: number }[], unit: 'minute' | 'hour' | 'day' | 'month' | 'year') {
        const map = new Map<number, number>()
        for (const item of values) {
            const dt = new Date(item.value)
            const t = dt.getTime()
            if (!Number.isFinite(t)) continue
            const bucket = floorDateToBoundary(dt, unit).getTime()
            map.set(bucket, (map.get(bucket) || 0) + item.count)
        }
        return [...map.entries()].map(([bucket, count]) => ({
            value: `${toDateTimeLabel(bucket, unit)}`,
            count,
            _sortValue: bucket,
        }))
    }

    async function render() {
        const stat = info.find(s => s.propName === propSelect.value) || info[0]
        if (!stat) return

        let values = [...stat.uniqueValues]

        const dataType = guessDataType(stat.uniqueValues.map(v => v.value || ''))
        const useHistogram = dataType === 'integer' || dataType === 'float' || dataType === 'date'
        // binGroup.style.display = useHistogram ? '' : 'none'
        const isDate = dataType === 'date'
        binInput.disabled = !useHistogram || isDate
        dateBinSelect.disabled = !isDate
        binInput.style.display = isDate ? 'none' : ''
        dateBinSelect.style.display = isDate ? '' : 'none'
        binLabel.textContent = isDate ? 'Date bin size' : 'Bin size'

        let chartValues: ({ value: string, count: number, _sortValue?: number })[] = values
        const unit = Math.max(1, Number(binInput.value) || 1)
        if (useHistogram) {
            if (isDate) {
                const dateUnit = (dateBinSelect.value || 'day') as 'minute' | 'hour' | 'day' | 'month' | 'year'
                chartValues = aggregateDate(values, dateUnit)
            } else if (values.every(v => isFiniteNumberString(v.value))) {
                chartValues = aggregateNumeric(values, unit)
            }
        }

        const beforeCountFilter = chartValues.length
        const hideBelow = Number(hideBelowInput.value)
        if (Number.isFinite(hideBelow) && hideBelowInput.value.trim() !== '' && hideBelow >= 0) {
            chartValues = chartValues.filter(v => v.count >= hideBelow)
        }
        const hideAbove = Number(hideAboveInput.value)
        if (Number.isFinite(hideAbove) && hideAboveInput.value.trim() !== '' && hideAbove >= 0) {
            chartValues = chartValues.filter(v => v.count <= hideAbove)
        }

        if (sortSelect.value === 'value') {
            if (dataType === 'integer' || dataType === 'float' || dataType === 'date') {
                chartValues.sort((a, b) => (a._sortValue || 0) - (b._sortValue || 0))
            } else {
                chartValues.sort((a, b) => `${a.value}`.localeCompare(`${b.value}`))
            }
        } else {
            chartValues.sort((a, b) => b.count - a.count)
        }

        title.textContent = `Group by "${stat.propName}"`
        subtitle.textContent = `${chartValues.length} categories${chartValues.length !== beforeCountFilter ? ` (filtered from ${beforeCountFilter})` : ''}`

        chartBody.innerHTML = ''
        if (chartValues.length === 0) {
            createElement(chartBody, 'div', ['text-muted'], 'No values to display with current filters.')
            return
        }

        if (currentChart && typeof currentChart.destroy === 'function') {
            currentChart.destroy()
            currentChart = null
        }

        const width = `${Math.max(500, chartValues.length * 55)}px`
        const { chart } = await createChart(chartBody, width, '420px', {
            type: 'bar',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            },
            data: {
                labels: chartValues.map(uv => uv.value || '(empty)'),
                datasets: [{
                    label: stat.propName,
                    data: chartValues.map(uv => uv.count),
                    backgroundColor: chartValues.map(uv => getStringColor(`${uv.value}`, 100, 80)),
                }]
            }
        })
        currentChart = chart
    }

    propSelect.onchange = render
    sortSelect.onchange = render
    hideBelowInput.oninput = render
    hideAboveInput.oninput = render
    binInput.oninput = render
    dateBinSelect.onchange = render

    await render()
    
    return div
}

export function injectStyles() {
    const styleId = 'uu-common-styles'
    if (document.getElementById(styleId)) return
    const style = createElement(document.head, 'style', [], '', {}, { id: styleId })
    style.textContent = `
        dialog::backdrop {
            background: rgba(0,0,0,0.25);            /* 微暗化 */
            backdrop-filter: blur(8px) brightness(0.9);
            -webkit-backdrop-filter: blur(8px) brightness(0.9); /* Safari */
        }
    `
}
