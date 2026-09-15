import * as tu from './tu.ts'
import { createElement, fa, syncClass } from './uu-dom.ts'
import { createInputArea } from './uu-input.ts'
import type { FieldEditOption } from './uu-input.ts'

/**
 * Create a horizontal bar showing proportions of different parts
 * 
 * @param parent Parent element to attach the bar to
 * @param parts Array of parts with name, value, and optional color
 * @param unit Optional unit to display (e.g., 'bytes', '%')
 * @returns The created bar element
 * 
 * @example
 * ```typescript
 * createSizeBar(document.body, [
 *   { name: 'Used', value: 60 },
 *   { name: 'Free', value: 40 }
 * ], '%')
 * ```
 */
export function createSizeBar(parent: HTMLElement | null, parts: {name: string, value: number, color?: string}[], unit = ''): HTMLDivElement {
    const container = createElement(parent, 'div', ['d-flex', 'flex-column', 'gap-2'])
    
    const total = parts.reduce((sum, part) => sum + part.value, 0)
    if (total === 0) {
        createElement(container, 'div', ['text-muted'], 'No data')
        return container
    }
    
    // Create the bar
    const bar = createElement(container, 'div', ['d-flex', 'w-100'])
    bar.style.height = '30px'
    bar.style.borderRadius = '4px'
    bar.style.overflow = 'hidden'
    bar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)'
    
    // Create segments
    parts.forEach((part, index) => {
        const percentage = (part.value / total) * 100
        if (percentage < 0.1) return // Skip very small segments
        
        const segment = createElement(bar, 'div')
        segment.style.width = `${percentage}%`
        segment.style.backgroundColor = part.color || tu.stringToColor(part.name)
        segment.style.transition = 'all 0.3s ease'
        segment.title = `${part.name}: ${tu.formatFloat(percentage, 1)}%`
        
        // Add hover effect
        segment.addEventListener('mouseenter', () => {
            segment.style.opacity = '0.8'
            segment.style.transform = 'scaleY(1.1)'
        })
        segment.addEventListener('mouseleave', () => {
            segment.style.opacity = '1'
            segment.style.transform = 'scaleY(1)'
        })
    })
    
    // Create legend
    const legend = createElement(container, 'div', ['d-flex', 'flex-wrap', 'gap-2', 'small'])
    parts.forEach(part => {
        const percentage = (part.value / total) * 100
        
        const item = createElement(legend, 'div', ['d-flex', 'align-items-center', 'gap-1'])
        
        const colorBox = createElement(item, 'div')
        colorBox.style.width = '12px'
        colorBox.style.height = '12px'
        colorBox.style.backgroundColor = part.color || tu.stringToColor(part.name)
        colorBox.style.borderRadius = '2px'
        colorBox.style.flexShrink = '0'
        
        const label = createElement(item, 'span')
        const valueStr = unit ? `${tu.formatFloat(part.value, 2)} ${unit}` : tu.formatFloat(part.value, 2)
        label.textContent = `${part.name}: ${valueStr} (${tu.formatFloat(percentage, 1)}%)`
    })
    
    return container
}

export function createDataArea<T extends object>(parent: HTMLElement | null, title: string, params: T, fieldOptions: Partial<Record<keyof T, FieldEditOption>> = {}, renderer: (params: T) => Promise<HTMLElement>): HTMLDivElement {
    const div = createElement(parent, 'div', ['d-flex', 'flex-column', 'border', 'border-light-subtle', 'p-2'])
    // div.style.backgroundColor = tu.stringToColor(title, 100, 97)
    const ia = createInputArea(div, params, fieldOptions, 'bar')
    const contentDiv = createElement(div, 'div', ['mt-2'])

    const renderBtn = createElement(ia.element, 'button', ['btn', 'btn-primary'], `${title}`)
    renderBtn.style.whiteSpace = 'nowrap'
    renderBtn.style.flexShrink = '0'

    const showHideBtn = createElement(ia.element, 'button', ['btn', 'btn-outline-secondary'], '')
    showHideBtn.style.whiteSpace = 'nowrap'
    showHideBtn.style.flexShrink = '0'
    // Initially hide the show/hide button until content is rendered
    showHideBtn.style.display = 'none'

    const state = tu.createObservableState(null, {showData: false}, s => {
        contentDiv.style.display = s.showData ? 'block' : 'none'
        //toggleBtn.replaceChildren(s.folded ? fa('fa-chevron-down') : fa('fa-chevron-up'))
        showHideBtn.replaceChildren(s.showData ? fa('fa-chevron-down') : fa('fa-chevron-right'))
        syncClass(div, 'highlight', s.showData)
    })

    showHideBtn.onclick = () => {
        state.showData = !state.showData
    }

    renderBtn.onclick = async () => {
        state.showData = true
        contentDiv.textContent = 'Loading...'
        const content = await renderer(ia.getValues())
        contentDiv.replaceChildren(content)
        // force show data if render is called
        // show the show/hide button once content is rendered
        showHideBtn.style.display = 'inline-block'
    }

    return div
}
