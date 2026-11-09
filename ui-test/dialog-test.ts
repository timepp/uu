import { showDialog, type DialogElements, type DialogOptions } from '../src/uu-dialog.ts'
import { createCodeMirrorJsonViewer, showJsonResult } from '../src/uu-json.ts'
import { loadCodeMirrorModules } from '../src/uu-dependencies.ts'

export async function runDialogTests() {
    let checks = 0
    let current: DialogElements | undefined
    const tick = () => new Promise<void>(resolve => setTimeout(resolve, 150))

    function assert(condition: boolean, name: string) {
        if (!condition) throw new Error(name)
        checks++
    }

    function element<E extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): E {
        const result = root.querySelector<E>(selector)
        if (!result) throw new Error(`Missing test element: ${selector}`)
        return result
    }

    function box(width: number, height: number) {
        const content = document.createElement('div')
        Object.assign(content.style, { width: `${width}px`, height: `${height}px` })
        return content
    }

    function open(content?: string | HTMLElement, options: DialogOptions = {}, setup?: (elements: DialogElements) => void) {
        let created: DialogElements | undefined
        const result = showDialog('Dialog regression', content, options, elements => {
            created = elements
            current = elements
            setup?.(elements)
        })
        if (!created) throw new Error('Dialog callback did not run')
        return { elements: created, result }
    }

    async function close() {
        current?.closeButton.click()
        current = undefined
        await tick()
    }

    function contained(elements: DialogElements, name: string) {
        const rect = elements.dialog.getBoundingClientRect()
        const header = elements.header.getBoundingClientRect()
        const footer = elements.footer.getBoundingClientRect()
        assert(rect.left >= -1 && rect.right <= innerWidth + 1, `${name}: dialog stays within viewport width`)
        assert(rect.top >= -1 && rect.bottom <= innerHeight + 1, `${name}: dialog stays within viewport height`)
        assert(header.top >= rect.top && header.bottom <= rect.bottom, `${name}: header remains visible`)
        assert(footer.top >= rect.top && footer.bottom <= rect.bottom, `${name}: footer remains visible`)
        assert(elements.dialog.scrollHeight <= elements.dialog.clientHeight + 1, `${name}: dialog itself does not scroll`)
    }

    try {
        for (const actions of [undefined, ['Close']]) {
            const content = box(90, 40)
            const { elements } = open(content, { actions })
            await tick()
            const before = elements.dialog.getBoundingClientRect()
            Object.assign(content.style, { width: '280px', height: '140px' })
            await tick()
            const grown = elements.dialog.getBoundingClientRect()
            assert(grown.width > before.width + 50, 'Content growth increases dialog width')
            assert(grown.height > before.height + 50, 'Content growth increases dialog height')
            assert(!elements.dialog.style.width && !elements.dialog.style.height, 'Automatic sizing does not write inline dimensions')
            contained(elements, 'Growing content')
            Object.assign(content.style, { width: '90px', height: '40px' })
            await tick()
            assert(elements.dialog.offsetHeight < grown.height - 50, 'Content shrink reduces dialog height')
            assert(elements.dialog.offsetWidth < grown.width - 50, 'Content shrink reduces dialog width')
            await close()
        }

        const lateContent = box(90, 40)
        const late = open(undefined, { actions: ['Close'] }, elements => elements.contentArea.append(lateContent))
        await tick()
        const lateHeight = late.elements.dialog.offsetHeight
        lateContent.style.height = '140px'
        await tick()
        assert(late.elements.dialog.offsetHeight > lateHeight + 50, 'Callback-provided content grows after opening')
        await close()

        const text = open('Short text', { actions: ['Close'] })
        await tick()
        const textHeight = text.elements.dialog.offsetHeight
        text.elements.contentArea.textContent = Array(20).fill('More text').join('\n')
        text.elements.contentArea.style.whiteSpace = 'pre-wrap'
        await tick()
        assert(text.elements.dialog.offsetHeight > textHeight + 50, 'String content grows after replacement')
        contained(text.elements, 'Long text')
        await close()

        const oversized = open(box(2000, 2000), { actions: ['Close'] })
        await tick()
        contained(oversized.elements, 'Oversized content')
        assert(oversized.elements.contentArea.scrollHeight > oversized.elements.contentArea.clientHeight, 'Oversized content scrolls vertically in content area')
        assert(oversized.elements.contentArea.scrollWidth > oversized.elements.contentArea.clientWidth, 'Oversized content scrolls horizontally in content area')
        oversized.elements.contentArea.scrollTop = 100
        assert(Math.abs(oversized.elements.contentArea.scrollTop - 100) <= 1, 'Content area can actually scroll')
        await close()

        const fixedContent = box(90, 40)
        const fixed = open(fixedContent, { actions: ['Close'], style: { width: '70vw', height: '60vh' } })
        await tick()
        const fixedSize = fixed.elements.dialog.getBoundingClientRect()
        fixedContent.style.height = '2000px'
        await tick()
        assert(fixed.elements.dialog.style.width === '70vw' && fixed.elements.dialog.style.height === '60vh', 'Explicit viewport units remain unchanged')
        assert(Math.abs(fixed.elements.dialog.offsetHeight - fixedSize.height) <= 1, 'Explicit height does not grow with content')
        contained(fixed.elements, 'Fixed dimensions')
        await close()

        const min = open(box(90, 40), { style: { minWidth: '50vw', minHeight: '40vh' } })
        await tick()
        assert(min.elements.dialog.offsetWidth >= innerWidth * 0.5 - 1, 'Explicit minimum width is respected')
        assert(min.elements.dialog.offsetHeight >= innerHeight * 0.4 - 1, 'Explicit minimum height is respected')
        await close()

        const data = Array.from({ length: 500 }, (_, index) => ({ index, text: 'Long JSON text '.repeat(30) }))
        const viewer = await createCodeMirrorJsonViewer(data)
        const direct = open(viewer, { actions: ['Close'] })
        await tick()
        contained(direct.elements, 'Direct JSON viewer')
        assert(direct.elements.contentArea.scrollHeight > direct.elements.contentArea.clientHeight, 'Unconstrained JSON viewer scrolls in dialog content area')
        await close()

        const title = `JSON test ${crypto.randomUUID().slice(0, 8)}`
        await showJsonResult(title, data)
        const dialog = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog'))
            .find(candidate => candidate.querySelector('.uu-dialog-title')?.textContent === title)
        if (!dialog) throw new Error('JSON result dialog did not open')
        current = {
            dialog,
            header: element(dialog, '.uu-dialog-header'),
            closeButton: element(dialog, '.uu-dialog-close'),
            contentArea: element(dialog, '.uu-dialog-content'),
            footer: element(dialog, '.uu-dialog-footer'),
            buttons: {},
        }
        await tick()
        function checkViewer(name: string) {
            if (!current) throw new Error('JSON dialog was closed unexpectedly')
            contained(current, name)
            const scroller = element(current.dialog, '.cm-scroller')
            const contentRect = current.contentArea.getBoundingClientRect()
            const scrollRect = scroller.getBoundingClientRect()
            assert(scrollRect.top >= contentRect.top - 1 && scrollRect.bottom <= contentRect.bottom + 1, `${name}: CodeMirror scroller fits inside content area`)
            assert(scroller.clientHeight > 0, `${name}: CodeMirror has usable scrolling space`)
            assert(scroller.scrollHeight > scroller.clientHeight, `${name}: CodeMirror has internal overflow`)
            assert(current.contentArea.scrollHeight <= current.contentArea.clientHeight + 1, `${name}: dialog content does not also scroll`)
            scroller.scrollTop = 100
            assert(scroller.scrollTop >= 99, `${name}: CodeMirror can actually scroll`)
        }
        checkViewer('JSON result')
        const foldLess = Array.from(dialog.querySelectorAll<HTMLButtonElement>('.uu-dialog-action'))
            .find(button => button.textContent === 'Fold Less')
        if (!foldLess) throw new Error('Missing Fold Less button')
        foldLess.click()
        await tick()
        checkViewer('Replaced JSON viewer')
        const { EditorView, openSearchPanel } = await loadCodeMirrorModules()
        openSearchPanel(EditorView.findFromDOM(element(dialog, '.cm-editor')))
        await tick()
        checkViewer('JSON search panel')
        Object.assign(dialog.style, { width: '70vw', height: '85vh' })
        await tick()
        checkViewer('Resized JSON result')
        await close()

        const finished = open('Close test', { actions: ['Done'] })
        finished.elements.buttons.Done.click()
        assert(await finished.result === 'Done', 'Action still resolves the dialog promise')
        assert(!finished.elements.dialog.isConnected, 'Closing removes the dialog')
        current = undefined
        return { checks }
    } finally {
        current?.closeButton.click()
    }
}
