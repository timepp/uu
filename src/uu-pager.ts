import { createElement } from './uu-dom.ts'
import { prompt } from './uu-input.ts'

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
            if (page) this.gotoPage(Number(page) - 1)
        }
        this.pageSizeCtrl.onclick = async () => {
            const size = await prompt('Page Size', 'Enter number of items per page (enter 0 or negative number to disable paging)', `${this.pageSize}`)
            if (size) {
                const parsedSize = parseInt(size)
                if (!isNaN(parsedSize)) {
                    this.setPageSize(parsedSize > 0 ? parsedSize : Infinity)
                    this.gotoPage(0)
                }
            }
        }
        this.updateUI()
    }

    setPageSize(pageSize: number) {
        this.pageSize = pageSize
    }

    setTotalItems(totalItems: number) {
        this.totalItems = totalItems
    }

    getPageRange(page: number): { startIndex: number, endIndex: number } {
        const startIndex = this.pageSize === Infinity ? 0 : page * this.pageSize
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

    getElement(): HTMLElement {
        return this.toolbar
    }
}