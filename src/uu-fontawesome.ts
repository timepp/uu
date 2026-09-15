import { loadFontAwesomeStylesheet } from './uu-dependencies.ts'
import { getUURuntimeState, registerDomResource, registerModule, setDependencyState } from './uu-runtime-state.ts'

export function enableFontAwesome(cdnUrl?: string): HTMLLinkElement {
    setDependencyState('font-awesome', 'loading')
    try {
        const link = loadFontAwesomeStylesheet(cdnUrl)
        registerDomResource(link, 'uu-fontawesome', 'stylesheet', 'link[data-uu-dependency="font-awesome"]', 'font-awesome-stylesheet')
        setDependencyState('font-awesome', 'ready')
        return link
    } catch (error) {
        setDependencyState('font-awesome', 'error', error)
        throw error
    }
}

export function ensureFontAwesome(): HTMLLinkElement | undefined {
    if (typeof document === 'undefined') return

    const existing = document.querySelector<HTMLLinkElement>('link[data-uu-dependency="font-awesome"]')
        || [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
            .find(link => /font-?awesome/i.test(link.href))
    if (!existing) return enableFontAwesome()
    registerDomResource(existing, 'uu-fontawesome', 'stylesheet', 'link[rel="stylesheet"]', 'font-awesome-stylesheet')
    setDependencyState('font-awesome', 'ready')
    return existing
}

registerModule('uu-fontawesome')
if (!getUURuntimeState().dependencies['font-awesome']) setDependencyState('font-awesome', 'idle')