// uu: a set of utility functions for modern web UI
// hash: a6bc88fddfdde0339e774ae46344c50ed9a1e5cef511ed266986b5af08e86197
// Please do not modify this file directly. Use the following command to update this file on a deno environment:
// deno run -A --reload jsr:@timepp/uu

function traverseObjectInternal(obj: any, callback: (path: string[], value: any, type: 'object'|'leaf'|'loop') => void, path: string[], seenObjects: WeakSet<object>): void {
    if (typeof obj !== 'object' || obj === null) {
        callback(path, obj, 'leaf');
        return;
    }

    if (seenObjects.has(obj)) {
        callback(path, obj, 'loop');
    } else {
        seenObjects.add(obj);
        callback(path, obj, 'object');
        for (const key in obj) {
            traverseObjectInternal(obj[key], callback, [...path, key], seenObjects);
        }
    }
}

export function traverseObject(obj: any, callback: (path: string[], value: any, type: 'object'|'leaf'|'loop') => void): void {
    const seenObjects = new WeakSet<object>()
    traverseObjectInternal(obj, callback, [], seenObjects)
}

export function dataProperties(arr: object[]) {
    const propSet = new Set<string>()
    for (const item of arr) {
        for (const key in item) {
            propSet.add(key)
        }
    }
    return [...propSet]
}

/// get time as YYYY-MM-DD HH:mm:ss
/// timeZoneOffset is in minutes, e.g. 
//     -480: for UTC+8
//     480: for UTC-8
//     0: for UTC
//     undefined: for local device timezone (so the result can be different on different devices)
export function formatTime(d: Date, timeZoneOffset?: number) {
    const t = d.getTime()
    const date = new Date(t - (timeZoneOffset??d.getTimezoneOffset()) * 60 * 1000)
    return date.toISOString().slice(0, 19).replace('T', ' ')
}

export function formatFloat(n: number, digits = 2, mininumDigits = 0) {
    return n.toLocaleString(undefined, { 
        minimumFractionDigits: mininumDigits, 
        maximumFractionDigits: digits,
        useGrouping: false,
    })
}

/// break text into pieces by given regex matchers
/// each piece is attached with a category
/// return: {content, category}[] that covers the whole text
export function highLight(text: string, hc: [RegExp, string][]) {
    const matches: { index: number; length: number; content: string; category: string }[] = [];

    // 收集所有匹配项，按照优先级从高到低处理
    for (const [re, category] of hc) {
        for (const match of text.matchAll(re)) {
            if (match.index !== undefined) {
                const matchStart = match.index;
                const matchEnd = matchStart + match.length;

                // 检查是否与已有匹配项重叠
                let overlap = false;
                for (const existingMatch of matches) {
                    const existingStart = existingMatch.index;
                    const existingEnd = existingStart + existingMatch.length;
                    if ((matchStart < existingEnd && matchEnd > existingStart)) {
                        overlap = true;
                        break;
                    }
                }

                // 如果没有重叠，添加到匹配项列表
                if (!overlap) {
                    matches.push({ index: match.index, length: match[0].length, content: match[0], category });
                }
            }
        }
    }

    // 按 `index` 从小到大排序，确保匹配顺序正确
    matches.sort((a, b) => a.index - b.index);
    console.log(matches)
    
    // run through the text and create pieces
    const pieces: { content: string, category: string }[] = [];
    let lastIndex = 0;
    for (const match of matches) {
        const { index, length, content, category } = match;
        if (lastIndex < index) {
            pieces.push({content: text.slice(lastIndex, index), category: ''});
        }
        pieces.push({content, category});
        lastIndex = index + length;
    }
    if (lastIndex < text.length) {
        pieces.push({content: text.slice(lastIndex), category: ''});
    }
    return pieces;
}

/// highlight json text with the following constructs:
/// - key: "key":
/// - string: "string"
/// - number: 123
/// - boolean: true/false
/// - null: null
/// - punctuation: {, }, [, ], :, ,
export function highlightJson(text: string) {
    return highLight(text, [
        [/"[^"]+":/g, 'key'],
        [/"(?:[^"\\]|\\.)*"/g, 'string'], // 支持转义的字符串匹配
        [/\d+/g, 'number'],
        [/true/g, 'true'],
        [/false/g, 'false'],
        [/null/g, 'null'],
        [/[{}[\]:,]/g, 'punctuation'],
    ]) as {
        content: string,
        category: 'key' | 'string' | 'number' | 'true' | 'false' | 'null' | 'punctuation' | ''
    }[]
}

