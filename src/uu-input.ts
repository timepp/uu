import * as uu from './uu.ts'
import * as tu from './tu.ts'
import { fa, DraggableSortedContainer, createElement, AnnotatedString, showDialog, syncDisplay, createButton, callAsyncFunctionWithProgress } from './uu.ts'
import * as uc from './uu-components.ts'

export type AutofillProvider = (category: string) => AnnotatedString[]

let autofillProvider = (category: string) => [] as AnnotatedString[]

export function setAutofillProvider(provider: AutofillProvider) {
    autofillProvider = provider
}

export type InputElement = {
    id: string
    name: string
    type: 'single-line-string' | 'number' | 'multi-line-string' | 'date' | 'single-select' | 'multi-select' | 'single-picker' | 'multi-picker'
    selectOptions?: string[]
    defaultValue?: string | string[]
    initialValue?: string | string[]
}

export type InputElementOld = string | {
    name: string
    valueId?: string // For input type
    initialValue?: string // For input type
    onClick?: (params: Record<string, string>) => HTMLElement | Promise<HTMLElement> | void
}


export function createInputPanel(parent: HTMLElement | null, elements: InputElement[], style: 'table' | 'bar' = 'table') {
    const valueFetchers: Record<string, () => string | string[]> = {}
    const createInputControl = (parent: HTMLElement, element: InputElement) => {
        const initialVal = (element.initialValue || element.defaultValue) as string
        const initialArr = (element.initialValue || element.defaultValue) as string[]
        switch (element.type) {
            case 'single-line-string':
            case 'number':
                {
                    const input = uu.createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.value = initialVal
                    valueFetchers[element.id] = () => input.value
                    break
                }
            case 'date':
                {
                    const input = uu.createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.type = 'date'
                    input.value = initialVal
                    valueFetchers[element.id] = () => input.value
                    break
                }
            case 'multi-line-string':
                {
                    const textarea = uu.createElement(parent, 'textarea', ['form-control']) as HTMLTextAreaElement
                    textarea.rows = 4
                    textarea.value = initialVal
                    valueFetchers[element.id] = () => textarea.value
                    break
                }
            case 'single-select':
                {
                    const select = uu.createElement(parent, 'select', ['form-select']) as HTMLSelectElement
                    element.selectOptions?.forEach(option => {
                        const opt = uu.createElement(select, 'option', [], option) as HTMLOptionElement
                        opt.value = option
                    })
                    select.value = initialVal
                    valueFetchers[element.id] = () => select.value
                    break
                }
            case 'multi-select':
                {
                    const selector = uc.createSelector(parent, element.selectOptions || [], () => {}, true, initialArr)
                    valueFetchers[element.id] = () => selector.getSelected()
                    break
                }
            case 'single-picker':
                {
                    const input = uu.createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.value = initialVal
                    input.readOnly = true
                    input.placeholder = 'Click to select...'
                    input.style.cursor = 'pointer'
                    input.onclick = async () => {
                        const selected = await uu.showSelection(`Select ${element.name}`, (element.selectOptions || []).map(o => ({ name: o, value: o })), {
                             singleSelect: true,
                             initialSelection: [input.value]
                        })
                        if (selected && selected.length > 0) {
                            input.value = selected[0]
                        }
                    }
                    valueFetchers[element.id] = () => input.value
                    break
                }
            case 'multi-picker':
                {
                    const input = uu.createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.value = initialArr.join(', ')
                    input.readOnly = true
                    input.placeholder = 'Click to select...'
                    input.style.cursor = 'pointer'
                    input.onclick = async () => {
                        const currentValues = input.value ? input.value.split(',').map(s => s.trim()) : []
                        const selected = await uu.showSelection(`Select ${element.name}`, (element.selectOptions || []).map(o => ({ name: o, value: o })), {
                             singleSelect: false,
                             initialSelection: currentValues
                        })
                        if (selected !== undefined) {
                            input.value = selected.join(', ')
                        }
                    }
                    valueFetchers[element.id] = () => input.value ? input.value.split(',').map(s => s.trim()).filter(s => s.length > 0) : []
                    break
                }
        }
    }

    // create a table style input panel
    let element: HTMLElement | null = null
    if (style === 'table') {
        const table = uu.createElement(parent, 'table', ['table', 'table-bordered', 'table-hover'])
        const tbody = uu.createElement(table, 'tbody')
        elements.forEach(element => {
            const row = uu.createElement(tbody, 'tr')
            const nameCell = uu.createElement(row, 'td')
            nameCell.textContent = element.name
            nameCell.style.whiteSpace = 'nowrap'
            nameCell.style.verticalAlign = 'middle'
            nameCell.style.backgroundColor = '#f8f9fa'
            const valueCell = uu.createElement(row, 'td')
            createInputControl(valueCell, element)
        })
        element = table
    } else if (style === 'bar') {
        const div = uu.createElement(parent, 'div', ['d-flex', 'gap-2', 'overflow-auto'])
        elements.forEach(element => {
            const ig = uu.createElement(div, 'div', ['input-group', 'flex-shrink-0', 'w-auto'])
            const label = uu.createElement(ig, 'span', ['input-group-text'], element.name, { minWidth: '100px' })
            createInputControl(ig, element)
        })
        element = div
    }

    const getValues = () => {
        const values: Record<string, string | string[]> = {}
        elements.forEach((element) => {
            values[element.id] = valueFetchers[element.id]?.()
        })
        return values
    }
    return {
        element: element!,
        getValues
    }
}

