import { extractJsonObjects, safeStringify } from './tu.ts'
import { loadCodeMirrorModules } from './uu-dependencies.ts'
import { showDialog, showInDialog, type ButtonAction } from './uu-dialog.ts'
import { createElement } from './uu-dom.ts'
import { triggerDownload } from './uu-download.ts'
import { callAsyncFunctionWithProgress } from './uu-progress.ts'

export type EntityRenderer = {
    anchorStyle: string,
    render: () => HTMLElement | Promise<HTMLElement>
}
export type VisualizeCallback = (path: string[], value: any) => EntityRenderer|undefined
export type JsonViewerOptions = {
    stringFoldThreshold?: number
    visualizeCallback?: VisualizeCallback
}
export type InformationExtractor = (obj: object) => HTMLElement | Promise<HTMLElement>
export type EntityParser = (path: string[], value: any) => EntityRenderer|undefined

let informationExtractor: InformationExtractor | null = null
let globalEntityParser: EntityParser | null = null

export function setInformationExtractor(extractor: InformationExtractor) {
    informationExtractor = extractor
}

export function setGlobalEntityParser(parser: EntityParser) {
    globalEntityParser = parser
}

export async function showJsonResult(title: string, content: string | object, parser?: EntityParser) {
    const object = typeof content === 'string' ? JSON.parse(content) : content
    const fullText = JSON.stringify(object, null, 2)
    const entityParser = parser || globalEntityParser ? (path: string[], value: any) => parser?.(path, value) || globalEntityParser?.(path, value) : undefined
    let stringFoldThreshold = 80
    const createViewer = () => createCodeMirrorJsonViewer(object, { stringFoldThreshold, visualizeCallback: entityParser })
    const container = createElement(null, 'div')
    container.append(await createViewer())
    const actions: Record<string, ButtonAction> = {
        'Fold Less': async () => {
            stringFoldThreshold += 80
            container.replaceChildren(await createViewer())
        },
        'Fold More': async () => {
            stringFoldThreshold = Math.max(80, stringFoldThreshold - 80)
            container.replaceChildren(await createViewer())
        },
        Copy: () => navigator.clipboard.writeText(fullText),
        Download: () => triggerDownload(object, `${title.replace(/\s+/g, '_')}.json`)
    }
    if (informationExtractor) actions.Entities = async () => {
        await showInDialog('Extracted Entities', await informationExtractor!(object))
    }
    actions.Close = () => true
    showInDialog(title, container, actions)
}

export function showGeneralText(title: string, content: string) {
    const pre = createElement(null, 'pre', [], content, { maxWidth: '80vw', whiteSpace: 'pre-wrap', wordBreak: 'break-all' })
    showDialog(title, pre, {
        actions: {
            parseJson: () => showJsonResult('Parsed JSON Objects', extractJsonObjects(content))
        }
    })
}

export async function createCodeMirrorJsonViewer(obj: object, options: JsonViewerOptions = {}) {
    const modules = await callAsyncFunctionWithProgress(loadCodeMirrorModules)
    const { EditorState, EditorView, lineNumbers, Decoration, hoverTooltip, syntaxHighlighting, defaultHighlightStyle, json, search, searchKeymap, keymap, foldGutter, foldKeymap } = modules
    const parent = createElement(null, 'div', [], '', { border: '1px solid #ddd', borderRadius: '4px', height: '100%', overflow: 'hidden' })
    const visualizers: {start: number, end: number, type: 'fold'|'visualizer', marker: any, render: EntityRenderer|string}[] = []
    const doc = safeStringify(obj, 2, options.stringFoldThreshold ?? 80, Infinity, false, (path, value, start, end, isTrimmed) => {
        const renderer = options.visualizeCallback?.(path, value)
        if (renderer) {
            visualizers.push({ type: 'visualizer', start, end, marker: Decoration.mark({attributes: {style: renderer.anchorStyle}, inclusive: false}), render: renderer })
        } else if (typeof value === 'string' && isTrimmed) {
            visualizers.push({ type: 'fold', start, end, marker: Decoration.mark({attributes: {style: 'text-decoration: underline dotted; cursor: help;'}, inclusive: false}), render: value })
        }
    }).str
    const decorations = Decoration.set(visualizers.map(item => item.marker.range(item.start, item.end)))
    const tooltip = hoverTooltip((_view: any, position: number) => {
        const item = visualizers.find(candidate => candidate.type === 'visualizer' && position >= candidate.start && position <= candidate.end)
        if (!item) return null
        return {
            pos: item.start, end: item.end, above: true,
            create: () => {
                const dom = document.createElement('div')
                const rendered = (item.render as EntityRenderer).render()
                if (rendered instanceof Promise) rendered.then(element => dom.appendChild(element))
                else dom.appendChild(rendered)
                return { dom }
            }
        }
    })
    const clickHandler = EditorView.domEventHandlers({
        click: (event: MouseEvent, view: any) => {
            const position = view.posAtCoords({x: event.clientX, y: event.clientY})
            const item = visualizers.find(candidate => position !== null && position >= candidate.start && position <= candidate.end)
            if (!item) return false
            if (typeof item.render === 'string') showGeneralText('Full Content', item.render)
            else Promise.resolve(item.render.render()).then(element => showDialog('Details', element))
            return true
        }
    })
    const state = EditorState.create({
        doc,
        extensions: [
            lineNumbers(), foldGutter(), keymap.of(foldKeymap), syntaxHighlighting(defaultHighlightStyle), json(),
            EditorState.readOnly.of(true), EditorView.decorations.of(decorations), tooltip, clickHandler,
            EditorView.theme({
                '&': {height: '100%', maxWidth: '100%'},
                '.cm-scroller': {overflow: 'auto', maxWidth: '100%'},
                '.cm-content': {whiteSpace: 'pre-wrap !important', wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%'},
                '.cm-line': {whiteSpace: 'pre-wrap !important', wordBreak: 'break-word !important', overflowWrap: 'anywhere !important', maxWidth: '100%'}
            }),
            search({top: true}), keymap.of(searchKeymap)
        ]
    })
    new EditorView({state, parent})
    parent.style.width = '100%'
    parent.style.maxWidth = '80vw'
    parent.style.minHeight = '400px'
    parent.style.maxHeight = '70vh'
    return parent
}

export async function createCodeMirrorJsonEditor(initialText: string) {
    const { EditorState, EditorView, lineNumbers, syntaxHighlighting, defaultHighlightStyle, json } = await callAsyncFunctionWithProgress(loadCodeMirrorModules)
    const parent = createElement(null, 'div', [], '', { border: '1px solid #ddd', borderRadius: '4px', height: '400px', overflow: 'hidden' })
    const state = EditorState.create({
        doc: initialText,
        extensions: [
            lineNumbers(), syntaxHighlighting(defaultHighlightStyle), json(),
            EditorView.theme({'&': {height: '100%'}, '.cm-scroller': {overflow: 'auto'}, '.cm-content': {whiteSpace: 'pre-wrap', wordBreak: 'break-word'}})
        ]
    })
    const view = new EditorView({state, parent})
    return {
        div: parent,
        getValue: () => view.state.doc.toString(),
        setValue: (text: string) => view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: text}})
    }
}