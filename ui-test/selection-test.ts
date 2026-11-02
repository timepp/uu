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
        return { passed: checks }
    } finally {
        document.querySelectorAll<HTMLElement>('.uu-dropdown').forEach(dropdown => dropdown.remove())
        host.remove()
    }
}
