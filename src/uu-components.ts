import * as tu from './tu.ts'
import { createCheckBtn, createElement, stringToColor } from './uu.ts'
import { prompt } from './uu-input.ts'

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
export function createSizeBar(parent: HTMLElement | null, parts: {name: string, value: number, color?: string}[], unit = '') {
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

export function createSelector(parent: HTMLElement | null, options: string[], onChange: (value: string[]) => void, multiSelect = false, initialValue: string[] = []) {
    const div = createElement(parent, 'div', ['d-flex', 'flex-wrap', 'gap-1'])
    const btns = options.map(o => {
        const btn = createCheckBtn(div, [], o, stringToColor(o, 100, 90), initialValue.includes(o))
        btn.checkbox.value = o
        return btn
    })
    const getSelected = () => btns.filter(b => b.checkbox.checked).map(b => b.checkbox.value)
    btns.forEach(btn => {
        btn.checkbox.addEventListener('change', () => {
            const selected = getSelected()
            if (!multiSelect && selected.length > 1) {
                // If multiSelect is false, uncheck all others
                btns.forEach(b => {
                    if (b !== btn && b.checkbox.checked) {
                        b.checkbox.click()
                    }
                })
            }
            onChange(selected)
        })
    })

    return {
        element: div,
        getSelected
    }
}

export class Pager {
    toolbar: HTMLElement
    privBtn: HTMLButtonElement
    nextBtn: HTMLButtonElement
    lastBtn: HTMLButtonElement
    firstBtn: HTMLButtonElement
    pageText: HTMLElement
    pageSizeCtrl: HTMLElement
    currentPage = 0
    constructor(private totalItems: number, private pageSize: number, private onPageChange: (pageIndex: number, pageSize: number) => void) {
        this.toolbar = createElement(null, 'div', ['input-group', 'w-auto', 'flex-shrink-0'])
        const btnClass = ['btn', 'btn-secondary']
        this.firstBtn = createElement(this.toolbar, 'button', btnClass, '<<')
        this.privBtn = createElement(this.toolbar, 'button', btnClass, '<')
        this.pageText = createElement(this.toolbar, 'button', ['btn', 'btn-secondary'], '1 / 1')
        this.pageSizeCtrl = createElement(this.toolbar, 'span', ['btn', 'btn-secondary'], '[20]')
        this.nextBtn = createElement(this.toolbar, 'button', btnClass, '>')
        this.lastBtn = createElement(this.toolbar, 'button', btnClass, '>>')
        this.firstBtn.onclick = () => this.gotoPage(0)
        this.privBtn.onclick = () => this.gotoPage(this.currentPage - 1)
        this.nextBtn.onclick = () => this.gotoPage(this.currentPage + 1)
        this.lastBtn.onclick = () => this.gotoPage(Infinity)
        this.pageText.onclick = async () => {
            const page = await prompt('Go to Page', 'Enter page number', `${this.currentPage + 1}`)
            if (page) {
                this.gotoPage(Number(page) - 1)
            }
        }
        this.pageSizeCtrl.onclick = async () => {
            const size = await prompt('Page Size', 'Enter number of items per page (enter 0 or negative number to disable paging)', `${this.pageSize}`)
            if (size) {
                const n = parseInt(size)
                if (!isNaN(n)) {
                    this.setPageSize(n > 0 ? n : Infinity)
                    this.gotoPage(0)
                }
            }
        }
        // this.gotoPage(this.currentPage)
        this.updateUI()
    }

    setPageSize(pageSize: number) {
        this.pageSize = pageSize
    }

    setTotalItems(totalItems: number) {
        this.totalItems = totalItems
    }

    getPageRange(page: number) {
        const startIndex = this.pageSize === Infinity ?0 : page * this.pageSize
        const endIndex = Math.min(startIndex + this.pageSize, this.totalItems)
        return { startIndex, endIndex }
    }

    private updateUI() {
        const totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize))
        this.pageText.textContent = `${this.currentPage + 1} / ${totalPages}`
        this.pageSizeCtrl.textContent = `📄 ${this.pageSize === Infinity ? '' : this.pageSize}`
        this.privBtn.disabled = this.currentPage <= 0
        this.firstBtn.disabled = this.currentPage <= 0
        this.nextBtn.disabled = this.currentPage >= totalPages - 1
        this.lastBtn.disabled = this.currentPage >= totalPages - 1
    }

    gotoPage(page: number) {
        const totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize))
        if (page < 0) page = 0
        if (page >= totalPages) page = totalPages - 1
        this.currentPage = page
        this.updateUI()
        this.onPageChange(this.currentPage, this.pageSize)
    }

    refreshCurrentPage() {
        this.gotoPage(this.currentPage)
    }

    getElement() {
        return this.toolbar
    }
}