export function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export function derivedUrl(oldUrl: string, paramsToAdd: Record<string, string>, paramsToRemove?: RegExp) {
    const url = new URL(oldUrl)
    if (paramsToRemove) {
        const keys = [...url.searchParams.keys()]
        for (const key of keys) {
            if (paramsToRemove.test(key)) {
                url.searchParams.delete(key)
            }
        }
    }
    for (const [key, value] of Object.entries(paramsToAdd)) {
        url.searchParams.set(key, value)
    }
    return url.toString()
}

export function createElement<K extends keyof HTMLElementTagNameMap>(parent: Element | null, tagName: K, classes: string[] = [], text?: string, style: Partial<CSSStyleDeclaration> = {}) {
    const e = document.createElement(tagName)
    e.classList.add(...classes)
    if (parent) parent.appendChild(e)
    if (text) e.textContent = text
    for (const [key, value] of Object.entries(style)) {
        if (value !== undefined) {
            e.style[key as any] = value as string
        }
    }
    return e
}

export async function callAsyncFunctionWithProgress<T>(fn: () => Promise<T>) {
    const dialog = createElement(document.body, 'dialog', [])
    const dc = createElement(dialog, 'div', [])
    dc.style.textAlign = "center"
    createElement(dc, 'h4', ['m-2'], 'Please wait...')
    // show a centered spinner
    createElement(dc, 'div', ['spinner-border', 'text-primary'], '')
    dialog.showModal()
    try {
        const r = await fn()
        dialog.close()
        dialog.remove()
        return r
    } catch (e) {
        dialog.close()
        dialog.remove()
        throw e
    }
}

// show information dialog, content is normal text, dialog no longer fix height
export function showInfo(title: string, content: string) {
    const dialog = createElement(document.body, 'dialog', [])

    const dc = createElement(dialog, 'div', [])

    const header = createElement(dc, 'div', [])
    header.style.textAlign = "center"
    createElement(header, 'h2', [], title)
    createElement(dc, 'hr', [])

    const main = createElement(dc, 'div', [])
    main.style.maxWidth = "800px"
    const h = highLight(content, [[/error:/ig, 'red']])
    // main.appendChild(h)

    createElement(dc, 'hr', [])

    const footer = createElement(dc, 'div', ['d-flex', 'justify-content-center'])
    const closeButton = createElement(footer, 'button', ['btn', 'btn-primary'], 'Close')
    closeButton.onclick = () => {
        dialog.close()
        dialog.remove()
    }
    dialog.showModal()
    return dialog
}

export function createJsonView(content: string) {
    const parts = highlightJson(content)
    const pre = createElement(null, 'pre', [])

    for (const part of parts) {
        const span = createElement(pre, 'span')
        span.textContent = part.content
        switch (part.category) {
            case 'key': span.style.color = 'blue'; break
            // case 'string': span.style.color = 'purple'; break
            case 'number': span.style.color = '#f439e6'; break
            case 'true': span.style.color = 'green'; break
            case 'false': span.style.color = 'red'; break
            case 'null': span.style.backgroundColor = 'yellow'; break
            case 'punctuation': span.style.fontWeight = "800"; break
        }
    }

    return pre
}

