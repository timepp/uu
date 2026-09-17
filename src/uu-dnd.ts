import { createElement } from './uu-dom.ts'

export type DraggableSortedContainerOption = {
    showOrder: boolean
    interactive: boolean
    removable: boolean
    emptyText: string
    onChange: (items: string[]) => void
}

export class DraggableSortedContainer {
    root: HTMLElement
    private items: string[] = []
    private dragFromIndex = -1
    private itemElements: HTMLElement[] = []
    private dropGaps: HTMLElement[] = []
    private activeDropGap: HTMLElement | null = null

    constructor(parent: Element | null, private cfg: Partial<DraggableSortedContainerOption> = {}) {
        this.root = createElement(parent, 'div', ['d-flex'], '', { whiteSpace: 'nowrap', overflow: 'auto', textOverflow: 'ellipsis' })
    }

    setStrings(items: string[]) {
        this.items = [...items]
        this.render()
    }

    getStrings(items: string[] = []): string[] {
        items.length = 0
        items.push(...this.items)
        return items
    }

    private emitChange() {
        this.cfg.onChange?.([...this.items])
    }

    private setDropHint(gap: HTMLElement | null) {
        if (this.activeDropGap && this.activeDropGap !== gap) {
            this.activeDropGap.style.flexBasis = '6px'
            this.activeDropGap.style.backgroundColor = ''
        }
        this.activeDropGap = gap
        if (gap) {
            gap.style.flexBasis = '16px'
            gap.style.backgroundColor = '#0d6efd'
        }
    }

    private getInsertIndex(event: DragEvent): number | undefined {
        const first = this.itemElements[0]
        const last = this.itemElements[this.itemElements.length - 1]
        if (!first || !last) return
        const rootRect = this.root.getBoundingClientRect()
        const verticalTolerance = Math.max(rootRect.height, 24)
        if (event.clientY < rootRect.top - verticalTolerance || event.clientY > rootRect.bottom + verticalTolerance) return
        const firstRect = first.getBoundingClientRect()
        const lastRect = last.getBoundingClientRect()
        if (event.clientX < firstRect.left) return 0
        if (event.clientX > lastRect.right) return this.items.length
        for (let index = 1; index < this.itemElements.length; index++) {
            const previousRect = this.itemElements[index - 1].getBoundingClientRect()
            const nextRect = this.itemElements[index].getBoundingClientRect()
            const hitAreaLeft = previousRect.left + previousRect.width / 2
            const hitAreaRight = nextRect.left + nextRect.width / 2
            if (event.clientX >= hitAreaLeft && event.clientX <= hitAreaRight) return index
        }
    }

    private moveItem(insertIndex: number) {
        const from = this.dragFromIndex
        if (from < 0 || from >= this.items.length) return
        const targetIndex = from < insertIndex ? insertIndex - 1 : insertIndex
        if (targetIndex === from) return
        const items = [...this.items]
        const [moved] = items.splice(from, 1)
        items.splice(targetIndex, 0, moved)
        this.items = items
        this.render()
        this.emitChange()
    }

    private onDocumentDragOver = (event: DragEvent) => {
        if (this.dragFromIndex < 0) return
        const insertIndex = this.getInsertIndex(event)
        if (insertIndex === undefined) {
            this.setDropHint(null)
            return
        }
        event.preventDefault()
        this.setDropHint(this.dropGaps[insertIndex])
    }

    private onDocumentDrop = (event: DragEvent) => {
        if (this.dragFromIndex < 0) return
        const insertIndex = this.getInsertIndex(event)
        if (insertIndex === undefined) return
        event.preventDefault()
        event.stopPropagation()
        this.setDropHint(null)
        this.moveItem(insertIndex)
    }

    private stopDocumentDragTracking() {
        document.removeEventListener('dragover', this.onDocumentDragOver, true)
        document.removeEventListener('drop', this.onDocumentDrop, true)
        this.setDropHint(null)
    }

    private createDropGap(insertIndex: number) {
        const gap = createElement(this.root, 'span', [], '', {
            alignSelf: 'stretch', flex: '0 0 6px', minHeight: '1.75rem', transition: 'flex-basis 0.1s'
        })
        this.dropGaps.push(gap)
        if (!(this.cfg.interactive ?? true)) return
        gap.ondragover = event => {
            event.preventDefault()
            this.setDropHint(gap)
        }
        gap.ondragleave = () => this.setDropHint(null)
        gap.ondrop = event => {
            event.preventDefault()
            this.setDropHint(null)
            const raw = event.dataTransfer?.getData('text/plain')
            const from = raw ? parseInt(raw, 10) : this.dragFromIndex
            if (Number.isNaN(from) || from < 0 || from >= this.items.length) return
            this.dragFromIndex = from
            this.moveItem(insertIndex)
        }
    }

    private render() {
        this.root.replaceChildren()
        this.itemElements = []
        this.dropGaps = []
        this.activeDropGap = null
        if (this.items.length === 0) {
            createElement(this.root, 'span', ['text-muted'], this.cfg.emptyText || '(none)')
            return
        }
        this.createDropGap(0)
        for (const [index, item] of this.items.entries()) {
            const chip = createElement(this.root, 'span', ['px-1', 'rounded', 'd-inline-flex', 'align-items-center'], '', {
                border: '1px solid #cccccc', backgroundColor: '#f8f9fa', userSelect: 'none'
            })
            this.itemElements.push(chip)
            createElement(chip, 'span', ['me-1'], this.cfg.showOrder ? `${index + 1}: ${item}` : item)
            if (this.cfg.interactive ?? true) {
                chip.draggable = true
                chip.title = 'Drag to reorder'
                chip.ondragstart = event => {
                    this.dragFromIndex = index
                    event.dataTransfer?.setData('text/plain', `${index}`)
                    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
                    chip.style.opacity = '0.6'
                    document.addEventListener('dragover', this.onDocumentDragOver, true)
                    document.addEventListener('drop', this.onDocumentDrop, true)
                }
                chip.ondragend = () => {
                    chip.style.opacity = '1'
                    this.dragFromIndex = -1
                    this.stopDocumentDragTracking()
                }
            }
            if (this.cfg.removable ?? true) {
                const removeButton = createElement(chip, 'a', ['text-decoration-none'], '✕', { cursor: 'pointer' })
                removeButton.title = 'Remove'
                removeButton.draggable = false
                removeButton.onclick = () => {
                    this.items = this.items.filter((_, itemIndex) => itemIndex !== index)
                    this.render()
                    this.emitChange()
                }
            }
            this.createDropGap(index + 1)
        }
    }
}