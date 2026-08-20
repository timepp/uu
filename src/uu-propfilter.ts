import { createElement, showDialog } from './uu.ts'

export type PropertyFilterState = {
    filters: Record<string, string[]>
}

export type PropertyFilterProperty<T extends object> = string | {
    name: string
    getValues?: (item: T) => unknown | unknown[]
}

export type PropertyFilterOptions<T extends object> = {
    properties: PropertyFilterProperty<T>[]
    maxInlineValues?: number
    onChange?: (filter: PropertyFilter<T>) => void | Promise<void>
}

type NormalizedProperty<T extends object> = {
    name: string
    getValues: (item: T) => string[]
}

function arraylize<T>(value: T | T[]) {
    return value instanceof Array ? value : [value]
}

function normalizeValues(values: unknown | unknown[]) {
    return arraylize(values)
        .filter(value => value !== undefined && value !== null && `${value}` !== '')
        .map(value => `${value}`)
}

function countValues<T extends object>(items: T[], property: NormalizedProperty<T>) {
    const counts: Record<string, number> = {}
    for (const item of items) {
        for (const value of property.getValues(item)) {
            counts[value] = (counts[value] || 0) + 1
        }
    }
    return counts
}

function sortedKeysByCount(counts: Record<string, number>) {
    return Object.keys(counts).sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b))
}

function injectPropertyFilterStyles() {
    const styleId = 'uu-property-filter-styles'
    if (document.getElementById(styleId)) return
    const style = createElement(document.head, 'style', [], '', {}, { id: styleId })
    style.textContent = `
        .property-filters {
            margin-top: 5px;
            padding: 5px;
            border: 1px solid #CCCCCC;
        }
        .property-filter-row {
            gap: 4px;
        }
        .property-filter-name {
            min-width: 110px;
            font-weight: 600;
            color: #555;
            padding-top: 5px;
        }
        .property-filter-value {
            border: 1px solid #CCCCCC;
            border-top-left-radius: 4px;
            border-bottom-right-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            display: inline-block;
            background-color: #fff;
        }
        .property-filter-value:hover {
            background-color: lightyellow;
        }
        .property-filter-value.selected {
            background-color: #CCFFCC;
        }
        .property-filter-dialog {
            max-width: 80vw;
            max-height: 65vh;
            overflow: auto;
        }
    `
}

function loadState(stateKey: string): PropertyFilterState {
    if (!stateKey) return { filters: {} }
    try {
        const parsed = JSON.parse(localStorage.getItem(stateKey) || '{}')
        return { filters: parsed.filters || {} }
    } catch {
        return { filters: {} }
    }
}

export class PropertyFilter<T extends object> {
    root: HTMLDivElement
    private items: T[]
    private properties: NormalizedProperty<T>[]
    private state: PropertyFilterState
    private maxInlineValues: number
    private onChange?: (filter: PropertyFilter<T>) => void | Promise<void>

    constructor(parent: Element | null, items: T[], private stateKey: string, options: PropertyFilterOptions<T>) {
        injectPropertyFilterStyles()
        this.items = items
        this.properties = options.properties.map(property => this.normalizeProperty(property))
        this.state = loadState(stateKey)
        this.maxInlineValues = options.maxInlineValues ?? 20
        this.onChange = options.onChange
        this.root = createElement(parent, 'div', ['property-filters'])
        this.cleanupState()
        this.render()
    }

    setItems(items: T[]) {
        this.items = items
        this.render()
    }

    getFilteredItems(items = this.items) {
        return this.applyFiltersExcept(items)
    }

    getSummary() {
        return this.properties
            .map(property => [property.name, this.getSelectedValues(property.name)] as const)
            .filter(([, values]) => values.length > 0)
            .map(([property, values]) => `${property}: ${values.join('+')}`)
    }

    getState() {
        return this.state
    }

    private normalizeProperty(property: PropertyFilterProperty<T>): NormalizedProperty<T> {
        if (typeof property === 'string') {
            return {
                name: property,
                getValues: item => normalizeValues(item[property as keyof T] as unknown)
            }
        }
        return {
            name: property.name,
            getValues: item => normalizeValues(property.getValues ? property.getValues(item) : item[property.name as keyof T] as unknown)
        }
    }

