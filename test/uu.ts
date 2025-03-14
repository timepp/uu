// uu: a set of utility functions for modern web UI
// hash: a6bc88fddfdde0339e774ae46344c50ed9a1e5cef511ed266986b5af08e86197
// Please do not modify this file directly. Use the following command to update this file on a deno environment:
// deno run -A --reload jsr:@timepp/uu

export function createElement<K extends keyof HTMLElementTagNameMap>(parent: Element, tagName: K, classes: string[], text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tagName)
    e.classList.add(...classes)
    parent.appendChild(e)
    if (text) e.textContent = text
    return e
}

