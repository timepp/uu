import { getJsonRegexps, getStringFoldingIndicator, segmentByRegex } from './tu.ts'
import { createElement, syncDisplay } from './uu-dom.ts'
import { showDialog } from './uu-dialog.ts'

export function highlightText(text: string, rules: [RegExp, string][]) {
    return segmentByRegex(text, rules).map(part => {
        const span = createElement(null, 'span', [], part.content)
        if (part.category) span.style.color = part.category
        return span
    })
}

export function createJsonView(content: string, customColors: [RegExp, string][] = []) {
    const pre = createElement(null, 'pre', [], '', { overflowX: 'wrap', whiteSpace: 'pre-wrap', wordWrap: 'break-word' })
    for (const part of segmentByRegex(content, [...customColors, ...getJsonRegexps()])) {
        const span = createElement(pre, 'span', [], part.content, { wordWrap: 'break-word', whiteSpace: 'pre-wrap' })
        switch (part.category) {
            case 'key': span.style.color = 'blue'; break
            case 'number': span.style.color = '#f439e6'; break
            case 'true': span.style.color = 'green'; break
            case 'false': span.style.color = 'grey'; break
            case 'null': span.style.color = 'lightblue'; break
            case 'punctuation': span.style.fontWeight = '800'; break
            case '': break
            default: span.style.color = part.category; break
        }
    }
    return pre
}

export function createLargeJsonView(content: string) {
    const main = createElement(null, 'pre')
    main.append(...highlightText(content, [[/"[^"]+":/g, 'blue'], [/…[0-9]+ more (chars|items)…/g, 'red']]))
    return main
}

export function createFoldedString(content: string, maxLength: number) {
    if (content.length <= maxLength) return createElement(null, 'span', [], content)
    const folding = getStringFoldingIndicator(content.length, maxLength)
    const sideLength = Math.floor((content.length - folding.foldedLength) / 2)
    const div = createElement(null, 'div')
    const folder = createElement(div, 'span', ['me-1'], '>>', { color: 'blue', cursor: 'pointer' })
    const shortContent = createElement(div, 'span')
    createElement(shortContent, 'span', [], content.slice(0, sideLength))
    const indicator = createElement(shortContent, 'span', ['text-muted', 'border'], folding.foldIndicator, { cursor: 'pointer' })
    createElement(shortContent, 'span', [], content.slice(content.length - sideLength))
    const longContent = createElement(div, 'span', [], content, { display: 'none' })
    folder.onclick = () => {
        folder.textContent = folder.textContent === '>>' ? '<<' : '>>'
        syncDisplay(shortContent, folder.textContent === '>>')
        syncDisplay(longContent, folder.textContent === '<<')
    }
    indicator.onclick = () => {
        const pre = createElement(null, 'pre', [], content, { maxWidth: '80vw', whiteSpace: 'pre-wrap', wordBreak: 'break-all' })
        showDialog('Full Content', pre, { actions: ['Close'] })
    }
    return div
}