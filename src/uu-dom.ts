import { simpleHash } from './tu.ts'
import { ensureFontAwesome } from './uu-fontawesome.ts'

export type AnnotatedString = {
    value: string,
    comment?: string
}

export type CheckControl = { btn: HTMLLabelElement, checkbox: HTMLInputElement }
export type CheckButtonControl = { div: HTMLDivElement, checkbox: HTMLInputElement }
export type TableElements = {
    tbl: HTMLTableElement
    thead: HTMLTableSectionElement
    headCells: HTMLTableCellElement[]
    tbody: HTMLTableSectionElement
}

export function fa(...classNames: string[]): HTMLElement {
    ensureFontAwesome()
    return createElement(null, 'i', ['fa', ...classNames])
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    parent: Element | null,
    tagName: K,
    classes: string[] = [],
    child?: string|HTMLElement,
    style: Partial<CSSStyleDeclaration> = {},
    attributes: Partial<Record<keyof HTMLElementTagNameMap[K], any>> = {}
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName)
    if (classes.length > 0) element.classList.add(...classes.filter(c => c))
    if (parent) parent.appendChild(element)
    if (child) {
        if (typeof child === 'string') element.textContent = child
        else element.appendChild(child)
    }
    for (const [key, value] of Object.entries(style)) {
        if (value !== undefined) element.style[key as any] = value as string
    }
    for (const [key, value] of Object.entries(attributes)) {
        element[key as keyof HTMLElementTagNameMap[K]] = value
    }
    return element
}

export function createButton(parent: Element | null, classes: string[] = [], child: string|HTMLElement, onclick = () => {}): HTMLButtonElement {
    const button = createElement(parent, 'button', classes, child)
    button.onclick = onclick
    return button
}

export function createCheck(parent: Element | null, classes: string[] = [], labelText: string, checked = false, onChange = (checked: boolean) => {}): CheckControl {
    const btn = createElement(parent, 'label', ['btn', 'd-flex', 'align-items-center', ...classes])
    const checkbox = createElement(btn, 'input', ['me-2'], '', {}, {type: 'checkbox'})
    checkbox.style.marginTop = '0'
    createElement(btn, 'span', [], labelText)
    checkbox.checked = checked
    checkbox.onchange = () => onChange(checkbox.checked)
    return { btn, checkbox }
}

export function createCheckBtn(parent: Element | null, classes: string[] = [], labelText: string, accentColor?: string, checked = false, onChange = (checked: boolean) => {}): CheckButtonControl {
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
    updateStyle()
    checkbox.onchange = () => {
        updateStyle()
        onChange(checkbox.checked)
    }
    return { div, checkbox }
}

export function createTable(parent: Element|null, props: string[] = [], classes: string[] = [], styles: Partial<CSSStyleDeclaration> = {}): TableElements {
    const tbl = createElement(parent, 'table', classes, '', styles)
    const thead = createElement(tbl, 'thead')
    const tr = createElement(thead, 'tr')
    const headCells = props.map(prop => createElement(tr, 'th', [], prop))
    const tbody = createElement(tbl, 'tbody')
    return { tbl, thead, headCells, tbody }
}

export function forEachTableCell(table: HTMLTableElement, callback: (cell: HTMLTableCellElement, row: number, col: number) => void) {
    for (let row = 0; row < table.rows.length; row++) {
        for (let col = 0; col < table.rows[row].cells.length; col++) callback(table.rows[row].cells[col], row, col)
    }
}

export function showAll(collection: NodeListOf<HTMLElement>) {
    collection.forEach(element => element.style.display = '')
}

export function hideAll(collection: NodeListOf<HTMLElement>) {
    collection.forEach(element => element.style.display = 'none')
}

export function rgbValue(obj: {r: number, g: number, b: number}): string {
    return `rgb(${obj.r}, ${obj.g}, ${obj.b})`
}

export function getStringColor(str: string, s = 100, l = 90): string {
    return `hsl(${simpleHash(str) % 360}, ${s}%, ${l}%)`
}

export function syncClass(element: HTMLElement, className: string, enabled: boolean) {
    element.classList.toggle(className, enabled)
}

export function syncChildClass(parent: HTMLElement, childSelector: string, className: string, enabled: boolean) {
    parent.querySelectorAll<HTMLElement>(childSelector).forEach(child => syncClass(child, className, enabled))
}

export function syncDisplay(element: HTMLElement, visible: boolean) {
    element.style.display = visible ? '' : 'none'
}

export function syncExistence(element: HTMLElement, shouldExist: boolean) {
    if (!shouldExist) element.remove()
}

export function syncChildDisplay(parent: HTMLElement, childSelector: string, visible: boolean) {
    parent.querySelectorAll<HTMLElement>(childSelector).forEach(child => syncDisplay(child, visible))
}

export function createButtonGroup(parent: Element | null, buttons: Record<string, () => void>): HTMLDivElement {
    const div = createElement(parent, 'div', ['btn-group'])
    for (const [name, action] of Object.entries(buttons)) createButton(div, ['btn', 'btn-outline-secondary'], name, action)
    return div
}

export function createToggleBar(values: (string|HTMLElement)[], value: number, onNewValue: (value: number) => void): HTMLDivElement {
    const div = createElement(null, 'div', ['btn-group'])
    const buttons: HTMLButtonElement[] = []
    const updateUI = (selectedIndex: number) => buttons.forEach((button, index) => {
        syncClass(button, 'btn-primary', index === selectedIndex)
        syncClass(button, 'btn-secondary', index !== selectedIndex)
    })
    for (const item of values) {
        const button = createButton(div, ['btn'], '', () => {
            const index = values.indexOf(item)
            updateUI(index)
            onNewValue(index)
        })
        button.append(typeof item === 'string' ? createElement(null, 'span', [], item) : item)
        buttons.push(button)
    }
    updateUI(value)
    return div
}

export function createLoadingSpinner(parent: Element | null, size = '2rem', color = 'primary'): HTMLDivElement {
    const loadingDiv = createElement(parent, 'div', ['d-flex', 'justify-content-center', 'align-items-center', 'p-3'])
    const spinner = createElement(loadingDiv, 'div', ['spinner-border', `text-${color}`], '', { width: size, height: size })
    spinner.setAttribute('role', 'status')
    createElement(spinner, 'span', ['visually-hidden'], 'Loading...')
    return loadingDiv
}