import { visualizeArray, type VisualizeConfig } from '../src/uu-visualize-array.ts'
import { createHeader } from '../src/uu-dom.ts'
import { stringToColor } from '../src/tu.ts'

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

    function hover(view: HTMLElement) {
        view.scrollIntoView({ block: 'start' })
        const bounds = view.getBoundingClientRect()
        const position = { x: bounds.left + Math.min(20, bounds.width / 2), y: bounds.top + Math.min(20, bounds.height / 2) }
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: position.x, clientY: position.y }))
        return position
    }

    function pressF(target: EventTarget = document.body, options: KeyboardEventInit = {}) {
        const event = new KeyboardEvent('keydown', { key: 'f', bubbles: true, cancelable: true, ...options })
        target.dispatchEvent(event)
        return event
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
            if (style === 'tile') {
                const defaultHeaders = view.querySelectorAll<HTMLElement>('.uu-va-tile-header')
                assert(defaultHeaders.length === rendered.length && Array.from(defaultHeaders).every(header => header.classList.contains('uu-header') && header.style.backgroundColor === 'gray'), 'Tiles without a header callback use gray headers')
                assert(defaultHeaders[0].getBoundingClientRect().height > 0, 'Default empty headers have a visible height')
            } else {
                assert(!view.querySelector('.uu-va-tile-header'), `${style}: default tile headers do not affect other layouts`)
            }
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
            first.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
            rendered[1].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
            assert(selected(view) === '0,1', `${style}: Ctrl-click extends selection`)
            first.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
            assert(selected(view) === '1', `${style}: Ctrl-click removes only the clicked item`)
            rendered[1].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
            assert(selected(view) === '', `${style}: Ctrl-click can clear the final selected item`)
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
            const position = hover(view)
            assert(pressF().defaultPrevented, `${style}: F handles the hovered view shortcut`)
            const contextMenu = element(document, '.uu-dropdown')
            const menuBounds = contextMenu.getBoundingClientRect()
            assert(Math.abs(menuBounds.left - position.x) < 1 && Math.abs(menuBounds.top - position.y) < 1, `${style}: F anchors the menu at the mouse position`)
            assert(!!contextMenu.textContent?.includes('Compare Selected Items'), `${style}: keyboard menu includes current selection actions`)
            pressF(document.body, { repeat: true })
            assert(contextMenu.isConnected, `${style}: key repeat does not toggle the menu`)
            pressF(document.body, { key: 'F', shiftKey: true })
            assert(!document.querySelector('.uu-dropdown'), `${style}: F toggles the context menu closed`)
            for (const modifiers of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }]) {
                assert(!pressF(document.body, modifiers).defaultPrevented && !document.querySelector('.uu-dropdown'), `${style}: modified or composing F leaves native input behavior intact`)
            }
            pressF(element(view, '.uu-va-filter'))
            assert(!document.querySelector('.uu-dropdown'), `${style}: F in a text input does not open the menu`)
            const editor = document.createElement('div')
            editor.contentEditable = 'true'
            view.appendChild(editor)
            pressF(editor)
            assert(!document.querySelector('.uu-dropdown'), `${style}: F in contenteditable does not open the menu`)
            editor.remove()
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

        const standaloneHeader = createHeader('red')
        assert(standaloneHeader instanceof HTMLDivElement && standaloneHeader.parentElement === null, 'Headers can be created independently without mounting')
        assert(standaloneHeader.textContent === '' && standaloneHeader.style.backgroundColor === 'red', 'createHeader uses the supplied CSS color without adding text')
        const coloredHeaderView = create({
            renderStyles: ['tile'],
            tileRenderOption: {
                header: item => createHeader(stringToColor(item.group, 70, 93)),
            },
        })
        const headers = coloredHeaderView.querySelectorAll<HTMLElement>('.uu-va-tile-header')
        assert(headers.length === 4 && headers[0].tagName === 'DIV' && headers[0].textContent === '', 'createHeader composes into empty colored tile headers')
        assert(headers[0].style.backgroundColor === headers[2].style.backgroundColor && headers[0].style.backgroundColor !== headers[1].style.backgroundColor, 'Clients can use stringToColor to supply stable header colors')
        const headerColor = getComputedStyle(headers[0]).backgroundColor.match(/\d+/g)?.map(Number) || []
        assert(headerColor.length >= 3 && headerColor.slice(0, 3).every(channel => channel > 220), 'createHeader preserves a supplied pale color')
        const headerCard = rows(coloredHeaderView)[0]
        const headerFillsCard = () => {
            const style = getComputedStyle(headerCard)
            const contentWidth = headerCard.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
            return Math.abs(headers[0].getBoundingClientRect().width - contentWidth) < 1
        }
        assert(headerFillsCard(), 'Headers fill the entire card content width')
        assert(headers[0].getBoundingClientRect().height >= 6 * parseFloat(getComputedStyle(document.documentElement).fontSize), 'Headers are at least 6rem tall')
        element(coloredHeaderView, '.uu-va-tiles').style.gridTemplateColumns = '100px'
        assert(headerFillsCard(), 'Headers remain aligned to narrow card content widths')
        headers[0].click()
        assert(selected(coloredHeaderView) === '0', 'Colored headers retain tile selection behavior')
        const customHeader = document.createElement('span')
        customHeader.textContent = 'Custom header'
        customHeader.style.backgroundColor = 'red'
        const elementHeaderView = create({
            renderStyles: ['tile'],
            tileRenderOption: { header: item => item.id === 'a' ? customHeader : createHeader(stringToColor(item.group)) },
        })
        assert(elementHeaderView.querySelector('.uu-va-tile-header') === customHeader && customHeader.style.backgroundColor === 'red', 'Custom element headers retain their original node and styling instead of using the default gray header')

        const outer = create()
        const inner = visualizeArray(items, {
            renderStyles: ['table'],
            itemActions: { Nested: () => { actionResult = 'nested' } },
        })
        outer.appendChild(inner)
        rows(inner)[0].click()
        hover(inner)
        pressF()
        const nestedMenu = element(document, '.uu-dropdown')
        assert(!!nestedMenu.textContent?.includes('Nested') && !nestedMenu.textContent?.includes('Inspect'), 'F targets the innermost hovered view only')
        const nestedAction = Array.from(nestedMenu.querySelectorAll<HTMLElement>('.uu-dropdown-item')).find(item => item.textContent === 'Nested')
        if (!nestedAction) throw new Error('Missing nested context action')
        nestedAction.click()
        await tick()
        assert(actionResult === 'nested' && !document.querySelector('.uu-dropdown'), 'Context menu actions execute and dismiss normally')
        const edgeView = create()
        Object.assign(edgeView.style, { position: 'fixed', right: '0', bottom: '0', width: '300px', maxHeight: '250px', overflow: 'auto', zIndex: '1' })
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: innerWidth - 2, clientY: innerHeight - 2 }))
        pressF()
        const edgeBounds = element(document, '.uu-dropdown').getBoundingClientRect()
        assert(edgeBounds.left >= 0 && edgeBounds.top >= 0 && edgeBounds.right <= innerWidth && edgeBounds.bottom <= innerHeight, `Mouse-anchored context menus remain inside the viewport: ${JSON.stringify(edgeBounds.toJSON())}`)
        document.body.click()
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: -1, clientY: -1 }))
        assert(!pressF().defaultPrevented && !document.querySelector('.uu-dropdown'), 'F outside a view does not open a menu')
        hover(edgeView)
        edgeView.remove()
        assert(!pressF().defaultPrevented && !document.querySelector('.uu-dropdown'), 'Removed views do not retain active shortcuts')

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
        hover(comparison)
        pressF(element(dialog, '.uu-dialog-content'))
        assert(!!dialog.querySelector('.uu-dropdown'), 'F opens the comparison menu inside its modal dialog')
        pressF(element(dialog, '.uu-dialog-content'))
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
