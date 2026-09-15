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

    private render() {
        this.root.replaceChildren()
        if (this.items.length === 0) {
            createElement(this.root, 'span', ['text-muted'], this.cfg.emptyText || '(none)')
            return
        }
        for (const [index, item] of this.items.entries()) {
            const chip = createElement(this.root, 'span', ['me-1', 'px-1', 'rounded', 'd-inline-flex', 'align-items-center'], '', {
                border: '1px solid #cccccc', backgroundColor: '#f8f9fa', userSelect: 'none'
            })
            createElement(chip, 'span', ['me-1'], this.cfg.showOrder ? `${index + 1}: ${item}` : item)
            const clearDropHint = () => {
                chip.style.borderColor = '#cccccc'
                chip.style.boxShadow = ''
            }
            if (this.cfg.interactive ?? true) {
                chip.draggable = true
                chip.title = 'Drag to reorder'
                chip.ondragstart = event => {
                    this.dragFromIndex = index
                    event.dataTransfer?.setData('text/plain', `${index}`)
                    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
                    chip.style.opacity = '0.6'
                }
                chip.ondragend = () => {
                    chip.style.opacity = '1'
                    this.dragFromIndex = -1
                    clearDropHint()
                }
                chip.ondragover = event => {
                    event.preventDefault()
                    const rect = chip.getBoundingClientRect()
                    const after = event.clientX > rect.left + rect.width / 2
                    chip.style.borderColor = after ? '#198754' : '#0d6efd'
                    chip.style.boxShadow = after ? 'inset -3px 0 0 #198754' : 'inset 3px 0 0 #0d6efd'
                }
                chip.ondragleave = clearDropHint
                chip.ondrop = event => {
                    event.preventDefault()
                    clearDropHint()
                    const raw = event.dataTransfer?.getData('text/plain')
                    const from = raw ? parseInt(raw, 10) : this.dragFromIndex
                    if (Number.isNaN(from) || from < 0 || from >= this.items.length || from === index) return
                    const rect = chip.getBoundingClientRect()
                    const insertIndex = index + (event.clientX > rect.left + rect.width / 2 ? 1 : 0)
                    const items = [...this.items]
                    const [moved] = items.splice(from, 1)
                    items.splice(from < insertIndex ? insertIndex - 1 : insertIndex, 0, moved)
                    this.items = items
                    this.render()
                    this.emitChange()
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
        }
    }
}