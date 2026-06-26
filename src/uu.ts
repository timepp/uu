// deno-lint-ignore-file no-window
// uu: a set of utility functions for modern web UI

import * as tu from './tu.ts'
export * from './tu.ts'

export type AnnotatedString = {
    value: string,
    comment?: string
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
    // Use label instead of button, leveraging label's native feature to toggle checkbox on text click
    // Use d-flex and align-items-center for vertical center alignment
    const btn = createElement(parent, 'label', ['btn', 'd-flex', 'align-items-center', ...classes])
    
    const checkbox = createElement(btn, 'input', ['me-2'], '', {}, {type: 'checkbox'})
    // Remove potential alignment offset caused by checkbox's default margin
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

    const updateStyle = () => {
        if (accentColor) label.style.backgroundColor = checkbox.checked ? accentColor : ''
    }

    checkbox.checked = checked
    updateStyle() // Set initial style
    
    checkbox.onchange = () => {
        updateStyle()
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
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        resize: 'both',
        ...(options.style || {})
    })
    // create a top bar with title and a close button to the right
    const header = createElement(dialog, 'div', ['d-flex', 'justify-content-between', 'align-items-center', 'p-2', 'border-bottom', 'mb-2'])
    header.style.backgroundColor = '#005cf030'
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
        padding: '0 10px',
        outline: 'none'
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

export function createLoadingSpinner(parent: Element | null, size = '2rem', color = 'primary') {
    const loadingDiv = createElement(parent, 'div', ['d-flex', 'justify-content-center', 'align-items-center', 'p-3'])
    const spinner = createElement(loadingDiv, 'div', ['spinner-border', `text-${color}`], '', { width: size, height: size })
    spinner.setAttribute('role', 'status')
    const spinnerText = createElement(spinner, 'span', ['visually-hidden'], 'Loading...')
    return loadingDiv
}

export type ContentProvider = HTMLElement | ((refresh: boolean) => HTMLElement) | ((refresh: boolean) => Promise<HTMLElement>)
export function createFoldableArea(parent: Element | null, title: string, content?: ContentProvider, initiallyFolded = true) {
    // create a foldable area using bootstrap card
    const div = createElement(parent, 'div', ['card', 'mb-2', 'mt-2'])
    const header = createElement(div, 'div', ['card-header', 'd-flex', 'justify-content-between', 'align-items-center'], '', {cursor: 'pointer'})
    const titleElem = createElement(header, 'span', [], title)
    const btnGroup = createElement(header, 'div', ['btn-group'])
    const refreshBtn = createElement(btnGroup, 'button', ['btn', 'btn-sm', 'btn-outline-secondary', 'me-1'], fa('fa-sync'))
    const toggleBtn = createElement(btnGroup, 'button', ['btn', 'btn-sm', 'btn-outline-secondary'])
    const body = createElement(div, 'div', ['card-body', 'p-1'])

    async function reloadContent(refresh: boolean) {
        if (!content) return
        body.innerHTML = ''
        if (typeof content !== 'function') {
            body.appendChild(content)
        } else {
            const loadingDiv = createLoadingSpinner(body, '2rem', 'primary')
            try {
                const element = await content(refresh)
                body.removeChild(loadingDiv)
                body.appendChild(element)
            } catch (error) {
                console.error('Error loading foldable content:', error)
                body.removeChild(loadingDiv)
                body.appendChild(createElement(null, 'div', ['text-danger'], 'Error loading content'))
            }
        }
    }

    const state = tu.createObservableState(null, { folded: initiallyFolded }, s => {
        toggleBtn.replaceChildren(s.folded ? fa('fa-chevron-down') : fa('fa-chevron-up'))
        body.style.display = s.folded ? 'none' : ''
        div.style.borderColor = s.folded ? '#ccc' : '#007bff'
        if (body.children.length === 0 && !s.folded) {
            reloadContent(false)
        }
        refreshBtn.style.display = s.folded ? 'none' : ''
    })

    header.onclick = () => state.folded = !state.folded

    refreshBtn.onclick = async (e) => {
        e.stopPropagation() // prevent triggering fold/unfold
        await reloadContent(true)
    }
    
    return { div, header, body, toggleBtn, refreshBtn }
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
                openSearchPanel: search.openSearchPanel,
                foldGutter: lang.foldGutter,
                foldKeymap: lang.foldKeymap
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
    const { EditorState, EditorView, lineNumbers, Decoration, hoverTooltip, syntaxHighlighting, defaultHighlightStyle, json, search, searchKeymap, openSearchPanel, keymap, foldGutter, foldKeymap } = await CodeMirrorLoader.getModules();
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

    // // Create Decoration Set
    const commentDecorations = Decoration.set(
      visulizers.map(v => v.marker.range(v.start, v.end))
    );

    // hover tooltip extension
    const commentTooltip = hoverTooltip((view:any, pos:number) => {
      // Check if pos falls within any comment range
      for (const c of visulizers.filter(v => v.type === 'visualizer')) {
        if (pos >= c.start && pos <= c.end) {
          return {
            pos: c.start,
            end: c.end,
            above: true,        // Tooltip shows above (change to false for below)
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
      return null; // Return null if not found, don't display
    });

    // Click event handler
    const clickHandler = EditorView.domEventHandlers({
      click: (event: MouseEvent, view: any) => {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos === null) return false
        
        // Check if click position is within any visualizer range
        for (const c of visulizers) {
          if (pos >= c.start && pos <= c.end) {
            // Found it, show dialog
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
        lineNumbers(),                          // Show line numbers
        foldGutter(),                           // Folding gutter on the left side
        keymap.of(foldKeymap),                  // Folding shortcuts (Ctrl+Shift+[/])
        syntaxHighlighting(defaultHighlightStyle), // Default syntax highlighting style
        json(),                                 // JSON language support (parsing + highlighting)
        EditorState.readOnly.of(true),          // State-level read-only: prevent modification via keyboard/paste
         EditorView.decorations.of(commentDecorations), // Apply comment decorations
         commentTooltip,                        // Keep hover tooltip
         clickHandler,                          // Add click handler
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
        search({ top: true }),                  // Search feature, search box at the top
        keymap.of(searchKeymap)               // Search-related shortcuts
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
            lineNumbers(),                          // Show line numbers
            syntaxHighlighting(defaultHighlightStyle), // Default syntax highlighting style
            json(),                                 // JSON language support (parsing + highlighting)
            EditorView.theme({
                "&": { height: "100%" },
                ".cm-scroller": { overflow: "auto" },
                ".cm-content": { whiteSpace: "pre-wrap", wordBreak: "break-word" } // Auto line wrap
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
            background: rgba(0,0,0,0.25);            /* Slightly darken */
            backdrop-filter: blur(8px) brightness(0.9);
            -webkit-backdrop-filter: blur(8px) brightness(0.9); /* Safari */
        }
    `
}

export * from './uu-components.ts'
export * from './uu-input.ts'
export * from './uu-visualize-array.ts'
