import { loadBootstrapStylesheet } from './uu-dependencies.ts'
import { getUURuntimeState, registerDomResource, registerModule, setDependencyState } from './uu-runtime-state.ts'

let autoLoadBootstrap = true
let ensuredBootstrapLink: HTMLLinkElement | null | undefined
let observedBootstrapHref = ''

function registerBootstrapStylesheet(link: HTMLLinkElement): HTMLLinkElement {
    ensuredBootstrapLink = link
    if (observedBootstrapHref === link.href) return link
    observedBootstrapHref = link.href
    registerDomResource(link, 'uu-bootstrap', 'stylesheet', 'link[rel="stylesheet"]', 'bootstrap-stylesheet')
    if (link.sheet) {
        setDependencyState('bootstrap', 'ready')
        return link
    }
    setDependencyState('bootstrap', 'loading')
    link.addEventListener('load', () => setDependencyState('bootstrap', 'ready'), { once: true })
    link.addEventListener('error', () => setDependencyState('bootstrap', 'error', new Error(`Failed to load Bootstrap stylesheet: ${link.href}`)), { once: true })
    return link
}

function findBootstrapStylesheet(): HTMLLinkElement | undefined {
    return document.querySelector<HTMLLinkElement>('link[data-uu-dependency="bootstrap"]')
        || [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
            .find(link => /(?:^|[/@])bootstrap(?:[.@/-]|$).*\.css(?:$|[?#])/i.test(link.href))
}

function hasBootstrapStyles(): boolean {
    return typeof getComputedStyle === 'function'
        && getComputedStyle(document.documentElement).getPropertyValue('--bs-blue').trim() !== ''
}

export function enableBootstrap(cdnUrl?: string): HTMLLinkElement {
    if (typeof document === 'undefined') throw new Error('Bootstrap can only be enabled in a browser environment')
    autoLoadBootstrap = true
    return registerBootstrapStylesheet(loadBootstrapStylesheet(cdnUrl))
}

export function ensureBootstrap(): HTMLLinkElement | undefined {
    if (typeof document === 'undefined' || !autoLoadBootstrap) return
    if (ensuredBootstrapLink?.isConnected) return ensuredBootstrapLink
    if (ensuredBootstrapLink === null && hasBootstrapStyles()) return
    const existing = findBootstrapStylesheet()
    if (existing) return registerBootstrapStylesheet(existing)
    if (hasBootstrapStyles()) {
        ensuredBootstrapLink = null
        setDependencyState('bootstrap', 'ready')
        return
    }
    return enableBootstrap()
}

export function setBootstrapAutoLoad(enabled: boolean): void {
    autoLoadBootstrap = enabled
    if (enabled) ensureBootstrap()
}

registerModule('uu-bootstrap')
if (!getUURuntimeState().dependencies.bootstrap) setDependencyState('bootstrap', 'idle')