// uu: a set of utility functions for modern web UI
// hash: 1b42bcca556c4933e93266d77230122a2bee122a35f34750d7acf6e513eabacc
// Please do not modify this file directly. Use the following command to update this file on a deno environment:
// deno run -A --reload jsr:@timepp/uu

export function createElement<K extends keyof HTMLElementTagNameMap>(parent: Element, tagName: K, classes: string[], text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tagName)
    e.classList.add(...classes)
    parent.appendChild(e)
    if (text) e.textContent = text
    return e
}

