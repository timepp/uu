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
    const specialItems = [
        { id: 'a', nested: { value: 2 }, 'nested.value': 1 },
        { id: 'b', nested: { value: 1 }, 'nested.value': 2 },
    ]
    function specialView(prop: string) {
        return visualizeArray(specialItems, {
            flattenNestedObjects: true,
            renderStyles: ['table'],
            renderOption: { props: ['id', 'nested.value', '["nested.value"]'] },
            sortBy: [{ prop, order: 'asc' }],
        })
    }
    const nestedView = specialView('nested.value')
    assertOrder(nestedView, 'b,a', 'nested and literal dotted keys sort independently')
    const cells = Array.from(nestedView.querySelector('.uu-va-table-row')?.querySelectorAll('.uu-va-table-cell') || [])
    if (cells.slice(0, 3).map(cell => cell.textContent).join(',') !== 'b,1,2') {
        throw new Error('Nested and literal dotted keys must display distinct values')
    }
    checks++
    assertOrder(specialView('["nested.value"]'), 'a,b', 'quoted literal paths sort by their own values')
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

    const objectItems = [
        { id: 'c', value: { toString: 'serialized function', rank: 3 } },
        { id: 'a', value: { toString: 'serialized function', rank: 1 } },
        { id: 'b', value: { toString: 'serialized function', rank: 2 } },
    ]
    const stateKey = `uu-object-sort-test:${crypto.randomUUID()}`
    function createObjectView() {
        return visualizeArray(objectItems, {
            stateKey,
            renderStyles: ['table'],
            renderOption: { props: ['id', 'value'] },
        })
    }
    function valueHeader(view: HTMLElement) {
        const header = Array.from(view.querySelectorAll<HTMLElement>('.uu-va-table-head-cell'))
            .find(cell => cell.querySelector('.uu-va-sort-label')?.textContent === 'value')
        if (!header) throw new Error('Missing value header')
        return header
    }
    function assertIndicator(view: HTMLElement, expected: string, name: string) {
        const actual = valueHeader(view).querySelector('.uu-va-sort-order')?.textContent || ''
        if (actual !== expected) throw new Error(`${name}: unexpected sort indicator ${actual}`)
        checks++
    }
    try {
        const objectView = createObjectView()
        valueHeader(objectView).click()
        assertOrder(objectView, 'a,b,c', 'Objects with non-callable toString sort by serialized contents')
        assertIndicator(objectView, '\u2b06\ufe0f', 'Object sorting updates the ascending indicator')
        const restored = createObjectView()
        assertOrder(restored, 'a,b,c', 'Saved object sorting restores without throwing')
        assertIndicator(restored, '\u2b06\ufe0f', 'Saved object sorting restores the indicator')
        valueHeader(objectView).click()
        assertOrder(objectView, 'c,b,a', 'Object sorting supports descending header clicks')
        assertIndicator(objectView, '\u2b07\ufe0f', 'Object sorting updates the descending indicator')
        valueHeader(objectView).click()
        assertOrder(objectView, 'c,a,b', 'Clearing object sorting restores original order')
        assertIndicator(objectView, '', 'Clearing object sorting removes the indicator')
        assertOrder(visualizeArray([
            { id: 'b', value: Object.setPrototypeOf({ rank: 2 }, null) },
            { id: 'a', value: Object.setPrototypeOf({ rank: 1 }, null) },
        ], {
            renderStyles: ['table'],
            renderOption: { props: ['id', 'value'] },
            sortBy: [{ prop: 'value', order: 'asc' }],
        }), 'a,b', 'Objects without a prototype sort without primitive coercion')
    } finally {
        localStorage.removeItem(stateKey)
    }
    return { passed: checks }
}
