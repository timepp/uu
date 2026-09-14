import { createObservableState, stringToColor } from './tu.ts'
import { createCheckBtn, createElement, createLoadingSpinner, fa } from './uu-dom.ts'
import { registerDomResource, registerModule, unregisterDomResource } from './uu-runtime-state.ts'

export function createSelector(parent: HTMLElement | null, options: string[], onChange: (value: string[]) => void, multiSelect = false, initialValue: string[] = []) {
    const div = createElement(parent, 'div', ['d-flex', 'flex-wrap', 'gap-1'])
    const btns = options.map(o => {
        const btn = createCheckBtn(div, [], o, stringToColor(o, 100, 90), initialValue.includes(o))
        btn.checkbox.value = o
        return btn
    })
    const getSelected = () => btns.filter(b => b.checkbox.checked).map(b => b.checkbox.value)
    const setSelected = (values: string[]) => {
        btns.forEach(btn => {
            btn.checkbox.checked = values.includes(btn.checkbox.value)
        })
    }
    btns.forEach(btn => {
        btn.checkbox.addEventListener('change', () => {
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

export function associateDropdownActions(elem: HTMLElement, actions: Record<string, () => void> | {name: string, action: () => void}[]) {
    type DropdownElement = HTMLElement & { dropdown?: HTMLElement }
    const element = elem as DropdownElement
    element.onclick = () => {
        if (element.dropdown) return
        const container = element.closest('dialog') || document.body
        const dropdown = createElement(container, 'div', ['dropdown-menu', 'show'], '', { position: 'fixed', zIndex: '1050' })
        const runtimeId = registerDomResource(dropdown, 'uu-controls', 'dropdown')
        const rect = element.getBoundingClientRect()
        container.appendChild(dropdown)
        let left = rect.left
        let top = rect.bottom
        const width = dropdown.offsetWidth || 200
        const height = dropdown.offsetHeight || 100
        if (left + width > window.innerWidth) left = rect.right - width
        if (top + height > window.innerHeight) top = rect.top - height
        dropdown.style.left = `${left}px`
        dropdown.style.top = `${top}px`
        element.dropdown = dropdown
        const entries = Array.isArray(actions) ? actions : Object.entries(actions).map(([name, action]) => ({name, action}))
        for (const {name, action} of entries) {
            const item = createElement(dropdown, 'a', ['dropdown-item'], name, { cursor: 'pointer' })
            item.onclick = action
        }
        function closeDropdown() {
            element.dropdown?.remove()
            delete element.dropdown
            unregisterDomResource(runtimeId)
            document.removeEventListener('click', closeDropdown)
        }
        setTimeout(() => document.addEventListener('click', closeDropdown), 0)
    }
}

export type ContentProvider = HTMLElement | ((refresh: boolean) => HTMLElement) | ((refresh: boolean) => Promise<HTMLElement>)

export function createFoldableArea(parent: Element | null, title: string, content?: ContentProvider, initiallyFolded = true) {
    const div = createElement(parent, 'div', ['card', 'mb-2', 'mt-2'])
    const header = createElement(div, 'div', ['card-header', 'd-flex', 'justify-content-between', 'align-items-center'], '', {cursor: 'pointer'})
    createElement(header, 'span', [], title)
    const buttons = createElement(header, 'div', ['btn-group'])
    const refreshButton = createElement(buttons, 'button', ['btn', 'btn-sm', 'btn-outline-secondary', 'me-1'], fa('fa-sync'))
    const toggleButton = createElement(buttons, 'button', ['btn', 'btn-sm', 'btn-outline-secondary'])
    const body = createElement(div, 'div', ['card-body', 'p-1'])
    async function reloadContent(refresh: boolean) {
        if (!content) return
        body.replaceChildren()
        if (typeof content !== 'function') return body.appendChild(content)
        const loading = createLoadingSpinner(body)
        try {
            const element = await content(refresh)
            loading.remove()
            body.appendChild(element)
        } catch (error) {
            console.error('Error loading foldable content:', error)
            loading.remove()
            createElement(body, 'div', ['text-danger'], 'Error loading content')
        }
    }
    const state = createObservableState(null, { folded: initiallyFolded }, value => {
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