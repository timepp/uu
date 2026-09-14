// Centralizes lazy loading and caching for optional UI dependencies. JavaScript
// modules are resolved by the package manager; Font Awesome remains configurable
// so consumers can use an existing stylesheet or load one from a CDN.
export const fontAwesomeVersion = '6.4.0'

let codeMirrorModulesPromise: Promise<any> | undefined
export function loadCodeMirrorModules() {
    if (!codeMirrorModulesPromise) {
        codeMirrorModulesPromise = Promise.all([
            import('@codemirror/state'),
            import('@codemirror/view'),
            import('@codemirror/language'),
            import('@codemirror/lang-json'),
            import('@codemirror/search')
        ]).then(([state, view, language, json, search]) => ({
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
        codeMirrorModulesPromise.catch(() => {
            codeMirrorModulesPromise = undefined
        })
    }
    return codeMirrorModulesPromise
}

let markdownItModulePromise: Promise<any> | undefined
export function loadMarkdownIt() {
    if (!markdownItModulePromise) {
        markdownItModulePromise = import('markdown-it')
        markdownItModulePromise.catch(() => {
            markdownItModulePromise = undefined
        })
    }
    return markdownItModulePromise
}

let chartJsModulePromise: Promise<any> | undefined
export function loadChartJs() {
    if (!chartJsModulePromise) {
        chartJsModulePromise = import('chart.js/auto')
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