export async function showInputDlg(title: string, elements: InputElement[]) {
    const panel = createInputPanel(null, elements)
    panel.element.style.minWidth = '50vw'
    const result = await uu.showDialog(title, panel.element, {
        actions: ['Cancel', 'OK'],
    })
    if (result === 'OK') {
        return panel.getValues()
    }
    return null
}

export type FieldEditOption = {
    type?: 'single-line-string' | 'number' | 'multi-line-string' | 'date' | 'single-select' | 'multi-select' | 'single-picker' | 'multi-picker'
    selectOptions?: string[]
    displayName?: string
}

function inferInputType(value: any): InputElement['type'] {
    if (value === null || value === undefined) {
        return 'single-line-string'
    }
    if (typeof value === 'number') {
        return 'number'
    }
    if (value instanceof Date) {
        return 'date'
    }
    if (Array.isArray(value)) {
        return 'multi-select'
    }
    if (typeof value === 'string') {
        // Multi-line if contains newlines or is long
        return value.includes('\n') || value.length > 100 ? 'multi-line-string' : 'single-line-string'
    }
    return 'single-line-string'
}

function formatValue(value: any): string | string[] {
    if (value === null || value === undefined) {
        return ''
    }
    if (value instanceof Date) {
        return value.toISOString().split('T')[0] // YYYY-MM-DD format
    }
    if (Array.isArray(value)) {
        return value.map(v => String(v))
    }
    return String(value)
}

function parseValue(value: string | string[], originalValue: any): any {
    if (originalValue === null || originalValue === undefined) {
        return value
    }
    if (typeof originalValue === 'number') {
        const num = Number(value)
        return isNaN(num) ? originalValue : num
    }
    if (originalValue instanceof Date) {
        return new Date(value as string)
    }
    return value
}

/**
 * A typed input control. The passed object is used to infer types and initial values.
 * @param parent parent element
 * @param obj object with inital values
 * @param fieldOptions optional settings customizing field behavior, if needed
 * @param style display style ('table' or 'bar')
 * @returns an object containing the html element and a function to get the current values
 */
export function createInputArea<T extends object>(parent: HTMLElement | null, obj: T, fieldOptions: Partial<Record<keyof T, FieldEditOption>> = {}, style: 'table' | 'bar' = 'table') {
    const elements: InputElement[] = []
    
    for (const key in obj) {
        const value = obj[key]
        const option = fieldOptions[key] || {}

        const formattedValue = formatValue(value)
        elements.push({
            type: option.type || inferInputType(value),
            defaultValue: formattedValue,
            id: String(key),
            name: option.displayName || String(key),
            selectOptions: option.selectOptions,
            initialValue: formattedValue
        })
    }

    const panel = createInputPanel(parent, elements, style)
    const getValues = () => {
        const values = panel.getValues()
        const parsedValues = {...obj}
        for (const key in values) {
            parsedValues[key as keyof T] = parseValue(values[key], obj[key as keyof T])
        }
        return parsedValues
    }

    return {
        element: panel.element,
        getValues
    }
}

export async function showInputDialog<T extends object>(title: string, obj: T, fieldOptions: Partial<Record<keyof T, FieldEditOption>> = {}): Promise<T | null> {
    const panel = createInputArea(null, obj, fieldOptions, 'table')
    panel.element.style.minWidth = '50vw'
    
    const result = await uu.showDialog(title, panel.element, {
        actions: ['Cancel', 'OK'],
        softDismissable: false
    })
    
    if (result === 'OK') {
        return panel.getValues()
    }
    
    return null
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
export function showInputDialogOld(title: string, fields: InputField[]) {
    return showDialog<string[]>(title, undefined, {
        classes: [],
        style: {width: '50vw'},
        actions: ['OK', 'Cancel'],
        softDismissable: false
    }, (elements, finish) => {
        const inputArea = createInputAreaOld(elements.contentArea, fields.map(f => (
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

export type Input = {
    type: 'input' | 'button' | 'select',
    id: string,
    label?: string,
    options?: string[], // for select
    grow?: number,
    initialValue?: string
}
/**
 * Simple form: createInputAreaOld(parent, 'input:name Name | input:age Age | button:search Search')
 */
export function createInputAreaOld(parent: Element|null, elements: string | Input[]) {
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
        return createInputAreaOld(parent, params)
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

export function createDataArea(parent: Element|null, foldable: boolean, params: InputElementOld[]) {
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
                    resultArea.replaceChildren(r)
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
        resultArea.replaceChildren(result)
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
export type SelectionItem = AnnotatedString | string
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
