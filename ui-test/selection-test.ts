import { visualizeArray, type VisualizeConfig } from '../src/uu-visualize-array.ts'

export async function runSelectionTests() {
    const items = [
        { id: 'a', group: 'x' },
        { id: 'b', group: 'y' },
        { id: 'c', group: 'x' },
        { id: 'd', group: 'y' },
    ]
    type Item = typeof items[number]
    const host = document.createElement('div')
    document.body.appendChild(host)
    let checks = 0
    let callbackCount = 0
    let actionResult = ''
    const comparisonState = new Map<string, string | null>(
        ['uu-comparison-result-table', 'uu-comparison-result-table:property-filter']
            .map(key => [key, localStorage.getItem(key)])
    )
    const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

    function assert(condition: boolean, name: string) {
        if (!condition) throw new Error(name)
        checks++
    }

    function element<E extends HTMLElement = HTMLElement>(root: ParentNode, selector: string) {
        const result = root.querySelector<E>(selector)
        if (!result) throw new Error(`Missing test element: ${selector}`)
        return result
    }

    function create(config: Partial<VisualizeConfig<Item>> = {}) {
        const view = visualizeArray(items, {
            renderStyles: ['table'],
            renderOption: { props: ['id', 'group'] },
            itemActions: (item, index) => ({
                [`Inspect ${item.id}`]: () => { actionResult = `${item.id}:${index}` },
            }),
            multiItemActions: {
                Batch: selected => { actionResult = selected.map(item => item.id).join(',') },
            },
            ...config,
        })
        host.replaceChildren(view)
        return view
    }

    function rows(view: HTMLElement) {
        return Array.from(view.querySelectorAll<HTMLElement>('.uu-va-selectable'))
    }

    function checkbox(row: HTMLElement) {
        return element<HTMLInputElement>(row, '.uu-va-select-checkbox')
    }

    function selected(view: HTMLElement) {
        return rows(view).map((row, index) => row.getAttribute('aria-selected') === 'true' ? index : -1)
            .filter(index => index >= 0).join(',')
    }

    async function menu(view: HTMLElement) {
        element(view, '.uu-va-options').click()
        await tick()
        return element(document, '.uu-dropdown')
    }

    async function action(view: HTMLElement, name: string) {
        const dropdown = await menu(view)
        const entry = Array.from(dropdown.querySelectorAll<HTMLElement>('.uu-dropdown-item'))
            .find(item => item.textContent === name)
        if (!entry) throw new Error(`Missing menu action: ${name}`)
        entry.click()
        await tick()
    }

    try {
        for (const style of ['table', 'tile', 'wall'] as const) {
            const view = create({
                renderStyles: [style],
                wallRenderOption: { imageUrl: () => 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' },
            })
            const rendered = rows(view)
            const first = rendered[0]
            assert(rendered.length === 4, `${style}: all items have selection controls`)
            assert(getComputedStyle(first).cursor !== 'pointer', `${style}: selectable items do not use pointer cursors`)
            assert(getComputedStyle(element(first, '.uu-va-value')).cursor !== 'pointer', `${style}: ordinary values do not inherit pointer cursors`)
            assert(getComputedStyle(checkbox(first)).cursor === 'pointer', `${style}: checkboxes use pointer cursors`)
            assert(getComputedStyle(element(first, '.uu-va-action')).cursor === 'pointer', `${style}: item actions use pointer cursors`)
            assert(getComputedStyle(checkbox(first)).opacity === '0', `${style}: unselected checkbox starts hidden`)
            await menu(view)
            first.click()
            assert(!document.querySelector('.uu-dropdown') && selected(view) === '0', `${style}: clicking an item dismisses the menu despite stopped propagation`)
            first.click()
            element(view, '.uu-va-options').click()
            checkbox(first).click()
            assert(!document.querySelector('.uu-dropdown') && checkbox(first).checked, `${style}: checkbox immediately dismisses the menu and still toggles selection`)
            checkbox(first).click()
            await menu(view)
            element(view, '.uu-va-options').click()
            assert(!document.querySelector('.uu-dropdown'), `${style}: clicking the menu trigger again closes it`)
            first.click()
            assert(selected(view) === '0' && checkbox(first).checked, `${style}: plain click selects`)
            assert(getComputedStyle(checkbox(first)).opacity === '1', `${style}: selected checkbox stays visible`)
            first.click()
            assert(selected(view) === '' && !checkbox(first).checked, `${style}: repeated click on sole selection clears it`)
            first.click()
            rendered[1].click()
            assert(selected(view) === '1' && !checkbox(first).checked, `${style}: plain click replaces selection`)
            checkbox(first).click()
            assert(selected(view) === '0,1', `${style}: checkbox extends selection`)
            first.click()
            assert(selected(view) === '0', `${style}: clicking a selected item in multiple selection keeps only that item`)
            checkbox(rendered[1]).click()
            checkbox(rendered[1]).click()
            assert(selected(view) === '0', `${style}: checkbox removes only its item`)
            const originalOutline = rendered[2].style.outline
            checkbox(rendered[2]).click()
            checkbox(rendered[3]).click()
            checkbox(rendered[2]).click()
            assert(rendered[2].style.outline === originalOutline, `${style}: deselection restores outline after other changes`)

            const dropdown = await menu(view)
            assert(dropdown.querySelectorAll('.uu-dropdown-divider').length === 2, `${style}: selected menu has three sections`)
            assert(!dropdown.textContent?.includes('Inspect'), `${style}: multiple selection hides single-item actions`)
            assert(!!dropdown.textContent?.includes('Compare Selected Items'), `${style}: comparison is a selection action`)
            document.body.click()
            await action(view, 'Batch')
            assert(actionResult === 'a,d', `${style}: batch actions receive selection order`)
            assert(!document.querySelector('.uu-dropdown'), `${style}: menu actions execute and dismiss the menu`)
            await action(view, 'Clear Selection')
            assert(selected(view) === '', `${style}: clear selection`)
            rendered[2].click()
            await action(view, 'Inspect c')
            assert(actionResult === 'c:2', `${style}: dynamic single-item action gets original index`)
            await action(view, 'Clear Selection')
            const emptyMenu = await menu(view)
            assert(emptyMenu.querySelectorAll('.uu-dropdown-divider').length === 1, `${style}: no empty action section`)
            assert(!emptyMenu.textContent?.includes('Batch'), `${style}: no selection actions without selection`)
            document.body.click()
        }

        let view = create({
            noDefaultActions: true,
            renderOption: {
                props: ['id', 'group'],
                onItemClick: async () => { callbackCount++; return true },
            },
        })
        assert(getComputedStyle(rows(view)[0]).cursor !== 'pointer', 'Item callbacks do not set an item-level pointer cursor')
        checkbox(rows(view)[0]).click()
        assert(callbackCount === 0, 'Checkbox does not trigger item click callback')
        rows(view)[1].click()
        await tick()
        assert(callbackCount === 1 && selected(view) === '1', 'Item callbacks coexist with selection')
        element(rows(view)[0], '.uu-va-action').click()
        await tick()
        assert(selected(view) === '1' && callbackCount === 1, 'Inline actions do not alter selection or invoke item callback')
        const noDefaultMenu = await menu(view)
        assert(!Array.from(noDefaultMenu.querySelectorAll('.uu-dropdown-item')).some(item => item.textContent === 'raw'), 'Menu respects noDefaultActions')
        document.body.click()

        view = create({ pageSize: 2, sortBy: [{ prop: 'id', order: 'desc' }] })
        await action(view, 'Select All')
        await action(view, 'Batch')
        assert(actionResult === 'd,c,b,a', 'Select all spans pages in filtered sort order')
        element(view, '.uu-pager-next').click()
        assert(selected(view) === '0,1', 'Selection is restored on another page')
        await action(view, 'Clear Selection')
        checkbox(rows(view)[1]).click()
        const filter = element<HTMLInputElement>(view, '.uu-va-filter')
        filter.value = 'group === "y"'
        filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        await action(view, 'Select All')
        await action(view, 'Batch')
        assert(actionResult === 'a,d,b', 'Filtered select all preserves hidden selection and insertion order')
        await action(view, 'Invert Selection')
        await action(view, 'Batch')
        assert(actionResult === 'a', 'Filtered inversion preserves hidden selection')
        await action(view, 'Invert Selection')
        await action(view, 'Clear Selection')
        filter.value = ''
        filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        element(view, '.uu-pager-next').click()
        assert(selected(view) === '', 'Clear selection clears hidden items too')

        view = create({ renderStyles: ['table', 'tile', 'wall'] })
        rows(view)[0].click()
        const toggles = view.querySelectorAll<HTMLElement>('.uu-va-view > *')
        toggles[1].click()
        assert(selected(view) === '0' && checkbox(rows(view)[0]).checked, 'View switching preserves selection')

        view = create({
            renderOption: {
                props: ['id'],
                onPropClick: () => true,
            },
        })
        assert(getComputedStyle(element(rows(view)[0], '.uu-va-value')).cursor === 'pointer', 'Properties with click handlers use pointer cursors')
        await menu(view)
        element(rows(view)[0], '.uu-va-value').click()
        assert(!document.querySelector('.uu-dropdown'), 'Property handlers stopping propagation do not prevent menu dismissal')
        assert(selected(view) === '', 'Property handlers retain click ownership')
        checkbox(rows(view)[0]).click()
        assert(selected(view) === '0', 'Property handlers do not block checkbox selection')

        view = create({
            renderOption: {
                itemFormatter: item => {
                    const row = document.createElement('tr')
                    row.insertCell().textContent = item.id
                    return row
                },
            },
        })
        checkbox(rows(view)[0]).click()
        assert(selected(view) === '0', 'Custom item formatters support selection')
        assert(rows(view)[0].children.length === 1, 'Checkbox does not add a custom table column')
        rows(view)[0].style.height = '100px'
        const rowBounds = rows(view)[0].getBoundingClientRect()
        const checkboxBounds = checkbox(rows(view)[0]).getBoundingClientRect()
        assert(Math.abs(checkboxBounds.top + checkboxBounds.height / 2 - rowBounds.top - rowBounds.height / 2) < 1, 'Table checkbox is vertically centered in tall rows')
        const border = getComputedStyle(rows(view)[0], '::after')
        assert(border.position === 'absolute' && parseFloat(border.borderTopWidth) > 0 && border.borderLeftWidth === border.borderTopWidth && border.borderRightWidth === border.borderTopWidth && border.borderBottomWidth === border.borderTopWidth, 'Selected table rows have a complete overlay border')
        assert(border.pointerEvents === 'none' && Number(border.zIndex) > 1, 'Selection border stays above positioned cells without blocking clicks')

        for (const key of comparisonState.keys()) localStorage.removeItem(key)
        const comparisonItems = [
            { uniform: true, nested: { value: 1 }, items: [1, 2], optional: undefined },
            { nested: { value: 2 }, items: [2, 1], uniform: true },
            { nested: { value: 1 }, items: [1, 2], uniform: true, optional: null },
        ]
        view = visualizeArray(comparisonItems, { renderStyles: ['table'] })
        host.replaceChildren(view)
        checkbox(rows(view)[2]).click()
        checkbox(rows(view)[0]).click()
        checkbox(rows(view)[1]).click()
        await action(view, 'Compare Selected Items')
        let dialog = element<HTMLDialogElement>(document, 'dialog:has(.uu-va-compare)')
        let comparison = element(dialog, '.uu-va-compare > .uu-va')
        assert(element(comparison, '.uu-va-pf').style.display !== 'none' && element(comparison, '.uu-pf-name').textContent === 'allSame', 'Comparison initially displays the recommended allSame property filter')
        assert(Array.from(comparison.querySelectorAll('.uu-va-table-head-cell')).map(cell => cell.textContent).join(',') === 'prop,allSame,Item 3,Item 1,Item 2', 'Comparison includes allSame and all selected items in selection order with original item numbers')
        assert(!comparison.querySelector('.uu-va-actions'), 'Comparison has no extra action column')
        function comparisonRow(property: string) {
            const row = Array.from(comparison.querySelectorAll<HTMLTableRowElement>('.uu-va-compare-row'))
                .find(row => row.cells[0].textContent === property)
            if (!row) throw new Error(`Missing comparison row: ${property}`)
            return row
        }
        let nested = comparisonRow('nested.value')
        assert(nested.cells[1].textContent === 'false', 'Different properties display allSame false')
        assert(Array.from(nested.cells).slice(2).map(cell => cell.textContent).join(',') === '1,1,2', 'Comparison recursively renders nested property values')
        assert(nested.cells[2].style.backgroundColor === nested.cells[3].style.backgroundColor, 'Equal comparison values share a cell background')
        assert(nested.cells[2].style.backgroundColor !== nested.cells[4].style.backgroundColor, 'Different comparison groups have different cell backgrounds')
        assert(getComputedStyle(nested.cells[2]).backgroundColor !== 'rgba(0, 0, 0, 0)', 'Comparison background covers the actual table cell')
        assert(Array.from(comparisonRow('items').cells).slice(2).map(cell => cell.textContent).join(';') === '[1,2];[1,2];[2,1]', 'Comparison renders arrays as whole values')
        assert(comparisonRow('uniform').cells[1].textContent === 'true', 'Comparison retains matching properties with allSame true')
        assert(Array.from(comparisonRow('uniform').cells).every(cell => !cell.style.backgroundColor && !cell.style.getPropertyValue('--bs-table-bg')), 'allSame rows have no comparison background colors')
        assert(Array.from(comparisonRow('optional').cells).slice(2).map(cell => cell.textContent).join(',') === 'null,undefined,<missing>', 'Comparison distinguishes missing, null and undefined')
        element(comparison, '.uu-va-table-head-cell').click()
        nested = comparisonRow('nested.value')
        assert(nested.cells[2].style.backgroundColor === nested.cells[3].style.backgroundColor && nested.cells[2].style.backgroundColor !== nested.cells[4].style.backgroundColor, 'Comparison preserves value colors after sorting')
        let comparisonFilter = element<HTMLInputElement>(comparison, '.uu-va-filter')
        comparisonFilter.value = 'allSame === false'
        comparisonFilter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        assert(!Array.from(comparison.querySelectorAll('.uu-va-compare-name')).some(cell => cell.textContent === 'uniform'), 'allSame supports boolean expression filtering')
        assert(JSON.parse(localStorage.getItem('uu-comparison-result-table') || '{}').filter === 'allSame === false', 'Comparison persists settings under the requested state key')
        element(dialog, '.uu-dialog-close').click()
        assert(!document.querySelector('dialog:has(.uu-va-compare)'), 'Comparison dialog closes normally')

        await action(view, 'Compare Selected Items')
        dialog = element<HTMLDialogElement>(document, 'dialog:has(.uu-va-compare)')
        comparison = element(dialog, '.uu-va-compare > .uu-va')
        comparisonFilter = element<HTMLInputElement>(comparison, '.uu-va-filter')
        assert(comparisonFilter.value === 'allSame === false' && !Array.from(comparison.querySelectorAll('.uu-va-compare-name')).some(cell => cell.textContent === 'uniform'), 'Reopening comparison restores filter settings')
        comparisonFilter.value = ''
        comparisonFilter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        assert(comparisonRow('uniform').cells[1].textContent === 'true', 'Clearing the restored filter shows matching properties again')
        element(dialog, '.uu-dialog-close').click()

        for (const identicalItems of [[{}, {}], [{ same: 1 }, { same: 1 }]]) {
            view = visualizeArray(identicalItems, { renderStyles: ['table'] })
            host.replaceChildren(view)
            checkbox(rows(view)[0]).click()
            checkbox(rows(view)[1]).click()
            await action(view, 'Compare Selected Items')
            dialog = element<HTMLDialogElement>(document, 'dialog:has(.uu-va-compare)')
            if (Object.keys(identicalItems[0]).length === 0) {
                assert(!!dialog.querySelector('.uu-va-empty'), 'Empty objects render the standard visualizeArray empty state')
            } else {
                assert(dialog.querySelector('.uu-va-compare-all-same')?.textContent === 'true', 'Identical nonempty objects retain their matching properties')
            }
            element(dialog, '.uu-dialog-close').click()
        }
        return { passed: checks }
    } finally {
        for (const [key, value] of comparisonState) {
            if (value === null) localStorage.removeItem(key)
            else localStorage.setItem(key, value)
        }
        document.querySelectorAll<HTMLElement>('.uu-dropdown').forEach(dropdown => dropdown.remove())
        host.remove()
    }
}
