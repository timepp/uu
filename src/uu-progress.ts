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
    const dialog = createElement(document.body, 'dialog', ['uu-progress', 'uu-is-loading'])
    const runtimeId = registerDomResource(dialog, 'uu-progress', 'progress-dialog')
    const content = createElement(dialog, 'div', ['uu-progress-content'], '', { textAlign: 'center' })
    createElement(content, 'h4', ['uu-progress-title', 'm-2', 'text-center'], hint)
    const spinner = createElement(content, 'div', ['uu-progress-spinner', 'spinner-border', 'text-primary'])
    dialog.showModal()
    try {
        const result = await fn()
        dialog.close()
        dialog.remove()
        unregisterDomResource(runtimeId)
        return result
    } catch (error) {
        dialog.classList.remove('uu-is-loading')
        dialog.classList.add('uu-has-error')
        spinner.remove()
        createElement(content, 'div', ['uu-progress-error', 'text-danger', 'mt-2'], 'Error occurred:')
        createElement(content, 'hr')
        const message = error instanceof Error ? error.stack || error.message
            : typeof error === 'string' ? error
            : JSON.stringify(error, null, 2)
        createElement(content, 'pre', ['uu-progress-message', 'text-start', 'overflow-auto'], message)
        createElement(content, 'hr')
        const buttons = createElement(content, 'div', ['uu-progress-actions', 'text-center', 'mt-2'])
        createButton(buttons, ['uu-progress-close', 'btn', 'btn-primary'], 'Close', () => {
            dialog.close()
            dialog.remove()
            unregisterDomResource(runtimeId)
        })
        throw error
    }
}

export const withUI = callAsyncFunctionWithProgress

registerModule('uu-progress')