import { PropertyFilter } from '../src/uu-propfilter.ts'
import { visualizeArray } from '../src/uu-visualize-array.ts'

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

    function create(key = stateKey, maxInlineValues = 20, initialProperties: string[] = []) {
        host.replaceChildren()
        return new PropertyFilter(host, items, key, {
            maxInlineValues,
            initialProperties,
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

        const initialProperties = ['group', 'unknown']
        filter = create('', 20, initialProperties)
        assert(filter.getState().properties.join(',') === 'group', 'Unkeyed filters use known initial properties')
        assert(initialProperties.join(',') === 'group,unknown', 'Cleaning initial properties does not mutate caller defaults')
        assert(filter.getFilteredItems().length === items.length, 'Initial properties do not preselect values')
        localStorage.removeItem(stateKey)
        filter = create(stateKey, 20, ['group'])
        assert(row('group').textContent?.includes('All (3)') === true, 'First keyed use displays recommended filter properties')
        localStorage.setItem(stateKey, JSON.stringify({ properties: [], filters: {} }))
        filter = create(stateKey, 20, ['group'])
        assert(filter.getState().properties.length === 0, 'Saved empty properties override initial recommendations')
        localStorage.setItem(stateKey, JSON.stringify({ properties: ['kind'], filters: { kind: ['y'] } }))
        filter = create(stateKey, 20, ['group'])
        assert(filter.getState().properties.join(',') === 'kind' && filter.getFilteredItems().length === 1, 'Saved properties and values override initial recommendations')

        host.replaceChildren()
        const sortableFilter = new PropertyFilter(host, [
            { zebra: 'z', beta: 'b', alpha: 'a', alpine: 'a' },
            { zebra: 'y', beta: 'b', alpha: 'b', alpine: 'a' },
            { zebra: 'x', beta: 'b', alpha: 'a', alpine: 'a' },
        ], '', { initialProperties: ['beta', 'zebra'] })
        click(row('beta'), '.uu-pf-name')
        const propertyDialog = document.querySelector<HTMLElement>('.uu-selection')?.closest('dialog')
        if (!propertyDialog) throw new Error('Missing property selection dialog')
        const sortButtons = Array.from(propertyDialog.querySelectorAll<HTMLButtonElement>('.uu-selection-sort-option'))
        const propertyOrder = () => Array.from(propertyDialog.querySelectorAll('.uu-selection-item .uu-selection-value'))
            .map(element => element.textContent).join(',')
        const selectionOrder = () => Array.from(propertyDialog.querySelectorAll('.uu-selection-item.uu-is-selected .uu-selection-value'))
            .map(element => element.textContent).sort().join(',')
        assert(sortButtons.length === 3, 'Property picker offers count and both name sorts')
        assert(sortButtons.every(button => button.querySelector('.uu-icon.fa')
            && button.textContent === '' && button.title === button.getAttribute('aria-label')), 'Sort buttons use labeled Font Awesome icons')
        const selectionToolbar = propertyDialog.querySelector('.uu-selection-toolbar')
        if (!selectionToolbar) throw new Error('Missing selection toolbar')
        assert(Array.from(selectionToolbar.children).map(element => element.classList[0]).join(',')
            === 'uu-selection-filter-group,uu-selection-sort,uu-selection-actions', 'Toolbar separates filter, sorting and selection actions in order')
        const searchInput = propertyDialog.querySelector('.uu-selection-filter')
        if (!searchInput) throw new Error('Missing property filter input')
        const searchBounds = searchInput.getBoundingClientRect()
        assert(sortButtons.every(button => {
            const bounds = button.getBoundingClientRect()
            return bounds.top < searchBounds.bottom && bounds.bottom > searchBounds.top
        }), 'Sort buttons share the filter row')
        const statusBar = propertyDialog.querySelector<HTMLElement>('.uu-selection-status')
        const selectedArea = propertyDialog.querySelector<HTMLElement>('.uu-selection-selected')
        const selectedLabel = propertyDialog.querySelector('.uu-selection-status-label')
        const optionsArea = propertyDialog.querySelector('.uu-selection-items')
        if (!statusBar || !selectedArea || !selectedLabel || !optionsArea) throw new Error('Missing property selection layout')
        assert(getComputedStyle(statusBar).backgroundColor === 'rgb(255, 255, 224)', 'Selected-properties area has a pale yellow background')
        assert(Array.from(propertyDialog.querySelectorAll('.uu-selection-item')).every(element =>
            element.tagName === 'BUTTON'
            && element.classList.contains('btn-primary') === element.classList.contains('uu-is-selected')
            && element.classList.contains('btn-outline-secondary') !== element.classList.contains('uu-is-selected')
            && element.getAttribute('aria-pressed') === `${element.classList.contains('uu-is-selected')}`), 'Options use the Sort dialog button styles for selected and unselected states')
        assert(statusBar.getBoundingClientRect().top >= optionsArea.getBoundingClientRect().bottom, 'Selected properties appear below all options')
        const labelBounds = selectedLabel.getBoundingClientRect()
        const selectedBounds = selectedArea.getBoundingClientRect()
        assert(labelBounds.top < selectedBounds.bottom && labelBounds.bottom > selectedBounds.top
            && labelBounds.right <= selectedBounds.left, 'Selected label and chips share a row')
        const dragSelected = (index: number, toEnd: boolean, below: boolean) => {
            const chips = selectedArea.querySelectorAll<HTMLElement>('.uu-dnd-item')
            const chip = chips[index]
            assert(getComputedStyle(chip).cursor === 'pointer', 'Draggable selected properties use pointer cursors')
            const bounds = (toEnd ? chips[chips.length - 1] : chips[0]).getBoundingClientRect()
            const areaBounds = selectedArea.getBoundingClientRect()
            const position = {
                clientX: toEnd ? bounds.right + 20 : bounds.left - 20,
                clientY: below ? areaBounds.bottom + 300 : areaBounds.top - 300,
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer(),
            }
            chip.dispatchEvent(new DragEvent('dragstart', position))
            const dragOver = new DragEvent('dragover', position)
            document.dispatchEvent(dragOver)
            assert(dragOver.defaultPrevented && !!selectedArea.querySelector('.uu-is-drop-target'), 'Dragging outside the selected row still accepts a drop')
            document.dispatchEvent(new DragEvent('drop', position))
            chip.dispatchEvent(new DragEvent('dragend', position))
        }
        dragSelected(0, true, true)
        assert(selectedArea.textContent?.includes('1: zebra') === true, 'Dragging far below the row reorders selected properties')
        dragSelected(1, false, false)
        assert(selectedArea.textContent?.includes('1: beta') === true, 'Dragging far above the row reorders selected properties')
        assert(!selectedArea.querySelector('.uu-is-drop-target'), 'Ending a drag clears drop hints')
        assert(propertyOrder() === 'zebra,alpha,alpine,beta', 'Properties default to distinct-value count descending with name tie-breaking')
        assert(sortButtons[0].classList.contains('uu-is-active'), 'Count sort is initially active')
        sortButtons[1].click()
        assert(propertyOrder() === 'alpha,alpine,beta,zebra', 'Property names sort ascending')
        sortButtons[2].click()
        assert(propertyOrder() === 'zebra,beta,alpine,alpha', 'Property names sort descending')
        assert(sortButtons[2].classList.contains('active') && !sortButtons[1].classList.contains('active'), 'Only the current sort is active')
        assert(selectionOrder() === 'beta,zebra', 'Sorting preserves selected properties')
        const propertySearch = propertyDialog.querySelector<HTMLInputElement>('.uu-selection-filter')
        if (!propertySearch) throw new Error('Missing property search')
        propertySearch.value = 'al'
        propertySearch.dispatchEvent(new Event('input'))
        sortButtons[0].click()
        assert(Array.from(propertyDialog.querySelectorAll<HTMLElement>('.uu-selection-item'))
            .filter(element => getComputedStyle(element).display !== 'none')
            .map(element => element.querySelector('.uu-selection-value')?.textContent).join(',') === 'alpha,alpine', 'Sorting preserves the active search')
        const alphaOption = Array.from(propertyDialog.querySelectorAll<HTMLElement>('.uu-selection-item'))
            .find(element => element.querySelector('.uu-selection-value')?.textContent === 'alpha')
        if (!alphaOption) throw new Error('Missing alpha property')
        alphaOption.click()
        assert(alphaOption.classList.contains('btn-primary') && !alphaOption.classList.contains('btn-outline-secondary'), 'Selecting an option applies the Sort dialog selected style')
        alphaOption.click()
        assert(!alphaOption.classList.contains('btn-primary') && alphaOption.classList.contains('btn-outline-secondary'), 'Deselecting an option restores the Sort dialog outline style')
        alphaOption.click()
        const propertyAction = (name: string) => {
            const button = Array.from(propertyDialog.querySelectorAll<HTMLElement>('.uu-dialog-action'))
                .find(element => element.textContent === name)
            if (!button) throw new Error(`Missing property dialog action: ${name}`)
            button.click()
        }
        propertyAction('OK')
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        assert(sortableFilter.getState().properties.join(',') === 'beta,zebra,alpha', 'Confirm preserves selection order independently of display sorting')
        click(row('beta'), '.uu-pf-name')
        const cancelDialog = document.querySelector('.uu-selection')?.closest('dialog')
        if (!cancelDialog) throw new Error('Missing reopened property dialog')
        click(cancelDialog, '.uu-selection-sort-option:last-child')
        click(cancelDialog, '.uu-selection-none')
        const cancelButton = Array.from(cancelDialog.querySelectorAll<HTMLElement>('.uu-dialog-action'))
            .find(element => element.textContent === 'Cancel')
        if (!cancelButton) throw new Error('Missing Cancel button')
        cancelButton.click()
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        assert(sortableFilter.getState().properties.join(',') === 'beta,zebra,alpha', 'Cancel discards edits after sorting')

        const nestedItems: { id: string, user: { city: string, tags: string[], extra?: string } | null, 'user.city': string }[] = [
            { id: 'a', user: { city: 'x', tags: ['red', 'blue'] }, 'user.city': 'literal-a' },
            { id: 'b', user: { city: 'y', tags: ['blue'] }, 'user.city': 'literal-b' },
            { id: 'c', user: null, 'user.city': 'literal-c' },
        ]
        host.replaceChildren()
        let nestedFilter = new PropertyFilter(host, nestedItems, '', {
            flattenNestedObjects: true,
            initialProperties: ['user.city', 'user.tags', '["user.city"]'],
        })
        assert(row('user.city').textContent?.includes('x (1)') === true, 'Nested paths expose leaf values')
        choose(row('user.city'), 'x')
        assert(nestedFilter.getFilteredItems()[0] === nestedItems[0], 'Nested filtering returns original objects')
        assert(nestedFilter.getFilteredItems().length === 1, 'Missing nested values do not match')
        choose(row('user.city'), 'All')
        choose(row('user.tags'), 'blue')
        assert(nestedFilter.getFilteredItems().length === 2, 'Nested arrays remain multi-value properties')
        nestedFilter.reset()
        choose(row('["user.city"]'), 'literal-b')
        assert(nestedFilter.getFilteredItems()[0] === nestedItems[1], 'Literal dotted keys differ from nested paths')
        nestedFilter.setItems([])
        assert(nestedFilter.getState().filters['["user.city"]'].join(',') === 'literal-b', 'Empty subsets retain selected paths')
        nestedFilter.setItems(nestedItems)
        assert(nestedFilter.getFilteredItems()[0] === nestedItems[1], 'Selections survive text-filter subset changes')
        nestedFilter.setItems([{ id: 'd', user: { city: 'z', tags: [] }, 'user.city': 'literal-d' }])
        nestedFilter.reset()
        assert(row('user.city').textContent?.includes('z (1)') === true, 'Updated items discover nested values')
        nestedFilter.setItems([{ id: 'e', user: { city: 'z', tags: [], extra: 'new' }, 'user.city': 'literal-e' }])
        nestedFilter.getState().properties.push('user.extra')
        nestedFilter.render()
        assert(row('user.extra').textContent?.includes('new (1)') === true, 'Updated items discover new nested paths')

        host.replaceChildren()
        nestedFilter = new PropertyFilter(host, nestedItems, '', {
            flattenNestedObjects: true,
            initialProperties: ['user.city', 'virtual'],
            valueGetters: {
                'user.city': item => item.id,
                virtual: item => item.user?.tags,
            },
        })
        choose(row('user.city'), 'b')
        assert(nestedFilter.getFilteredItems()[0] === nestedItems[1], 'Custom getters override nested lookup')
        choose(row('user.city'), 'All')
        choose(row('virtual'), 'red')
        assert(nestedFilter.getFilteredItems()[0] === nestedItems[0], 'Getter keys register virtual multi-value properties')

        host.replaceChildren()
        const topLevelFilter = new PropertyFilter(host, nestedItems, '', { initialProperties: ['user.city'] })
        choose(row('user.city'), 'literal-a')
        assert(topLevelFilter.getFilteredItems()[0] === nestedItems[0], 'Default filters still treat dotted keys literally')
        host.replaceChildren()
        const virtualFilter = new PropertyFilter(host, nestedItems, '', {
            initialProperties: ['virtual'],
            valueGetters: { virtual: item => item.id },
        })
        choose(row('virtual'), 'c')
        assert(virtualFilter.getFilteredItems()[0] === nestedItems[2], 'Virtual properties also work without flattening')

        function nestedView() {
            host.replaceChildren()
            const view = visualizeArray(nestedItems, {
                stateKey,
                flattenNestedObjects: true,
                initialFilterProps: ['user.city'],
                renderStyles: ['table'],
                renderOption: { props: ['id'] },
            })
            host.appendChild(view)
            return view
        }
        localStorage.removeItem(stateKey)
        localStorage.removeItem(`${stateKey}:property-filter`)
        let view = nestedView()
        choose(row('user.city'), 'y')
        assert(view.querySelectorAll('.uu-va-table-row').length === 1, 'Array views wire nested property filters')
        assert(view.querySelector('.uu-va-table-cell')?.textContent === 'b', 'Hidden nested columns can still filter')
        view = nestedView()
        assert(view.querySelectorAll('.uu-va-table-row').length === 1, 'Nested filters restore in recreated array views')
        assert(view.querySelector('.uu-va-table-cell')?.textContent === 'b', 'Restored nested selections retain their values')
        return { passed: checks }
    } finally {
        host.remove()
        localStorage.removeItem(stateKey)
        localStorage.removeItem(`${stateKey}:property-filter`)
        const dialog = document.querySelector('.uu-pf-dialog')
        const closeButton = dialog?.closest('.uu-dialog')?.querySelector<HTMLElement>('.uu-dialog-action')
        closeButton?.click()
    }
}