    private cleanupState() {
        const knownProperties = new Set(this.properties.map(property => property.name))
        for (const property of Object.keys(this.state.filters)) {
            if (!knownProperties.has(property)) delete this.state.filters[property]
        }
    }

    private saveState() {
        if (!this.stateKey) return
        localStorage.setItem(this.stateKey, JSON.stringify(this.state))
    }

    private getSelectedValues(propertyName: string) {
        return this.state.filters[propertyName] || []
    }

    private propertyMatches(item: T, property: NormalizedProperty<T>, selectedValues: string[]) {
        if (selectedValues.length === 0) return true
        const itemValues = property.getValues(item)
        return selectedValues.some(value => itemValues.includes(value))
    }

    private applyFiltersExcept(items: T[], skippedProperty?: string) {
        return items.filter(item => {
            return this.properties.every(property => {
                if (property.name === skippedProperty) return true
                return this.propertyMatches(item, property, this.getSelectedValues(property.name))
            })
        })
    }

    private allPropertyValues(property: NormalizedProperty<T>) {
        return sortedKeysByCount(countValues(this.items, property))
    }

    private sortPropertyValues(values: string[], selectedValues: string[], counts: Record<string, number>) {
        return [...values].sort((a, b) => {
            const aSelected = selectedValues.includes(a)
            const bSelected = selectedValues.includes(b)
            if (aSelected !== bSelected) return aSelected ? -1 : 1
            return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b)
        })
    }

    private async emitChange() {
        this.saveState()
        await this.onChange?.(this)
    }

    private clearProperty(propertyName: string) {
        this.state.filters[propertyName] = []
    }

    private toggleValue(propertyName: string, value: string) {
        const selectedValues = this.state.filters[propertyName] ||= []
        const index = selectedValues.indexOf(value)
        if (index >= 0) {
            selectedValues.splice(index, 1)
        } else {
            selectedValues.push(value)
        }
    }

    private renderValues(container: HTMLElement, property: NormalizedProperty<T>, values: string[], limit?: number) {
        container.replaceChildren()

        const selectedValues = this.getSelectedValues(property.name)
        const countItems = this.applyFiltersExcept(this.items, property.name)
        const counts = countValues(countItems, property)
        const sortedValues = this.sortPropertyValues(values, selectedValues, counts)
        const nonZeroValues = sortedValues.filter(value => (counts[value] || 0) > 0)
        const visibleValues = limit ? nonZeroValues.slice(0, limit) : nonZeroValues

        const allButton = createElement(container, 'span', ['property-filter-value', 'me-1', 'mb-1'], `All (${countItems.length})`)
        allButton.classList.toggle('selected', selectedValues.length === 0)
        allButton.onclick = async () => {
            this.clearProperty(property.name)
            this.render()
            await this.emitChange()
        }

        for (const value of visibleValues) {
            const button = createElement(container, 'span', ['property-filter-value', 'me-1', 'mb-1'], `${value} (${counts[value] || 0})`)
            button.classList.toggle('selected', selectedValues.includes(value))
            button.onclick = async () => {
                this.toggleValue(property.name, value)
                this.render()
                await this.emitChange()
            }
        }

        if (limit && nonZeroValues.length > limit) {
            const moreButton = createElement(container, 'span', ['property-filter-value', 'me-1', 'mb-1'], '...')
            moreButton.onclick = () => this.showAllValuesDialog(property, values)
        }
    }

    private showAllValuesDialog(property: NormalizedProperty<T>, values: string[]) {
        const content = createElement(null, 'div', ['property-filter-dialog'])
        const render = () => this.renderValues(content, property, values)
        render()
        showDialog(`Filter ${property.name}`, content, { actions: ['Close'] })
    }

    render() {
        this.root.replaceChildren()
        this.cleanupState()
        for (const property of this.properties) {
            const row = createElement(this.root, 'div', ['property-filter-row', 'd-flex', 'align-items-start', 'mb-1'])
            createElement(row, 'div', ['property-filter-name', 'me-2'], property.name)
            const valuesArea = createElement(row, 'div', ['property-filter-values', 'd-flex', 'flex-wrap'])
            this.renderValues(valuesArea, property, this.allPropertyValues(property), this.maxInlineValues)
        }
    }
}
