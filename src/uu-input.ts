import * as tu from './tu.ts'
import { fa, createElement, type AnnotatedString, createButton } from './uu-dom.ts'
import { showDialog } from './uu-dialog.ts'
import { callAsyncFunctionWithProgress } from './uu-progress.ts'
import { createFoldedString } from './uu-text.ts'
import { chooseOne, showSelection } from './uu-selection.ts'
import { createSelector } from './uu-controls.ts'
import { readLocalStorage, registerModule, registerModuleValue, writeLocalStorage } from './uu-runtime-state.ts'

export type AutofillProvider = (category: string) => AnnotatedString[]

let autofillProvider = (category: string) => [] as AnnotatedString[]

export function setAutofillProvider(provider: AutofillProvider) {
    autofillProvider = provider
}

export type InputElement = {
    id: string
    name: string
    type: 'single-line-string' | 'number' | 'multi-line-string' | 'date' | 'single-select' | 'multi-select' | 'single-picker' | 'multi-picker' | 'custom'
    selectOptions?: string[]
    defaultValue?: string | string[]
    initialValue?: string | string[]
    customInput?: (currentValue: string) => Promise<string>
}

export type InputElementOld = string | {
    name: string
    valueId?: string // For input type
    initialValue?: string // For input type
    onClick?: (params: Record<string, string>) => HTMLElement | Promise<HTMLElement> | void
}

export type InputPanel = {
    element: HTMLElement
    getValues: () => Record<string, string | string[]>
}

export type InputArea<T extends object> = {
    element: HTMLElement
    getValues: () => T
}

export type OldInputArea = {
    div: HTMLDivElement
    inputs: Record<string, HTMLInputElement>
    buttons: Record<string, HTMLButtonElement>
    selects: Record<string, HTMLSelectElement>
}

export type AutofillInput = {
    ig: HTMLDivElement
    input: HTMLInputElement
    button: HTMLButtonElement | null
}

type InputHistory = {
    // panel history
    panelHistory: {
        value: string
        timestamp: number
    }[]
    // element history
    elementHistory: Record<string, {
        value: string
        timestamp: number
    }[]>
}

