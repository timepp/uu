import { createElement } from './uu-dom.ts'

function ensureDialogStyles() {
    const styleId = 'uu-common-styles'
    if (document.getElementById(styleId)) return
    const style = createElement(document.head, 'style', [], '', {}, { id: styleId })
    style.textContent = `
        dialog::backdrop {
            background: rgba(0,0,0,0.25);
            backdrop-filter: blur(8px) brightness(0.9);
            -webkit-backdrop-filter: blur(8px) brightness(0.9);
        }
    `
}

export type ButtonAction = () => boolean|void|Promise<boolean|void>

export interface DialogOptions {
    classes?: string[]
    style?: Partial<CSSStyleDeclaration>
    softDismissable?: boolean
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

export function showDialog<T>(title: string, content: string | HTMLElement | undefined = undefined, options: DialogOptions = {}, onCreate?: (elements: DialogElements, finisher: (value?: T) => void) => void) {
    ensureDialogStyles()
    const dialog = createElement(document.body, 'dialog', options.classes || [], '', {
        padding: '0', display: 'flex', flexDirection: 'column', resize: 'both', ...(options.style || {})
    })
    const header = createElement(dialog, 'div', ['d-flex', 'justify-content-between', 'align-items-center', 'p-2', 'border-bottom', 'mb-2'])
    header.style.backgroundColor = '#005cf030'
    createElement(header, 'h4', ['m-0', 'ms-2'], title)
    const closeButton = createElement(header, 'button', ['btn', 'btn-close'])
    let resolver: (value?: T) => void
    const promise = new Promise<T|undefined>(resolve => resolver = resolve)
    const finish = (value?: T) => {
        dialog.close()
        dialog.remove()
        resolver(value)
    }
    dialog.addEventListener('cancel', () => finish())
    if (options.softDismissable ?? true) {
        dialog.addEventListener('mousedown', event => {
            if (event.target !== dialog) return
            const rect = dialog.getBoundingClientRect()
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) finish()
        })
    }
    closeButton.onclick = () => finish()
    const container = createElement(dialog, 'div', [], '', { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' })
    const contentArea = createElement(container, 'div', [], '', { flex: '1', overflow: 'auto', padding: '0 10px', outline: 'none' }, { tabIndex: -1 })
    if (typeof content === 'string') contentArea.textContent = content
    else if (content) contentArea.appendChild(content)
    const footer = createElement(container, 'div', ['mt-2', 'mb-2'])
    const buttons: Record<string, HTMLButtonElement> = {}
    if (options.actions) {
        createElement(footer, 'hr')
        const toolbar = createElement(footer, 'div', ['d-flex', 'justify-content-center', 'gap-2'], '', { flexShrink: '0' })
        if (Array.isArray(options.actions)) {
            for (const text of options.actions) {
                const button = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], text)
                button.onclick = () => finish(text as any)
                buttons[text] = button
            }
        } else {
            for (const [text, handler] of Object.entries(options.actions)) {
                const button = createElement(toolbar, 'button', ['btn', 'btn-outline-secondary'], text)
                button.onclick = async () => {
                    if (await handler()) finish(text as any)
                }
                buttons[text] = button
            }
        }
    }
    onCreate?.({ dialog, header, closeButton, contentArea, footer, buttons }, finish)
    dialog.showModal()
    try { contentArea.focus({ preventScroll: true }) } catch { contentArea.focus() }
    if (content || options.actions) {
        dialog.style.height = `${dialog.offsetHeight + 1}px`
        dialog.style.width = `${dialog.offsetWidth + 1}px`
    }
    return promise
}

export function showInDialog(title: string, content: string|HTMLElement, actions: string[] | Record<string, ButtonAction> = ['Close']) {
    return showDialog(title, content, { actions, softDismissable: false })
}

export function showInfo(title: string, content: string) {
    const main = createElement(null, 'pre', [], content, { maxWidth: '800px' })
    return showDialog(title, main, { actions: ['Close'] })
}