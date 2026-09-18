// Centralizes lazy loading and caching for optional UI dependencies. JavaScript
// modules are resolved by the package manager; Bootstrap and Font Awesome remain
// configurable so consumers can use existing stylesheets or load them from a CDN.
import { registerModule, registerModuleValue, setDependencyState } from './uu-runtime-state.ts'

export const bootstrapVersion = '5.3.8'
export const fontAwesomeVersion = '6.4.0'

type CodeMirrorModuleUrls = {
    state: string
    view: string
    language: string
    json: string
    search: string
}

let codeMirrorModuleUrls: CodeMirrorModuleUrls | undefined
let codeMirrorModulesPromise: Promise<any> | undefined
export function setCodeMirrorModuleUrls(urls: CodeMirrorModuleUrls) {
    if (codeMirrorModulesPromise) throw new Error('CodeMirror modules have already started loading')
    codeMirrorModuleUrls = urls
}

export function loadCodeMirrorModules() {
    if (!codeMirrorModulesPromise) {
        setDependencyState('codemirror', 'loading')
        const modules = codeMirrorModuleUrls
            ? Promise.all([
                import(codeMirrorModuleUrls.state),
                import(codeMirrorModuleUrls.view),
                import(codeMirrorModuleUrls.language),
                import(codeMirrorModuleUrls.json),
                import(codeMirrorModuleUrls.search)
            ])
            : Promise.all([
                import('@codemirror/state'),
                import('@codemirror/view'),
                import('@codemirror/language'),
                import('@codemirror/lang-json'),
                import('@codemirror/search')
            ])
        codeMirrorModulesPromise = modules.then(([state, view, language, json, search]) => ({
            EditorState: state.EditorState,
            EditorView: view.EditorView,
            lineNumbers: view.lineNumbers,
            Decoration: view.Decoration,
            hoverTooltip: view.hoverTooltip,
            keymap: view.keymap,
            syntaxHighlighting: language.syntaxHighlighting,
            defaultHighlightStyle: language.defaultHighlightStyle,
            json: json.json,
            search: search.search,
            searchKeymap: search.searchKeymap,
            openSearchPanel: search.openSearchPanel,
            foldGutter: language.foldGutter,
            foldKeymap: language.foldKeymap
        }))
        codeMirrorModulesPromise.then(
            () => setDependencyState('codemirror', 'ready'),
            error => setDependencyState('codemirror', 'error', error)
        )
        codeMirrorModulesPromise.catch(() => {
            codeMirrorModulesPromise = undefined
        })
    }
    return codeMirrorModulesPromise
}

let markdownItModulePromise: Promise<any> | undefined
export function loadMarkdownIt() {
    if (!markdownItModulePromise) {
        setDependencyState('markdown-it', 'loading')
        markdownItModulePromise = import('markdown-it')
        markdownItModulePromise.then(
            () => setDependencyState('markdown-it', 'ready'),
            error => setDependencyState('markdown-it', 'error', error)
        )
        markdownItModulePromise.catch(() => {
            markdownItModulePromise = undefined
        })
    }
    return markdownItModulePromise
}

let chartJsModulePromise: Promise<any> | undefined
export function loadChartJs() {
    if (!chartJsModulePromise) {
        setDependencyState('chart.js', 'loading')
        chartJsModulePromise = import('chart.js/auto')
        chartJsModulePromise.then(
            () => setDependencyState('chart.js', 'ready'),
            error => setDependencyState('chart.js', 'error', error)
        )
        chartJsModulePromise.catch(() => {
            chartJsModulePromise = undefined
        })
    }
    return chartJsModulePromise
}

export function loadFontAwesomeStylesheet(cdnUrl = `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/${fontAwesomeVersion}/css/all.min.css`) {
    const resolvedUrl = new URL(cdnUrl, document.baseURI).href
    const matchingLink = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
        .find(link => link.href === resolvedUrl)
    if (matchingLink) return matchingLink

    const managedLink = document.querySelector<HTMLLinkElement>('link[data-uu-dependency="font-awesome"]')
    if (managedLink) {
        managedLink.href = resolvedUrl
        return managedLink
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = resolvedUrl
    link.dataset.uuDependency = 'font-awesome'
    document.head.appendChild(link)
    return link
}

export function loadBootstrapStylesheet(cdnUrl = `https://cdn.jsdelivr.net/npm/bootstrap@${bootstrapVersion}/dist/css/bootstrap.min.css`): HTMLLinkElement {
    const resolvedUrl = new URL(cdnUrl, document.baseURI).href
    const matchingLink = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
        .find(link => link.href === resolvedUrl)
    if (matchingLink) return matchingLink

    const managedLink = document.querySelector<HTMLLinkElement>('link[data-uu-dependency="bootstrap"]')
    if (managedLink) {
        managedLink.href = resolvedUrl
        return managedLink
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = resolvedUrl
    link.dataset.uuDependency = 'bootstrap'
    document.head.appendChild(link)
    return link
}

registerModule('uu-dependencies')
registerModuleValue('uu-dependencies', 'codeMirrorModulesPromise', () => codeMirrorModulesPromise)
registerModuleValue('uu-dependencies', 'markdownItModulePromise', () => markdownItModulePromise)
registerModuleValue('uu-dependencies', 'chartJsModulePromise', () => chartJsModulePromise)
setDependencyState('codemirror', 'idle')
setDependencyState('markdown-it', 'idle')
setDependencyState('chart.js', 'idle')