export function createInputPanel(parent: HTMLElement | null, elements: InputElement[], style: 'table' | 'bar' = 'table', name = ''): InputPanel {
    const appendHistory = (arr: { value: string, timestamp: number }[], value: string, maxSize: number) => {
        if (!value || maxSize <= 0) return
        // remove existing entry first
        const existingIndex = arr.findIndex(entry => entry.value === value)
        if (existingIndex !== -1) {
            arr.splice(existingIndex, 1)
        }
        // append new entry
        // remove the oldest entry if the array exceeds the max size
        while (arr.length >= maxSize) {
            arr.shift()
        }
        arr.push({ value, timestamp: Date.now() })
    }
    const loadInputHistory = () => {
        if (name) {
            const historyStr = readLocalStorage(`input-history-${name}`, 'uu-input')
            if (historyStr) {
                try {
                    return JSON.parse(historyStr) as InputHistory
                } catch {
                    console.warn('Failed to parse input history for', name)
                }
            }
        }
        return { panelHistory: [], elementHistory: {} } as InputHistory
    }
    const history = loadInputHistory()
    const saveInputHistory = (values: Record<string, string | string[]>) => {
        const pa = JSON.stringify(values)
        appendHistory(history.panelHistory, pa, 20)
        for (const key in values) {
            const ea = JSON.stringify(values[key])
            appendHistory(history.elementHistory[key] = history.elementHistory[key] || [], ea, 20)
        }
        if (name) {
            writeLocalStorage(`input-history-${name}`, JSON.stringify(history), 'uu-input')
        }
    }
    const valueFetchers: Record<string, () => string | string[]> = {}
    const valueSetters: Record<string, (value: any) => void> = {}
    const createInputControl = (parent: HTMLElement, element: InputElement) => {
        const initialVal = (element.initialValue || element.defaultValue) as string
        const initialArr = (element.initialValue || element.defaultValue) as string[]
        switch (element.type) {
            case 'single-line-string':
            case 'number':
                {
                    const input = createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.value = initialVal
                    valueFetchers[element.id] = () => input.value
                    valueSetters[element.id] = v => input.value = v
                    break
                }
            case 'date':
                {
                    const input = createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.type = 'date'
                    input.value = initialVal
                    valueFetchers[element.id] = () => input.value
                    valueSetters[element.id] = v => input.value = v
                    break
                }
            case 'multi-line-string':
                {
                    const textarea = createElement(parent, 'textarea', ['form-control']) as HTMLTextAreaElement
                    textarea.rows = 4
                    textarea.value = initialVal
                    valueFetchers[element.id] = () => textarea.value
                    valueSetters[element.id] = v => textarea.value = v
                    break
                }
            case 'single-select':
                {
                    const select = createElement(parent, 'select', ['form-select']) as HTMLSelectElement
                    element.selectOptions?.forEach(option => {
                        const opt = createElement(select, 'option', [], option) as HTMLOptionElement
                        opt.value = option
                    })
                    select.value = initialVal
                    valueFetchers[element.id] = () => select.value
                    valueSetters[element.id] = v => select.value = v
                    break
                }
            case 'multi-select':
                {
                    const selector = createSelector(parent, element.selectOptions || [], () => {}, true, initialArr)
                    valueFetchers[element.id] = () => selector.getSelected()
                    valueSetters[element.id] = v => selector.setSelected(Array.isArray(v) ? v : [])
                    break
                }
            case 'single-picker':
                {
                    const input = createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.value = initialVal
                    input.readOnly = true
                    input.placeholder = 'Click to select...'
                    input.style.cursor = 'pointer'
                    input.onclick = async () => {
                        const selected = await showSelection(`Select ${element.name}`, (element.selectOptions || []).map(value => ({ value })), {
                             singleSelect: true,
                             initialSelection: [input.value]
                        })
                        if (selected && selected.length > 0) {
                            input.value = selected[0]
                        }
                    }
                    valueFetchers[element.id] = () => input.value
                    valueSetters[element.id] = v => input.value = v
                    break
                }
            case 'multi-picker':
                {
                    const input = createElement(parent, 'input', ['form-control']) as HTMLInputElement
                    input.value = initialArr.join(', ')
                    input.readOnly = true
                    input.placeholder = 'Click to select...'
                    input.style.cursor = 'pointer'
                    input.onclick = async () => {
                        const currentValues = input.value ? input.value.split(',').map(s => s.trim()) : []
                        const selected = await showSelection(`Select ${element.name}`, (element.selectOptions || []).map(value => ({ value })), {
                             singleSelect: false,
                             initialSelection: currentValues
                        })
                        if (selected !== undefined) {
                            input.value = selected.join(', ')
                        }
                    }
                    valueFetchers[element.id] = () => input.value ? input.value.split(',').map(s => s.trim()).filter(s => s.length > 0) : []
                    valueSetters[element.id] = v => input.value = Array.isArray(v) ? v.join(', ') : ''
                    break
                }
            case 'custom':
                {
                    const input = createElement(parent, 'span', ['form-control'])
                    input.textContent = initialVal
                    input.style.cursor = 'pointer'
                    input.onclick = async () => {
                        if (element.customInput) {
                            const newValue = await element.customInput(input.textContent || '')
                            if (newValue !== undefined) {
                                input.textContent = newValue
                            }
                        }
                    }
                    valueFetchers[element.id] = () => input.textContent || ''
                    valueSetters[element.id] = v => input.textContent = v
                }
        }
    }

    const applyPanelHistory = (value: string) => {
        try {
            const values = JSON.parse(value) as Record<string, string | string[]>
            for (const key in values) {
                if (valueSetters[key]) {
                    valueSetters[key](values[key])
                }
            }
        } catch {
            console.warn('Failed to parse panel history value:', value)
        }
    }

    const applyElementHistory = (key: string, value: string) => {
        if (valueSetters[key]) {
            try {
                const parsedValue = JSON.parse(value) as string | string[]
                valueSetters[key](parsedValue)
            } catch {
                console.warn('Failed to parse element history value for', key, ':', value)
            }
        }
    }

    const pickHistory = async (key: string) => {
        const result = await showDialog<boolean>(`History for ${key}`, undefined, {
            style: { width: '60vw' },
            actions: ['Cancel']
        }, (elements, finish) => {
            // Section 1: Element-specific history
            if (history.elementHistory[key] && history.elementHistory[key].length > 0) {
                const section1Title = createElement(elements.contentArea, 'h6', ['mt-2'], `History for ${key}`)
                const section1 = createElement(elements.contentArea, 'div', ['list-group', 'mb-3'])
                
                history.elementHistory[key].slice().reverse().forEach((entry, index) => {
                    const item = createElement(section1, 'a', ['list-group-item', 'list-group-item-action'])
                    item.style.cursor = 'pointer'
                    
                    const header = createElement(item, 'div', ['d-flex', 'justify-content-between', 'align-items-center'])
                    createElement(header, 'span', ['text-muted', 'small'], new Date(entry.timestamp).toLocaleString())
                    
                    const valuePreview = createElement(item, 'div', ['mt-1'])
                    let displayText = ''
                    try {
                        const parsedValue = JSON.parse(entry.value)
                        displayText = Array.isArray(parsedValue) ? parsedValue.join(', ') : String(parsedValue)
                    } catch {
                        displayText = entry.value
                    }
                    valuePreview.appendChild(createFoldedString(displayText, 120))
                    
                    item.onclick = () => {
                        applyElementHistory(key, entry.value)
                        finish(true)
                    }
                })
            }
            
            // Section 2: Panel-wide history
            if (history.panelHistory.length > 0) {
                const section2Title = createElement(elements.contentArea, 'h6', ['mt-3'], 'Full Panel History')
                const section2 = createElement(elements.contentArea, 'div', ['list-group'])
                
                history.panelHistory.slice().reverse().forEach((entry, index) => {
                    const item = createElement(section2, 'a', ['list-group-item', 'list-group-item-action'])
                    item.style.cursor = 'pointer'
                    
                    const header = createElement(item, 'div', ['d-flex', 'justify-content-between', 'align-items-center'])
                    createElement(header, 'span', ['text-muted', 'small'], new Date(entry.timestamp).toLocaleString())
                    
                    const valuePreview = createElement(item, 'div', ['mt-1', 'small'])
                    let displayText = ''
                    try {
                        const parsedValue = JSON.parse(entry.value) as Record<string, any>
                        displayText = Object.entries(parsedValue).map(([k, v]) => {
                            const displayValue = Array.isArray(v) ? v.join(', ') : String(v)
                            return `${k}: ${displayValue}`
                        }).join(' | ')
                    } catch {
                        displayText = entry.value
                    }
                    valuePreview.appendChild(createFoldedString(displayText, 150))
                    
                    item.onclick = () => {
                        applyPanelHistory(entry.value)
                        finish(true)
                    }
                })
            }
            
            elements.buttons['Cancel']?.addEventListener('click', () => finish())
        })
    }

    let element: HTMLElement | null = null
    if (style === 'table') {
        const table = createElement(parent, 'table', ['table', 'table-bordered', 'table-hover'])
        const tbody = createElement(table, 'tbody')
        elements.forEach(element => {
            const row = createElement(tbody, 'tr')
            const nameCell = createElement(row, 'td')
            nameCell.textContent = element.name
            nameCell.style.whiteSpace = 'nowrap'
            nameCell.style.verticalAlign = 'middle'
            nameCell.style.backgroundColor = '#f8f9fa'
            nameCell.onclick = () => pickHistory(element.id)
            const valueCell = createElement(row, 'td')
            createInputControl(valueCell, element)
        })
        element = table
    } else if (style === 'bar') {
        const div = createElement(parent, 'div', ['d-flex', 'gap-2', 'overflow-auto'])
        elements.forEach(element => {
            const ig = createElement(div, 'div', ['input-group', 'flex-grow-1'])
            const label = createElement(ig, 'span', ['input-group-text'], element.name, { minWidth: '100px' })
            label.onclick = () => pickHistory(element.id)
            createInputControl(ig, element)
        })
        element = div
    }

    if (history.panelHistory.length > 0) {
        applyPanelHistory(history.panelHistory[history.panelHistory.length - 1].value)
    }

    const getValues = () => {
        const values: Record<string, string | string[]> = {}
        elements.forEach((element) => {
            values[element.id] = valueFetchers[element.id]?.()
        })
        saveInputHistory(values)
        return values
    }
    return {
        element: element!,
        getValues
    }
}

