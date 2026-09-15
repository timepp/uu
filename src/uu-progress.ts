import { createButton, createElement } from './uu-dom.ts'
import { registerDomResource, registerModule, unregisterDomResource } from './uu-runtime-state.ts'

export async function asyncGet<T>(fn: () => T): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 100))
    return fn()
}

export function asyncCallFunctionWithProgress(fn: () => void, hint = 'Please wait...') {
    setTimeout(() => {
        callAsyncFunctionWithProgress(() => asyncGet(fn), hint)
    }, 0)
}

export async function callAsyncFunctionWithProgress<T>(fn: () => Promise<T>, hint = 'Please wait...'): Promise<T> {
    const dialog = createElement(document.body, 'dialog')
    const runtimeId = registerDomResource(dialog, 'uu-progress', 'progress-dialog')
    const content = createElement(dialog, 'div', [], '', { textAlign: 'center' })
    createElement(content, 'h4', ['m-2', 'text-center'], hint)
    const spinner = createElement(content, 'div', ['spinner-border', 'text-primary'])
    dialog.showModal()
    try {
        const result = await fn()
        dialog.close()
        dialog.remove()
        unregisterDomResource(runtimeId)
        return result
    } catch (error) {
        spinner.remove()
        createElement(content, 'div', ['text-danger', 'mt-2'], 'Error occurred:')
        createElement(content, 'hr')
        const message = error instanceof Error ? error.stack || error.message
            : typeof error === 'string' ? error
            : JSON.stringify(error, null, 2)
        createElement(content, 'pre', ['text-start', 'overflow-auto'], message)
        createElement(content, 'hr')
        const buttons = createElement(content, 'div', ['text-center', 'mt-2'])
        createButton(buttons, ['btn', 'btn-primary'], 'Close', () => {
            dialog.close()
            dialog.remove()
            unregisterDomResource(runtimeId)
        })
        throw error
    }
}

export const withUI = callAsyncFunctionWithProgress

registerModule('uu-progress')