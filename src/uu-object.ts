import { dataProperties, stringify } from './tu.ts'
import { createElement } from './uu-dom.ts'

export type VisualizeObjectConfig<T extends object> = Record<string, never>

export function visualizeObject(obj: object, _cfg: Partial<VisualizeObjectConfig<any>> = {}): HTMLTableElement {
    const table = createElement(null, 'table', ['table', 'table-bordered'])
    const tbody = createElement(table, 'tbody')
    for (const prop of dataProperties([obj])) {
        const row = createElement(tbody, 'tr')
        createElement(row, 'th', [], prop)
        const value = obj[prop as keyof typeof obj] as any
        createElement(row, 'td', [], value instanceof Object ? stringify(value) : `${value}`)
    }
    return table
}