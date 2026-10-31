import { visualizeArray, type VisualizeConfig } from '../src/uu-visualize-array.ts'

export function runSortingTests() {
    const items = [
        { id: 'a', status: 'completed', score: 10, nested: { value: 10 } },
        { id: 'b', status: 'running', score: 2, nested: { value: 2 } },
        { id: 'c', status: 'pending', score: 0, nested: { value: 0 } },
    ]
    type Item = typeof items[number]
    const statusOrder: Record<string, number> = { pending: 0, running: 2, completed: 10 }
    let checks = 0

    function create(config: Partial<VisualizeConfig<Item>> = {}) {
        return visualizeArray(items, {
            renderStyles: ['table'],
            renderOption: { props: ['id', 'status', 'score'] },
            ...config,
        })
    }

    function assertOrder(view: HTMLElement, expected: string, name: string) {
        const actual = Array.from(view.querySelectorAll('.uu-va-table-row'))
            .map(row => row.querySelector('.uu-va-table-cell')?.textContent)
            .join(',')
        if (actual !== expected) {
            throw new Error(`${name}: expected ${expected}, got ${actual}`)
        }
        checks++
    }

    const view = create({
        sortBy: [{ prop: 'status', order: 'asc' }],
        getSortingValue: (item, prop, dataIndex) => {
            if (items[dataIndex] !== item) throw new Error('dataIndex must be the original index')
            return prop === 'status' ? statusOrder[item.status] : undefined
        },
    })
    assertOrder(view, 'c,b,a', 'custom numeric keys including zero')
    const statusHeader = () => {
        const header = Array.from(view.querySelectorAll<HTMLElement>('.uu-va-table-head-cell'))
            .find(cell => cell.querySelector('.uu-va-sort-label')?.textContent === 'status')
        if (!header) throw new Error('Missing status header')
        return header
    }
    statusHeader().click()
    assertOrder(view, 'a,b,c', 'header descending')
    statusHeader().click()
    assertOrder(view, 'a,b,c', 'header clearing restores original order')
    statusHeader().click()
    assertOrder(view, 'c,b,a', 'header ascending')
    if (!view.querySelector('.uu-va-table-row')?.textContent?.includes('pending')) {
        throw new Error('Custom keys must not change displayed values')
    }
    checks++

    assertOrder(create({
        sortBy: [{ prop: 'score', order: 'asc' }],
    }), 'c,b,a', 'default numeric sorting')
    assertOrder(create({
        sortBy: [{ prop: 'score', order: 'asc' }],
        getSortingValue: () => undefined,
    }), 'c,b,a', 'undefined falls back to property value')
    assertOrder(create({
        sortBy: [{ prop: 'status', order: 'asc' }],
        getSortingValue: item => item.id === 'c' ? '' : item.id,
    }), 'c,a,b', 'custom string keys including empty string')
    assertOrder(create({
        sortBy: [{ prop: 'status', order: 'asc' }, { prop: 'score', order: 'desc' }],
        getSortingValue: (_item, prop) => prop === 'status' ? 0 : undefined,
    }), 'a,b,c', 'multi-column sorting with fallback')
    assertOrder(create({
        flattenNestedObjects: true,
        sortBy: [{ prop: 'nested.value', order: 'asc' }],
        getSortingValue: () => undefined,
    }), 'c,b,a', 'nested property fallback')
    assertOrder(create({
        sortBy: [{ prop: '#', order: 'desc' }],
        getSortingValue: () => undefined,
    }), 'c,b,a', 'raw index fallback')
    assertOrder(create({
        filter: 'score > 0',
        sortBy: [{ prop: 'status', order: 'asc' }],
        getSortingValue: (item, prop, dataIndex) => {
            if (items[dataIndex] !== item) throw new Error('Filtered index must remain original')
            return prop === 'status' ? statusOrder[item.status] : undefined
        },
    }), 'b,a', 'original indexes after filtering')
    assertOrder(create({
        getSortingValue: () => { throw new Error('Unsorted views must not request sort keys') },
    }), 'a,b,c', 'no sorting')
    if (items.map(item => item.id).join(',') !== 'a,b,c') {
        throw new Error('Sorting must not reorder the original array')
    }
    checks++
    return { passed: checks }
}
