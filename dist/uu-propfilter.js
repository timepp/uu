import * as tu from './tu.js';
import { createElement, showDialog, showSelection } from './uu.js';
function arraylize(value) {
    return value instanceof Array ? value : [value];
}
function normalizeValues(values) {
    return arraylize(values)
        .filter(value => value !== undefined && value !== null && `${value}` !== '')
        .map(value => `${value}`);
}
function countValues(items, property) {
    const counts = {};
    for (const item of items) {
        for (const value of property.getValues(item)) {
            counts[value] = (counts[value] || 0) + 1;
        }
    }
    return counts;
}
function sortedKeysByCount(counts) {
    return Object.keys(counts).sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b));
}
function injectPropertyFilterStyles() {
    const styleId = 'uu-property-filter-styles';
    if (document.getElementById(styleId))
        return;
    const style = createElement(document.head, 'style', [], '', {}, { id: styleId });
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
            cursor: pointer;
            align-self: stretch;
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
    `;
}
function loadState(stateKey) {
    if (!stateKey)
        return { properties: [], filters: {} };
    try {
        const parsed = JSON.parse(localStorage.getItem(stateKey) || '{}');
        const filters = parsed.filters || {};
        const properties = parsed.properties || Object.keys(filters).filter(property => filters[property]?.length > 0);
        return { properties, filters };
    }
    catch {
        return { properties: [], filters: {} };
    }
}
export class PropertyFilter {
    stateKey;
    root;
    items;
    availablePropertyNames;
    state;
    maxInlineValues;
    onChange;
    valueGetters;
    constructor(parent, items, stateKey, options = {}) {
        this.stateKey = stateKey;
        injectPropertyFilterStyles();
        this.items = items;
        this.availablePropertyNames = tu.dataProperties(items);
        this.state = loadState(stateKey);
        this.maxInlineValues = options.maxInlineValues ?? 20;
        this.onChange = options.onChange;
        this.valueGetters = options.valueGetters || {};
        this.root = createElement(parent, 'div', ['property-filters']);
        this.cleanupState();
        this.render();
    }
    reset() {
        this.state.filters = {};
        this.saveState();
        this.render();
    }
    setItems(items) {
        this.items = items;
        const propertyNames = tu.dataProperties(items);
        this.availablePropertyNames = [...new Set([...this.availablePropertyNames, ...propertyNames])];
        this.render();
    }
    getFilteredItems(items = this.items) {
        return this.applyFiltersExcept(items);
    }
    getSummary() {
        return this.state.properties
            .map(property => [property, this.getSelectedValues(property)])
            .filter(([, values]) => values.length > 0)
            .map(([property, values]) => `${property}: ${values.join('+')}`);
    }
    getState() {
        return this.state;
    }
    normalizeProperty(property) {
        const getValues = this.valueGetters[property];
        return {
            name: property,
            getValues: item => normalizeValues(getValues ? getValues(item) : item[property])
        };
    }
    cleanupState() {
        const knownProperties = new Set(this.availablePropertyNames);
        this.state.properties = this.state.properties.filter(property => knownProperties.has(property));
        for (const property of Object.keys(this.state.filters)) {
            if (!knownProperties.has(property))
                delete this.state.filters[property];
        }
    }
    saveState() {
        if (!this.stateKey)
            return;
        localStorage.setItem(this.stateKey, JSON.stringify(this.state));
    }
    getSelectedValues(propertyName) {
        return this.state.filters[propertyName] || [];
    }
    propertyMatches(item, property, selectedValues) {
        if (selectedValues.length === 0)
            return true;
        const itemValues = property.getValues(item);
        return selectedValues.some(value => itemValues.includes(value));
    }
    applyFiltersExcept(items, skippedProperty) {
        return items.filter(item => {
            return this.state.properties.map(property => this.normalizeProperty(property)).every(property => {
                if (property.name === skippedProperty)
                    return true;
                return this.propertyMatches(item, property, this.getSelectedValues(property.name));
            });
        });
    }
    allPropertyValues(property) {
        return sortedKeysByCount(countValues(this.items, property));
    }
    sortPropertyValues(values, selectedValues, counts, sort = 'count', selectedFirst = true) {
        return [...values].sort((a, b) => {
            const aSelected = selectedValues.includes(a);
            const bSelected = selectedValues.includes(b);
            if (selectedFirst && aSelected !== bSelected)
                return aSelected ? -1 : 1;
            if (sort === 'value-asc')
                return a.localeCompare(b);
            if (sort === 'value-desc')
                return b.localeCompare(a);
            return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b);
        });
    }
    async emitChange() {
        this.saveState();
        await this.onChange?.(this);
    }
    async selectProperties() {
        const propertyOptions = this.availablePropertyNames.map(propertyName => ({
            value: propertyName,
            comment: `${this.allPropertyValues(this.normalizeProperty(propertyName)).length}`
        }));
        const properties = await showSelection('Select Filter Properties', propertyOptions, {
            initialSelection: this.state.properties,
            showOrder: true
        });
        if (properties === undefined)
            return;
        const selected = new Set(properties);
        for (const property of Object.keys(this.state.filters)) {
            if (!selected.has(property))
                delete this.state.filters[property];
        }
        this.state.properties = properties;
        this.render();
        await this.emitChange();
    }
    clearProperty(propertyName) {
        this.state.filters[propertyName] = [];
    }
    toggleValue(propertyName, value) {
        const selectedValues = this.state.filters[propertyName] ||= [];
        const index = selectedValues.indexOf(value);
        if (index >= 0) {
            selectedValues.splice(index, 1);
        }
        else {
            selectedValues.push(value);
        }
    }
    renderValues(container, property, values, limit, sort = 'count', onSelectionChange, selectedFirst = true) {
        container.replaceChildren();
        const selectedValues = this.getSelectedValues(property.name);
        const countItems = this.applyFiltersExcept(this.items, property.name);
        const counts = countValues(countItems, property);
        const sortedValues = this.sortPropertyValues(values, selectedValues, counts, sort, selectedFirst);
        const nonZeroValues = sortedValues.filter(value => (counts[value] || 0) > 0);
        const visibleValues = limit ? nonZeroValues.slice(0, limit) : nonZeroValues;
        const allButton = createElement(container, 'span', ['property-filter-value', 'me-1', 'mb-1'], `All (${countItems.length})`);
        allButton.classList.toggle('selected', selectedValues.length === 0);
        allButton.onclick = async () => {
            this.clearProperty(property.name);
            this.render();
            onSelectionChange?.();
            await this.emitChange();
        };
        for (const value of visibleValues) {
            const button = createElement(container, 'span', ['property-filter-value', 'me-1', 'mb-1'], `${value} (${counts[value] || 0})`);
            button.classList.toggle('selected', selectedValues.includes(value));
            button.onclick = async () => {
                this.toggleValue(property.name, value);
                this.render();
                onSelectionChange?.();
                await this.emitChange();
            };
        }
        if (limit && nonZeroValues.length > limit) {
            const moreButton = createElement(container, 'span', ['property-filter-value', 'me-1', 'mb-1'], '...');
            moreButton.onclick = () => this.showAllValuesDialog(property, values);
        }
    }
    showAllValuesDialog(property, values) {
        const content = createElement(null, 'div', ['property-filter-dialog']);
        const toolbar = createElement(content, 'div', ['btn-group', 'mb-2']);
        const valuesArea = createElement(content, 'div');
        const countButton = createElement(toolbar, 'button', ['btn', 'btn-sm', 'btn-outline-secondary'], 'Sort by Count');
        const valueAscButton = createElement(toolbar, 'button', ['btn', 'btn-sm', 'btn-outline-secondary'], 'Sort by Value (Asc)');
        const valueDescButton = createElement(toolbar, 'button', ['btn', 'btn-sm', 'btn-outline-secondary'], 'Sort by Value (Desc)');
        let sort = 'count';
        const render = () => {
            countButton.classList.toggle('active', sort === 'count');
            valueAscButton.classList.toggle('active', sort === 'value-asc');
            valueDescButton.classList.toggle('active', sort === 'value-desc');
            this.renderValues(valuesArea, property, values, undefined, sort, render, false);
        };
        countButton.onclick = () => {
            sort = 'count';
            render();
        };
        valueAscButton.onclick = () => {
            sort = 'value-asc';
            render();
        };
        valueDescButton.onclick = () => {
            sort = 'value-desc';
            render();
        };
        render();
        showDialog(`Filter ${property.name}`, content, { actions: ['Close'] });
    }
    render() {
        this.root.replaceChildren();
        this.cleanupState();
        if (this.state.properties.length === 0) {
            const selectButton = createElement(this.root, 'button', ['btn', 'btn-outline-secondary'], 'Select Filter Properties');
            selectButton.onclick = () => this.selectProperties();
            return;
        }
        for (const propertyName of this.state.properties) {
            const property = this.normalizeProperty(propertyName);
            const row = createElement(this.root, 'div', ['property-filter-row', 'd-flex', 'align-items-start', 'mb-1']);
            const propertyNameElement = createElement(row, 'div', ['property-filter-name', 'me-2'], property.name);
            propertyNameElement.title = 'Select and reorder filter properties';
            propertyNameElement.onclick = () => this.selectProperties();
            const valuesArea = createElement(row, 'div', ['property-filter-values', 'd-flex', 'flex-wrap']);
            this.renderValues(valuesArea, property, this.allPropertyValues(property), this.maxInlineValues);
        }
    }
}
