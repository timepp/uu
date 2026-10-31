import { PropertyFilter } from '../src/uu-propfilter.ts'

export async function runPropertyFilterTests() {
    const stateKey = `uu-propfilter-test:${crypto.randomUUID()}`
    const items = [
        { group: 'a', kind: 'x' },
        { group: 'b', kind: 'x' },
        { group: 'c', kind: 'y' },
    ]
    const host = document.createElement('div')
    document.body.appendChild(host)
    let checks = 0
    let changes = 0

    function assert(condition: boolean, name: string) {
        if (!condition) throw new Error(name)
        checks++
    }

    function create(key = stateKey, maxInlineValues = 20) {
        host.replaceChildren()
        return new PropertyFilter(host, items, key, {
            maxInlineValues,
            onChange: () => { changes++ },
        })
    }

    function row(property: string) {
        const result = Array.from(host.querySelectorAll<HTMLElement>('.uu-pf-row'))
            .find(row => row.querySelector('.uu-pf-name')?.textContent === property)
        if (!result) throw new Error(`Missing row: ${property}`)
        return result
    }

    function click(root: ParentNode, selector: string) {
        const button = root.querySelector<HTMLElement>(selector)
        if (!button) throw new Error(`Missing button: ${selector}`)
        button.click()
    }

    function choose(root: ParentNode, value: string, ctrlKey = false) {
        const button = Array.from(root.querySelectorAll<HTMLElement>('.uu-pf-value'))
            .find(button => button.textContent?.startsWith(`${value} (`))
        if (!button) throw new Error(`Missing value: ${value}`)
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey }))
    }

    function selected(filter: PropertyFilter<typeof items[number]>, property = 'group') {
        return (filter.getState().filters[property] || []).join(',')
    }

    try {
        localStorage.setItem(stateKey, JSON.stringify({ properties: ['group', 'kind'], filters: {} }))
        let filter = create()
        assert(!host.querySelector('.uu-pf-mode'), 'No mode toggle is rendered')
        assert(row('group').querySelector('.uu-pf-values')?.firstElementChild?.textContent === 'All (3)', 'All remains the first control')
        const previousChanges = changes
        choose(row('group'), 'b')
        choose(row('group'), 'a')
        assert(changes === previousChanges + 2, 'Value clicks emit onChange')
        assert(selected(filter) === 'a', 'Plain clicks replace the previous value')
        assert(filter.getFilteredItems().map(item => item.group).join(',') === 'a', 'Single selection updates filtered results')
        choose(row('group'), 'a')
        assert(selected(filter) === '', 'Clicking the selected value clears it')
        choose(row('group'), 'b', true)
        choose(row('group'), 'a', true)
        assert(selected(filter) === 'b,a', 'Ctrl-click accumulates selected values')
        assert(filter.getFilteredItems().length === 2, 'Multiple selection matches either value')
        filter = create()
        assert(selected(filter) === 'b,a', 'Multiple selected values are restored')
        choose(row('group'), 'b', true)
        assert(selected(filter) === 'a', 'Ctrl-click removes a selected value')
        choose(row('group'), 'c', true)
        choose(row('group'), 'a')
        assert(selected(filter) === 'a', 'Plain click on one of multiple selected values selects only that value')
        choose(row('group'), 'b', true)
        choose(row('group'), 'c')
        assert(selected(filter) === 'c', 'Plain click on an unselected value replaces multiple selections')
        choose(row('group'), 'All', true)
        assert(selected(filter) === '', 'All clears selections even with Ctrl')
        choose(row('kind'), 'x')
        choose(row('kind'), 'y', true)
        assert(selected(filter, 'kind') === 'x,y', 'Other rows support Ctrl multi-selection independently')
        choose(row('group'), 'b')
        assert(selected(filter, 'kind') === 'x,y', 'Selecting a value leaves other rows unchanged')
        filter = create()
        assert(selected(filter) === 'b', 'Single selected value is restored')
        choose(row('group'), 'All')
        assert(selected(filter) === '', 'All clears selection')
        filter.reset()
        assert(filter.getSummary().length === 0, 'Reset clears every row')
        filter = create(stateKey, 1)
        click(row('group'), '.uu-pf-more')
        const dialog = document.querySelector<HTMLElement>('.uu-pf-dialog-values')
        if (!dialog) throw new Error('Missing expanded values dialog')
        assert(!dialog.querySelector('.uu-pf-mode'), 'Dialog has no mode toggle')
        choose(dialog, 'b')
        choose(dialog, 'c')
        assert(selected(filter) === 'b,c', 'Dialog retains direct-click multi-selection')
        choose(dialog, 'b')
        assert(selected(filter) === 'c', 'Dialog plain click removes a selected value')
        choose(dialog, 'a')
        assert(selected(filter) === 'c,a', 'Dialog adds values without Ctrl')
        assert(row('group').querySelectorAll('.uu-pf-value.uu-is-selected').length === 2, 'Dialog changes update inline selections')
        choose(dialog, 'c', true)
        assert(selected(filter) === 'a', 'Dialog Ctrl-click removes a selected value')
        choose(dialog, 'All')
        assert(selected(filter) === '', 'Dialog All clears selection')
        choose(dialog, 'b', true)
        choose(dialog, 'a', true)
        filter = create()
        assert(selected(filter) === 'b,a', 'Dialog selections are persisted')

        localStorage.setItem(stateKey, JSON.stringify({ properties: ['group'], filters: {}, singleSelect: { removed: true } }))
        filter = create()
        assert(!('singleSelect' in filter.getState()), 'Obsolete mode state is ignored')
        choose(row('group'), 'a')
        assert(!('singleSelect' in JSON.parse(localStorage.getItem(stateKey) || '{}')), 'Saving drops obsolete mode state')
        filter = create('')
        filter.getState().properties.push('group')
        filter.render()
        choose(row('group'), 'b')
        choose(row('group'), 'a', true)
        assert(selected(filter) === 'b,a', 'Unkeyed filters support Ctrl multi-selection')
        filter = create('')
        assert(selected(filter) === '', 'Unkeyed filters do not restore selections')
        return { passed: checks }
    } finally {
        host.remove()
        localStorage.removeItem(stateKey)
        const dialog = document.querySelector('.uu-pf-dialog')
        const closeButton = dialog?.closest('.uu-dialog')?.querySelector<HTMLElement>('.uu-dialog-action')
        closeButton?.click()
    }
}
