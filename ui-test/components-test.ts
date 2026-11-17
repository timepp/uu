import { createDataArea } from '../src/uu-components.ts'
import type { MaybePromise } from '../src/tu.ts'

export async function runComponentsTests() {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let checks = 0
    const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

    function assert(condition: boolean, name: string) {
        if (!condition) throw new Error(name)
        checks++
    }

    function element<E extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): E {
        const result = root.querySelector<E>(selector)
        if (!result) throw new Error(`Missing test element: ${selector}`)
        return result
    }

    try {
        const failures: { message: string, render: () => MaybePromise<HTMLElement> }[] = [
            { message: '<b>sync failure</b>', render: () => { throw new Error('<b>sync failure</b>') } },
            { message: 'async failure', render: () => Promise.reject(new Error('async failure')) },
            { message: 'string failure', render: () => { throw 'string failure' } },
        ]
        for (const failure of failures) {
            const success = document.createElement('div')
            success.textContent = 'Recovered'
            let fail = true
            const area = createDataArea(host, 'Render', { query: 'test' }, {}, params => {
                assert(params.query === 'test', 'Renderer receives input values')
                return fail ? failure.render() : success
            })
            const button = element<HTMLButtonElement>(area, '.uu-data-area-render')
            const content = element(area, '.uu-data-area-content')
            const toggle = element<HTMLButtonElement>(area, '.uu-data-area-toggle')
            button.click()
            await tick()
            assert(area.classList.contains('uu-has-error'), 'Failure marks the area')
            assert(!area.classList.contains('uu-is-loading'), 'Failure clears loading state')
            assert(content.style.display !== 'none', 'Error is visible')
            assert(element(area, '.uu-data-area-error').textContent?.includes(failure.message) === true, 'Error message is displayed')
            assert(!content.querySelector('b'), 'Error messages are plain text')
            assert(toggle.style.display !== 'none', 'Failed content can be folded')
            toggle.click()
            assert(content.style.display === 'none', 'Error content folds')
            toggle.click()
            assert(content.style.display !== 'none', 'Error content unfolds')
            fail = false
            button.click()
            await tick()
            assert(!area.classList.contains('uu-has-error'), 'Retry clears error state')
            assert(!area.classList.contains('uu-is-loading'), 'Successful retry clears loading state')
            assert(content.firstElementChild === success, 'Successful retry replaces the error')
            area.remove()
        }

        let complete: ((value: HTMLElement) => void) | undefined
        const area = createDataArea(host, 'Async render', {}, {}, () => new Promise<HTMLElement>(resolve => { complete = resolve }))
        element<HTMLButtonElement>(area, '.uu-data-area-render').click()
        assert(area.classList.contains('uu-is-loading'), 'Pending render shows loading state')
        assert(element(area, '.uu-data-area-content').textContent === 'Loading...', 'Pending render shows loading text')
        if (!complete) throw new Error('Renderer did not run')
        const result = document.createElement('span')
        result.textContent = 'Async result'
        complete(result)
        await tick()
        assert(!area.classList.contains('uu-is-loading'), 'Async completion clears loading state')
        assert(element(area, '.uu-data-area-content').firstElementChild === result, 'Async completion displays the result')
        return { checks }
    } finally {
        host.remove()
    }
}