export function showJsonResult(title: string, content: string) {
    const dialog = createElement(document.body, 'dialog', [])
    dialog.style.width = "80vw";  
    dialog.style.height = "80vh"; 

    const dc = createElement(dialog, 'div', [])
    dc.style.width = "100%";   // 宽度100%
    dc.style.height = "100%";  // 高度100%
    dc.style.display = "flex";
    dc.style.alignItems = "center";
    dc.style.flexDirection = "column";

    const header = createElement(dc, 'div', [])
    createElement(header, 'h2', [], title)

    const main = createElement(dc, 'pre', [])
    const h = highLight(content, [[/"[^"]+":/g, 'blue'], [/…[0-9]+ more (chars|items)…/g, 'red']])
    // main.appendChild(h)
    main.style.flexGrow = "1";   // 让 textarea 占满剩余空间
    main.style.width = "100%";   // 宽度100%

    const closeButton = createElement(dc, 'button', ['btn', 'btn-primary'], 'Close')
    closeButton.onclick = () => {
        dialog.close()
        dialog.remove()
    }
    dialog.showModal()
    return dialog
}

export async function MultiSelect(title: string, data: string[], selected: string[]) : Promise<string[]> {
    const dialog = createElement(document.body, 'dialog', [])
    dialog.style.width = "80vw";  
    dialog.style.height = "80vh"; 

    const dc = createElement(dialog, 'div', [])
    dc.style.width = "100%";   // 宽度100%
    dc.style.height = "100%";  // 高度100%
    dc.style.display = "flex";
    dc.style.alignItems = "center";
    dc.style.flexDirection = "column";

    const header = createElement(dc, 'div', [])
    createElement(header, 'h2', [], title)

    
    // filter text
    const filter = createElement(dc, 'input', ['form-control'], '')
    filter.placeholder = "Filter"
    
    createElement(dc, 'hr', ['w-100'])

    const main = createElement(dc, 'div', ['d-flex'])
    main.style.overflowY = "auto"
    // main.style.flexGrow = "1";
    main.style.flexDirection = "row"
    main.style.flexWrap = "wrap"
    const normalBackgroundColor = 'rgb(244, 244, 244)'
    const selectedBackgroundColor = 'rgba(0, 123, 255, 0.5)'
    for (const item of data) {
        const span = createElement(main, 'span', ['multi-select', 'rounded-1', 'p-1', 'm-1'], item)
        span.style.cursor = "pointer"
        span.style.backgroundColor = normalBackgroundColor

        if (selected.includes(item)) {
            span.classList.add('selected')
            span.style.backgroundColor = selectedBackgroundColor
        }

        span.onclick = () => {
            span.classList.toggle('selected')
            span.style.backgroundColor = span.classList.contains('selected') ? selectedBackgroundColor : normalBackgroundColor
        }
    }

    filter.oninput = () => {
        const v = filter.value.toLowerCase()
        for (const item of main.children) {
            if (item.textContent?.toLowerCase().includes(v)) {
                item.classList.remove('d-none')
            } else {
                item.classList.add('d-none')
            }
        }
    }

    const spacer = createElement(dc, 'div', ['flex-grow-1'])
    createElement(dc, 'hr', ['w-100'])
    const footer = createElement(dc, 'div', ['d-flex', 'justify-content-center'])

    let resolver: ((value: string[]) => void)
    const promise = new Promise<string[]>((resolve, reject) => {
        resolver = resolve
    })
    
    const okButton = createElement(footer, 'button', ['btn', 'btn-primary'], 'OK')
    okButton.onclick = () => {
        const selected = [] as string[]
        for (const item of main.children) {
            if (item.classList.contains('selected')) {
                selected.push(item.textContent || '')
            }
        }
        dialog.close()
        dialog.remove()
        resolver(selected)
    }

    dialog.showModal()

    return promise
}

export type TablePresentation = {
    initialColumns: string[]
    includeProperties: string[]
    excludeProperties: string[]
    columnFormaters: Record<string, (value: any) => string | HTMLElement>
    onRowClick: (item: any) => void
}

export function createTableFromArray(arr: any[], presentation: Partial<TablePresentation> = {}) {
    const properties = dataProperties(arr)
    let columns = presentation.initialColumns || properties

    const view = createElement(null, 'div')
    const toolbar = createElement(view, 'div', ['d-flex', 'justify-content-between', 'align-items-center'])
    const fieldSelect = createElement(toolbar, 'button', ['btn', 'btn-primary'], 'Select Fields')

    const table = document.createElement('table')
    table.classList.add('table', 'table-striped', 'table-bordered', 'table-hover')
    const thead = document.createElement('thead')
    const tbody = document.createElement('tbody')
    table.appendChild(thead)
    table.appendChild(tbody)
    const cells: Record<string, HTMLTableCellElement[]> = {}
    
    const tr = document.createElement('tr')
    for (const prop of properties) {
        const th = document.createElement('th')
        th.textContent = prop
        tr.appendChild(th)
        cells[prop] = [th]
    }
    thead.appendChild(tr)

    const defaultColumnFormater = (value: any) => {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2)
        } else {
            return value || ''
        }
    }

    for (const item of arr) {
        const tr = document.createElement('tr')
        for (const prop of properties) {
            const td = document.createElement('td')
            const v = item[prop]
            const formater = presentation.columnFormaters?.[prop] || defaultColumnFormater
            const formattedValue = formater(v)
            if (typeof formattedValue === 'string') {
                td.textContent = formattedValue
            }
            else if (formattedValue instanceof HTMLElement) {
                td.appendChild(formattedValue)
            }
            
            cells[prop].push(td)
            tr.appendChild(td)
        }

        if (presentation.onRowClick) {
            tr.onclick = () => {
                presentation.onRowClick!(item)
            }
            tr.style.cursor = 'pointer'
        }

        tbody.appendChild(tr)
    }

    function syncColumns(columns: string[]) {
        for (const prop of properties) {
            const visible = columns.includes(prop)
            for (const cell of cells[prop]) {
                cell.style.display = visible ? '' : 'none'
            }
        }
    }

    fieldSelect.onclick = async () => {
        columns = await MultiSelect('Select Fields', properties, columns)
        syncColumns(columns)
    }

    return view
}
