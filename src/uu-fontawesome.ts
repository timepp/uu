import { loadFontAwesomeStylesheet } from './uu-dependencies.ts'

export function enableFontAwesome(cdnUrl?: string) {
    return loadFontAwesomeStylesheet(cdnUrl)
}

export function ensureFontAwesome() {
    if (typeof document === 'undefined') return

    const existing = document.querySelector<HTMLLinkElement>('link[data-uu-dependency="font-awesome"]')
        || [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
            .find(link => /font-?awesome/i.test(link.href))
    return existing || enableFontAwesome()
}