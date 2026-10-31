import { visualizeArray, type VisualizeConfig } from '../src/uu-visualize-array.ts'

export async function runStateTests() {
    const stateKey = `uu-state-test:${crypto.randomUUID()}`
    const items = Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        group: index % 2 ? 'odd' : 'even',
    }))
    type Item = typeof items[number]
    const host = document.createElement('div')
    document.body.appendChild(host)
    let checks = 0

    function assert(condition: boolean, name: string) {
        if (!condition) throw new Error(name)
        checks++
    }

    function element<E extends HTMLElement = HTMLElement>(root: ParentNode, selector: string) {
        const result = root.querySelector<E>(selector)
        if (!result) throw new Error(`Missing test element: ${selector}`)
        return result
    }

    function create(data = items, config: Partial<VisualizeConfig<Item>> = {}) {
        const view = visualizeArray(data, {
            stateKey,
            pageSize: 3,
            renderStyles: ['table'],
            renderOption: { props: ['id', 'group'] },
            ...config,
        })
        host.replaceChildren(view)
        return view
    }

    function firstId(view: HTMLElement) {
        return view.querySelector('.uu-va-table-row .uu-va-table-cell')?.textContent
    }

    const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

    async function setSize(view: HTMLElement, size: string, menu = false) {
        if (menu) {
            element(view, '.uu-va-options').click()
            await tick()
            const action = Array.from(document.querySelectorAll<HTMLElement>('.uu-dropdown-item'))
                .find(item => item.textContent === 'Change Page Size')
            if (!action) throw new Error('Missing page size action')
            action.click()
        } else {
            element(view, '.uu-pager-size').click()
        }
        const input = element<HTMLInputElement>(document, '.uu-prompt-input')
        input.value = size
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        await tick()
    }

    try {
        let view = create()
        element(view, '.uu-pager-next').click()
        element(view, '.uu-pager-next').click()
        view = create()
        assert(firstId(view) === '7', 'Recreation restores the current page')
        assert(element(view, '.uu-pager-status').textContent === '3 / 4', 'Pager matches restored rows')

        view = create(items.slice(0, 4))
        assert(firstId(view) === '4', 'Shrinking data clamps to the last page')
        view = create()
        assert(firstId(view) === '4', 'Clamped page is persisted')

        element(view, '.uu-va-filter-toggle').click()
        view = create()
        assert(element(view, '.uu-va-pf').style.display !== 'none', 'Expanded filter panel is restored')
        assert(element(view, '.uu-va-pf').classList.contains('uu-is-active'), 'Expanded panel class is restored')
        element(view, '.uu-va-filter-toggle').click()
        view = create()
        assert(element(view, '.uu-va-pf').style.display === 'none', 'Collapsed filter panel is restored')

        await setSize(view, '2')
        view = create()
        assert(view.querySelectorAll('.uu-va-table-row').length === 2, 'Pager page size is persisted')
        assert(element(view, '.uu-pager-status').textContent === '1 / 6', 'Page size change resets the page')
        await setSize(view, '0')
        view = create()
        assert(view.querySelectorAll('.uu-va-table-row').length === 12, 'Disabled paging overrides configured page size')
        assert(JSON.parse(localStorage.getItem(stateKey) || '{}').pageSize === 0, 'Disabled paging uses a serializable sentinel')

        await setSize(view, '4', true)
        view = create()
        assert(view.querySelectorAll('.uu-va-table-row').length === 4, 'Menu page size is persisted')
        await setSize(view, '-1', true)
        view = create()
        assert(view.querySelectorAll('.uu-va-table-row').length === 12, 'Menu can persist disabled paging')

        await setSize(view, '3')
        element(view, '.uu-pager-next').click()
        element(view, '.uu-va-table-head-cell').click()
        assert(element(view, '.uu-pager-status').textContent === '1 / 4', 'Header sorting resets pager state')
        view = create()
        assert(firstId(view) === '1', 'Sorting reset persists')

        element(view, '.uu-pager-next').click()
        const filter = element<HTMLInputElement>(view, '.uu-va-filter')
        filter.value = 'id > 6'
        filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        assert(firstId(view) === '7', 'Text filtering resets to the first result page')
        element(view, '.uu-pager-next').click()
        view = create()
        assert(firstId(view) === '10', 'Page restoration happens after text filtering')
        assert(element(view, '.uu-pager-status').textContent === '2 / 2', 'Filtered pager is restored')

        const saved = localStorage.getItem(stateKey)
        create([])
        assert(localStorage.getItem(stateKey) === saved, 'Empty input leaves saved state untouched')

        localStorage.setItem(stateKey, JSON.stringify({ pageSize: 3, currentPage: 1 }))
        localStorage.setItem(`${stateKey}:property-filter`, JSON.stringify({
            properties: ['group'],
            filters: { group: ['odd'] },
        }))
        view = create()
        assert(firstId(view) === '8', 'Page restoration happens after property filtering')
        element(view, '.uu-pf-value').click()
        assert(element(view, '.uu-pager-status').textContent === '1 / 4', 'Property filter changes reset the page')

        localStorage.setItem(stateKey, JSON.stringify({ pageSize: 2 }))
        view = create()
        assert(view.querySelectorAll('.uu-va-table-row').length === 2, 'Legacy state restores without new fields')
        assert(firstId(view) === '1', 'Legacy state defaults to the first page')
        assert(element(view, '.uu-va-pf').style.display === 'none', 'Legacy state defaults to a collapsed panel')

        view = create(items, { stateKey: '' })
        element(view, '.uu-pager-next').click()
        element(view, '.uu-va-filter-toggle').click()
        view = create(items, { stateKey: '' })
        assert(firstId(view) === '1', 'Unkeyed views do not restore the page')
        assert(element(view, '.uu-va-pf').style.display === 'none', 'Unkeyed views do not restore panel state')
        return { passed: checks }
    } finally {
        host.remove()
        localStorage.removeItem(stateKey)
        localStorage.removeItem(`${stateKey}:property-filter`)
    }
}