export async function showInputDlg(title: string, elements: InputElement[]): Promise<Record<string, string | string[]> | null> {
    const panel = createInputPanel(null, elements)
    panel.element.style.minWidth = '50vw'
    const result = await showDialog(title, panel.element, {
        actions: ['Cancel', 'OK'],
    })
    if (result === 'OK') {
        return panel.getValues()
    }
    return null
}

export type FieldEditOption = {
    type?: 'single-line-string' | 'number' | 'multi-line-string' | 'date' | 'single-select' | 'multi-select' | 'single-picker' | 'multi-picker' | 'custom'
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
export function createInputArea<T extends object>(parent: HTMLElement | null, obj: T, fieldOptions: Partial<Record<keyof T, FieldEditOption>> = {}, style: 'table' | 'bar' = 'table', name = ''): InputArea<T> {
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

    const panel = createInputPanel(parent, elements, style, name)
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
    
    const result = await showDialog(title, panel.element, {
        actions: ['Cancel', 'OK'],
        softDismissable: false
    })
    
    if (result === 'OK') {
        return panel.getValues()
    }
    
    return null
}


export async function showConfirmationDialog(title: string, text: string): Promise<boolean> {
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
export function showInputDialogOld(title: string, fields: InputField[]): Promise<string[] | undefined> {
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

export async function prompt(title: string, tip: string | HTMLElement, initialValue?: string): Promise<string | undefined> {
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

export async function promptMultiline(title: string, tip: string | HTMLElement, initialValue?: string): Promise<string | undefined> {
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
export function createInputAreaOld(parent: Element|null, elements: string | Input[]): OldInputArea {
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

export function createDataAreaOld(parent: Element|null, foldable: boolean, params: InputElementOld[]): HTMLDivElement {
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
export function createInputAction(title: string, actionName: string, valueId: string, handler: (value: string) => Promise<HTMLElement>, value?: string): HTMLDivElement {
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

export function createAutofillInput(title: string, placeholder: string, initialValue: string, valueId = title, handler?: (value: string) => void, btn?: string): AutofillInput {
    const ig = createElement(null, 'div', ['input-group'])
    const label = createElement(ig, 'label', ['input-group-text'], title, {minWidth: '100px'})
    const input = createElement(ig, 'input', ['form-control'], '', {}, {placeholder})
    const historyKey = `input-history-${valueId}`
    const valueKey = `input-${valueId}`
    const history = JSON.parse(readLocalStorage(historyKey, 'uu-input') || '[]') as string[]
    
    function updateHistory(newValue: string) {
        if (!history.includes(newValue)) {
            history.unshift(newValue)
            writeLocalStorage(historyKey, JSON.stringify(history.slice(0, 100)), 'uu-input')
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
    input.value = initialValue || readLocalStorage(valueKey, 'uu-input') || ''
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
                writeLocalStorage(valueKey, input.value, 'uu-input')
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
        writeLocalStorage(valueKey, input.value, 'uu-input')
    }
    return {ig, input, button}
}

registerModule('uu-input')
registerModuleValue('uu-input', 'autofillProvider', () => autofillProvider)

