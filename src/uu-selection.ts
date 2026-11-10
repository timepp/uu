import type { AnnotatedString } from './uu-dom.ts'
import { createElement, fa, syncDisplay } from './uu-dom.ts'
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
    sortOptions: { label: string, icon?: string, compare: (a: string, b: string) => number }[]
    checker: (oldSelection: string[], newSelection: string[]) => string[] | string
    styleModifier: (item: string, elem: HTMLElement) => void
    dlgStyle: Partial<CSSStyleDeclaration>
}

export type SelectionItem = AnnotatedString | string

export function showSelection(title: string, options: SelectionItem[], cfg: Partial<SelectOption> = {}): Promise<string[] | undefined> {
    return showDialog<string[]>(title, undefined, {
        classes: [], style: {width: '80vw', ...cfg.dlgStyle}, actions: ['OK', 'Cancel'], softDismissable: true
    }, (elements, finish) => {
        let selection = cfg.initialSelection || []
        const itemElements: Record<string, HTMLButtonElement> = {}
        let currentAlert = ''
        const container = createElement(elements.contentArea, 'div', ['uu-selection', 'd-flex', 'flex-column'])
        const toolbar = createElement(container, 'div', ['uu-selection-toolbar', 'd-flex', 'gap-2', 'mb-2', 'mt-2'])
        const filterGroup = createElement(toolbar, 'div', ['uu-selection-filter-group', 'input-group', 'flex-grow-1'], '', { minWidth: '0' })
        const filter = createElement(filterGroup, 'input', ['uu-selection-filter', 'form-control'], '', {}, {placeholder: 'Filter'})
        const sortOptions = cfg.sortOptions || []
        const sortToolbar = sortOptions.length
            ? createElement(toolbar, 'div', ['uu-selection-sort', 'input-group', 'w-auto', 'flex-shrink-0'])
            : undefined
        const selectionToolbar = createElement(toolbar, 'div', ['uu-selection-actions', 'input-group', 'w-auto', 'flex-shrink-0'])
        const selectAllButton = createElement(selectionToolbar, 'button', ['uu-btn', 'uu-selection-all', 'btn', 'btn-outline-secondary'], '☑')
        const unselectAllButton = createElement(selectionToolbar, 'button', ['uu-btn', 'uu-selection-none', 'btn', 'btn-outline-secondary'], '☐')
        const main = createElement(container, 'div', ['uu-selection-items', 'd-flex', 'overflow-auto', 'flex-wrap', 'gap-2', 'mb-4'])
        const statusBar = createElement(container, 'div', ['uu-selection-status', 'form-control', 'd-flex', 'align-items-center'], '', { backgroundColor: 'lightyellow' })
        const selectedPrefix = createElement(statusBar, 'span', ['uu-selection-status-label', 'me-2'], 'Selected: ', { color: 'blue', flexShrink: '0' })
        const selectedItems = new DraggableSortedContainer(statusBar, {
            emptyText: '(none)', showOrder: cfg.showOrder,
            interactive: (cfg.statusInteractive ?? true) && !cfg.singleSelect,
            removable: (cfg.statusInteractive ?? true) && !cfg.singleSelect,
            onChange: newSelection => onSelectionChange(selection, newSelection)
        })
        selectedItems.root.classList.add('uu-selection-selected')
        selectedItems.root.style.minWidth = '0'
        const alert = createElement(container, 'div', ['uu-selection-alert', 'alert', 'alert-danger', 'd-none'])
        if (cfg.pickAndClose) cfg.singleSelect = true
        toolbar.classList.toggle('d-none', !(cfg.showToolbar ?? true))
        statusBar.classList.toggle('d-none', !(cfg.showStatus ?? true))
        syncDisplay(selectionToolbar, !cfg.singleSelect)
        syncDisplay(elements.footer, !cfg.pickAndClose)
        function updateUI() {
            if (!statusBar.firstChild) statusBar.append(selectedPrefix, selectedItems.root)
            selectedItems.setStrings(selection)
            for (const [value, element] of Object.entries(itemElements)) {
                const selected = selection.includes(value)
                element.classList.toggle('uu-is-selected', selected)
                element.classList.toggle('btn-primary', selected)
                element.classList.toggle('btn-outline-secondary', !selected)
                element.setAttribute('aria-pressed', `${selected}`)
            }
            alert.textContent = currentAlert
            alert.classList.toggle('uu-has-error', currentAlert !== '')
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
            const element = createElement(main, 'button', ['uu-btn', 'uu-selection-item', 'btn', 'btn-outline-secondary', 'd-inline-flex', 'align-items-center', 'gap-1'], '', { minWidth: '100px' }, { type: 'button' })
            createElement(element, 'span', ['uu-selection-value'], item.value)
            if (item.comment) {
                createElement(element, 'span', ['uu-selection-separator'], '', { border: '1px solid #cccccc', margin: '0 5px', width: '1px', height: '80%' })
                createElement(element, 'span', ['uu-selection-comment', 'text-muted'], item.comment)
            }
            itemElements[item.value] = element
            cfg.styleModifier?.(item.value, element)
            element.onclick = () => onSelectionChange(selection, cfg.singleSelect ? [item.value] : selection.includes(item.value) ? selection.filter(value => value !== item.value) : [...selection, item.value])
        }
        if (sortToolbar) {
            const sortButtons = sortOptions.map(option => {
                const button = createElement(sortToolbar, 'button', ['uu-btn', 'uu-selection-sort-option', 'btn', 'btn-outline-secondary'], option.icon ? fa(option.icon) : option.label)
                button.title = option.label
                button.setAttribute('aria-label', option.label)
                button.onclick = () => {
                    for (const other of sortButtons) {
                        other.classList.toggle('active', other === button)
                        other.classList.toggle('uu-is-active', other === button)
                    }
                    main.append(...Object.keys(itemElements).sort(option.compare).map(value => itemElements[value]))
                }
                return button
            })
            sortButtons[0].click()
        }
        filter.oninput = () => {
            const value = filter.value.toLowerCase()
            for (const [item, element] of Object.entries(itemElements)) element.classList.toggle('d-none', !item.toLowerCase().includes(value))
        }
        selectAllButton.onclick = () => onSelectionChange(selection, Object.keys(itemElements))
        unselectAllButton.onclick = () => onSelectionChange(selection, [])
        elements.buttons['OK'].onclick = () => finish(selection)
        elements.buttons['Cancel'].onclick = () => finish()
        updateUI()
        try { filter.focus({ preventScroll: true }) } catch { filter.focus() }
    })
}

export async function chooseOne(data: (string|AnnotatedString)[]): Promise<string | undefined> {
    const result = await showSelection('Please choose one item', data, {pickAndClose: true, showStatus: false, showToolbar: false})
    return result?.[0]
}