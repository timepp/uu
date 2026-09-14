import type { AnnotatedString } from './uu-dom.ts'
import { createElement, syncDisplay } from './uu-dom.ts'
import { showDialog } from './uu-dialog.ts'
import { DraggableSortedContainer } from './uu-dnd.ts'

export type SelectOption = {
    singleSelect: boolean
    pickAndClose: boolean
    initialSelection: string[]
    showOrder: boolean
    showToolbar: boolean
    showStatus: boolean
    statusInteractive: boolean
    checker: (oldSelection: string[], newSelection: string[]) => string[] | string
    styleModifier: (item: string, elem: HTMLElement) => void
    dlgStyle: Partial<CSSStyleDeclaration>
}

export type SelectionItem = AnnotatedString | string

export function showSelection(title: string, options: SelectionItem[], cfg: Partial<SelectOption> = {}) {
    return showDialog<string[]>(title, undefined, {
        classes: [], style: {width: '80vw', ...cfg.dlgStyle}, actions: ['OK', 'Cancel'], softDismissable: true
    }, (elements, finish) => {
        let selection = cfg.initialSelection || []
        const itemElements: Record<string, HTMLDivElement> = {}
        let currentAlert = ''
        const container = createElement(elements.contentArea, 'div', ['d-flex', 'flex-column'])
        const statusBar = createElement(container, 'span', ['form-control'])
        const selectedPrefix = createElement(statusBar, 'span', ['me-2'], 'Selected: ', { color: 'blue' })
        const selectedItems = new DraggableSortedContainer(statusBar, {
            emptyText: '(none)', showOrder: cfg.showOrder,
            interactive: (cfg.statusInteractive ?? true) && !cfg.singleSelect,
            removable: (cfg.statusInteractive ?? true) && !cfg.singleSelect,
            onChange: newSelection => onSelectionChange(selection, newSelection)
        })
        const toolbar = createElement(container, 'div', ['input-group', 'mb-4', 'mt-2'])
        const filter = createElement(toolbar, 'input', ['form-control'], '', {}, {placeholder: 'Filter'})
        const selectAllButton = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], '☑')
        const unselectAllButton = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], '☐')
        const main = createElement(container, 'div', ['d-flex', 'overflow-auto', 'flex-wrap', 'gap-2', 'p-2'])
        const alert = createElement(container, 'div', ['alert', 'alert-danger', 'd-none'])
        if (cfg.pickAndClose) cfg.singleSelect = true
        syncDisplay(toolbar, cfg.showToolbar ?? true)
        syncDisplay(statusBar, cfg.showStatus ?? true)
        syncDisplay(selectAllButton, !cfg.singleSelect)
        syncDisplay(unselectAllButton, !cfg.singleSelect)
        syncDisplay(elements.footer, !cfg.pickAndClose)
        function updateUI() {
            if (!statusBar.firstChild) statusBar.append(selectedPrefix, selectedItems.root)
            selectedItems.setStrings(selection)
            for (const [value, element] of Object.entries(itemElements)) {
                const selected = selection.includes(value)
                element.classList.toggle('selected', selected)
                element.style.border = '2px solid'
                element.style.borderColor = selected ? '#0d6efd' : '#cccccc'
            }
            alert.textContent = currentAlert
            syncDisplay(alert, currentAlert !== '')
        }
        function onSelectionChange(oldSelection: string[], newSelection: string[]) {
            const checked = cfg.checker?.(oldSelection, newSelection)
            if (typeof checked === 'string') {
                currentAlert = checked
                selection = newSelection
            } else {
                currentAlert = ''
                selection = checked || newSelection
                if (cfg.pickAndClose && selection.length > 0) return finish(selection)
            }
            updateUI()
        }
        for (const item of options.map(option => typeof option === 'string' ? { value: option } : option)) {
            const element = createElement(main, 'div', ['rounded', 'hover-effect', 'text-center', 'p-2'], '', { cursor: 'pointer', minWidth: '100px' })
            createElement(element, 'span', [], item.value)
            if (item.comment) {
                createElement(element, 'span', [], '', { border: '1px solid #cccccc', margin: '0 5px', width: '1px', height: '80%' })
                createElement(element, 'span', ['text-muted'], item.comment)
            }
            itemElements[item.value] = element
            cfg.styleModifier?.(item.value, element)
            element.onclick = () => onSelectionChange(selection, cfg.singleSelect ? [item.value] : selection.includes(item.value) ? selection.filter(value => value !== item.value) : [...selection, item.value])
        }
        filter.oninput = () => {
            const value = filter.value.toLowerCase()
            for (const [item, element] of Object.entries(itemElements)) syncDisplay(element, item.toLowerCase().includes(value))
        }
        selectAllButton.onclick = () => onSelectionChange(selection, Object.keys(itemElements))
        unselectAllButton.onclick = () => onSelectionChange(selection, [])
        elements.buttons['OK'].onclick = () => finish(selection)
        elements.buttons['Cancel'].onclick = () => finish()
        updateUI()
        try { filter.focus({ preventScroll: true }) } catch { filter.focus() }
    })
}

export async function chooseOne(data: (string|AnnotatedString)[]) {
    const result = await showSelection('Please choose one item', data, {pickAndClose: true, showStatus: false, showToolbar: false})
    return result?.[0]
}