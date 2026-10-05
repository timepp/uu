import { dataProperties, stringify } from './tu.ts'
import { createElement } from './uu-dom.ts'

export type VisualizeObjectConfig<T extends object> = Record<string, never>

export function visualizeObject(obj: object, _cfg: Partial<VisualizeObjectConfig<any>> = {}): HTMLTableElement {
    const table = createElement(null, 'table', ['uu-object', 'table', 'table-bordered'])
    const tbody = createElement(table, 'tbody', ['uu-object-body'])
    for (const prop of dataProperties([obj])) {
        const row = createElement(tbody, 'tr', ['uu-object-row'])
        createElement(row, 'th', ['uu-object-name'], prop)
        const value = obj[prop as keyof typeof obj] as any
        createElement(row, 'td', ['uu-object-value'], value instanceof Object ? stringify(value) : `${value}`)
    }
    return table
}