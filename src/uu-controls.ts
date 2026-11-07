import { createObservableState, stringToColor, type MaybePromise } from './tu.ts'
import { createCheckBtn, createElement, createLoadingSpinner, fa } from './uu-dom.ts'
import { registerDomResource, registerModule, unregisterDomResource } from './uu-runtime-state.ts'

export type SelectorControl = {
    element: HTMLDivElement
    getSelected: () => string[]
    setSelected: (values: string[]) => void
}

export type FoldableArea = {
    div: HTMLDivElement
    header: HTMLDivElement
    body: HTMLDivElement
    toggleBtn: HTMLButtonElement
    refreshBtn: HTMLButtonElement
}

export function createSelector(parent: HTMLElement | null, options: string[], onChange: (value: string[]) => void, multiSelect = false, initialValue: string[] = []): SelectorControl {
    const div = createElement(parent, 'div', ['uu-selector', 'd-flex', 'flex-wrap', 'gap-1'])
    const btns = options.map(o => {
        const btn = createCheckBtn(div, [], o, stringToColor(o, 100, 90), initialValue.includes(o))
        btn.div.classList.add('uu-selector-item')
        btn.checkbox.value = o
        btn.div.classList.toggle('uu-is-selected', btn.checkbox.checked)
        return btn
    })
    const getSelected = () => btns.filter(b => b.checkbox.checked).map(b => b.checkbox.value)
    const setSelected = (values: string[]) => {
        btns.forEach(btn => {
            btn.checkbox.checked = values.includes(btn.checkbox.value)
            btn.div.classList.toggle('uu-is-selected', btn.checkbox.checked)
        })
    }
    btns.forEach(btn => {
        btn.checkbox.addEventListener('change', () => {
            btn.div.classList.toggle('uu-is-selected', btn.checkbox.checked)
            const selected = getSelected()
            if (!multiSelect && selected.length > 1) {
                btns.forEach(b => {
                    if (b !== btn && b.checkbox.checked) {
                        b.checkbox.click()
                    }
                })
            }
            onChange(selected)
        })
    })

    return {
        element: div,
        getSelected,
        setSelected
    }
}

export type DropdownAction = { name: string, action: () => void } | { separator: true }

export function associateDropdownActions(elem: HTMLElement, actions: Record<string, () => void> | DropdownAction[] | (() => DropdownAction[])): (position?: { x: number, y: number }) => HTMLDivElement | undefined {
    type DropdownElement = HTMLElement & { dropdown?: HTMLElement }
    const element = elem as DropdownElement
    let closeDropdown: (() => void) | undefined
    function toggleDropdown(position?: { x: number, y: number }): HTMLDivElement | undefined {
        if (closeDropdown) {
            closeDropdown()
            return
        }
        const container = element.closest('dialog') || document.body
        const dropdown = createElement(container, 'div', ['uu-dropdown', 'dropdown-menu', 'show'], '', {
            position: 'fixed', zIndex: '1050', left: '0', top: '0',
            maxWidth: '100vw', maxHeight: '100vh', overflowY: 'auto', boxSizing: 'border-box',
        })
        const runtimeId = registerDomResource(dropdown, 'uu-controls', 'dropdown')
        const entries = typeof actions === 'function' ? actions() : Array.isArray(actions) ? actions : Object.entries(actions).map(([name, action]) => ({name, action}))
        for (const entry of entries) {
            if ('separator' in entry) {
                createElement(dropdown, 'hr', ['uu-dropdown-divider', 'dropdown-divider'])
            } else {
                const item = createElement(dropdown, 'a', ['uu-dropdown-item', 'dropdown-item'], entry.name, { cursor: 'pointer' })
                item.onclick = entry.action
            }
        }
        const rect = element.getBoundingClientRect()
        container.appendChild(dropdown)
        let left = position?.x ?? rect.left
        let top = position?.y ?? rect.bottom
        const width = dropdown.getBoundingClientRect().width || 200
        dropdown.style.width = `${width}px`
        const height = dropdown.getBoundingClientRect().height || 100
        if (left + width > window.innerWidth) left = position ? window.innerWidth - width : rect.right - width
        if (top + height > window.innerHeight) top = position ? window.innerHeight - height : rect.top - height
        dropdown.style.left = `${Math.max(0, left)}px`
        dropdown.style.top = `${Math.max(0, top)}px`
        element.dropdown = dropdown
        function onDocumentClick(event: MouseEvent) {
            if (event.target instanceof Node && element.contains(event.target)) return
            closeDropdown?.()
        }
        closeDropdown = () => {
            dropdown.remove()
            delete element.dropdown
            unregisterDomResource(runtimeId)
            document.removeEventListener('click', onDocumentClick, true)
            closeDropdown = undefined
        }
        document.addEventListener('click', onDocumentClick, true)
        return dropdown
    }
    element.onclick = () => toggleDropdown()
    return toggleDropdown
}

export type ContentProvider = HTMLElement | ((refresh: boolean) => MaybePromise<HTMLElement>)

export function createFoldableArea(parent: Element | null, title: string, content?: ContentProvider, initiallyFolded = true): FoldableArea {
    const div = createElement(parent, 'div', ['uu-fold', 'card', 'mb-2', 'mt-2'])
    const header = createElement(div, 'div', ['uu-fold-header', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center'], '', {cursor: 'pointer'})
    createElement(header, 'span', ['uu-fold-title'], title)
    const buttons = createElement(header, 'div', ['uu-fold-actions', 'btn-group'])
    const refreshButton = createElement(buttons, 'button', ['uu-btn', 'uu-fold-refresh', 'btn', 'btn-sm', 'btn-outline-secondary', 'me-1'], fa('fa-sync'))
    const toggleButton = createElement(buttons, 'button', ['uu-btn', 'uu-fold-toggle', 'btn', 'btn-sm', 'btn-outline-secondary'])
    const body = createElement(div, 'div', ['uu-fold-body', 'card-body', 'p-1'])
    async function reloadContent(refresh: boolean) {
        if (!content) return
        div.classList.remove('uu-has-error')
        body.replaceChildren()
        if (typeof content !== 'function') return body.appendChild(content)
        const loading = createLoadingSpinner(body)
        loading.classList.add('uu-fold-loading')
        div.classList.add('uu-is-loading')
        try {
            const element = await content(refresh)
            loading.remove()
            div.classList.remove('uu-is-loading')
            body.appendChild(element)
        } catch (error) {
            console.error('Error loading foldable content:', error)
            loading.remove()
            div.classList.remove('uu-is-loading')
            div.classList.add('uu-has-error')
            createElement(body, 'div', ['uu-fold-error', 'text-danger'], 'Error loading content')
        }
    }
    const state = createObservableState(null, { folded: initiallyFolded }, value => {
        div.classList.toggle('uu-is-folded', value.folded)
        toggleButton.replaceChildren(value.folded ? fa('fa-chevron-down') : fa('fa-chevron-up'))
        body.style.display = value.folded ? 'none' : ''
        div.style.borderColor = value.folded ? '#ccc' : '#007bff'
        if (body.children.length === 0 && !value.folded) reloadContent(false)
        refreshButton.style.display = value.folded ? 'none' : ''
    })
    header.onclick = () => state.folded = !state.folded
    refreshButton.onclick = async event => {
        event.stopPropagation()
        await reloadContent(true)
    }
    return { div, header, body, toggleBtn: toggleButton, refreshBtn: refreshButton }
}

registerModule('uu-controls')