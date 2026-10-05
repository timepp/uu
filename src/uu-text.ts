import { getJsonRegexps, getStringFoldingIndicator, segmentByRegex } from './tu.ts'
import { createElement, syncDisplay } from './uu-dom.ts'
import { showDialog } from './uu-dialog.ts'

export function highlightText(text: string, rules: [RegExp, string][]): HTMLSpanElement[] {
    return segmentByRegex(text, rules).map(part => {
        const span = createElement(null, 'span', ['uu-json-token'], part.content)
        if (part.category) span.style.color = part.category
        return span
    })
}

export function createJsonView(content: string, customColors: [RegExp, string][] = []): HTMLPreElement {
    const pre = createElement(null, 'pre', ['uu-json-text'], '', { overflowX: 'wrap', whiteSpace: 'pre-wrap', wordWrap: 'break-word' })
    for (const part of segmentByRegex(content, [...customColors, ...getJsonRegexps()])) {
        const span = createElement(pre, 'span', ['uu-json-token'], part.content, { wordWrap: 'break-word', whiteSpace: 'pre-wrap' })
        switch (part.category) {
            case 'key': span.classList.add('uu-json-key'); span.style.color = 'blue'; break
            case 'number': span.classList.add('uu-json-number'); span.style.color = '#f439e6'; break
            case 'true': span.classList.add('uu-json-boolean'); span.style.color = 'green'; break
            case 'false': span.classList.add('uu-json-boolean'); span.style.color = 'grey'; break
            case 'null': span.classList.add('uu-json-null'); span.style.color = 'lightblue'; break
            case 'punctuation': span.classList.add('uu-json-punctuation'); span.style.fontWeight = '800'; break
            case '': break
            default: span.style.color = part.category; break
        }
    }
    return pre
}

export function createLargeJsonView(content: string): HTMLPreElement {
    const main = createElement(null, 'pre', ['uu-json-text'])
    main.append(...highlightText(content, [[/"[^"]+":/g, 'blue'], [/…[0-9]+ more (chars|items)…/g, 'red']]))
    return main
}

export function createFoldedString(content: string, maxLength: number): HTMLSpanElement | HTMLDivElement {
    if (content.length <= maxLength) return createElement(null, 'span', ['uu-folded-text'], content)
    const folding = getStringFoldingIndicator(content.length, maxLength)
    const sideLength = Math.floor((content.length - folding.foldedLength) / 2)
    const div = createElement(null, 'div', ['uu-folded-text', 'uu-is-folded'])
    const folder = createElement(div, 'span', ['uu-folded-text-toggle', 'me-1'], '>>', { color: 'blue', cursor: 'pointer' })
    const shortContent = createElement(div, 'span', ['uu-folded-text-short'])
    createElement(shortContent, 'span', ['uu-folded-text-prefix'], content.slice(0, sideLength))
    const indicator = createElement(shortContent, 'span', ['uu-folded-text-indicator', 'text-muted', 'border'], folding.foldIndicator, { cursor: 'pointer' })
    createElement(shortContent, 'span', ['uu-folded-text-suffix'], content.slice(content.length - sideLength))
    const longContent = createElement(div, 'span', ['uu-folded-text-full'], content, { display: 'none' })
    folder.onclick = () => {
        folder.textContent = folder.textContent === '>>' ? '<<' : '>>'
        div.classList.toggle('uu-is-folded', folder.textContent === '>>')
        div.classList.toggle('uu-is-expanded', folder.textContent === '<<')
        syncDisplay(shortContent, folder.textContent === '>>')
        syncDisplay(longContent, folder.textContent === '<<')
    }
    indicator.onclick = () => {
        const pre = createElement(null, 'pre', ['uu-folded-text-dialog'], content, { maxWidth: '80vw', whiteSpace: 'pre-wrap', wordBreak: 'break-all' })
        showDialog('Full Content', pre, { actions: ['Close'] })
    }
    return div
}