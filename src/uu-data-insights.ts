import * as tu from './tu.ts'
import { createElement, getStringColor, syncDisplay } from './uu-dom.ts'
import { createChart } from './uu-media.ts'

export type DataType = 'integer' | 'float' | 'boolean' | 'date' | 'colorName' | 'general'

export function guessDataType(data: string | string[]): DataType {
    if (Array.isArray(data)) {
        const groups = tu.groupBy(data.map(guessDataType), type => type)
        return groups.length > 0 && groups[0][1].length / data.length >= 0.8 ? groups[0][0] as DataType : 'general'
    }
    if (!isNaN(Number(data))) return data.includes('.') ? 'float' : 'integer'
    const lower = data.toLowerCase()
    if (lower === 'true' || lower === 'false') return 'boolean'
    const colors = ['red', 'green', 'blue', 'yellow', 'black', 'white', 'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'cyan', 'magenta', 'lime', 'teal', 'navy', 'maroon', 'olive', 'silver', 'gold']
    if (colors.includes(lower)) return 'colorName'
    if (!isNaN(new Date(data).getTime())) return 'date'
    return 'general'
}

export type DataInsightValueClickCallback = (propertyName: string, propertyValue: string) => void

type InsightValue = { value: string, count: number, _sortValue?: number }
type DateUnit = 'original' | 'minute' | 'hour' | 'day' | 'month' | 'year'

function decimalPlaces(value: number) {
    const match = `${value}`.match(/(?:\.(\d+))?(?:e-(\d+))?$/i)
    return (match?.[1]?.length || 0) + Number(match?.[2] || 0)
}

function aggregateNumeric(values: InsightValue[], unit: number) {
    if (!Number.isFinite(unit) || unit <= 0) return values.map(value => ({...value, _sortValue: Number(value.value)}))
    const places = decimalPlaces(unit)
    const round = (value: number) => Math.round((value + Number.EPSILON) * 10 ** places) / 10 ** places
    const buckets = new Map<number, number>()
    for (const item of values) {
        const value = Number(item.value)
        if (!Number.isFinite(value)) continue
        const bucket = round(Math.floor(value / unit) * unit)
        buckets.set(bucket, (buckets.get(bucket) || 0) + item.count)
    }
    return [...buckets].map(([bucket, count]) => ({
        value: unit === 1 ? `${bucket}` : `${bucket} ~ ${round(bucket + unit)}`,
        count,
        _sortValue: bucket
    }))
}

function floorDate(date: Date, unit: Exclude<DateUnit, 'original'>) {
    const result = new Date(date)
    result.setSeconds(0, 0)
    if (unit === 'minute') return result
    result.setMinutes(0)
    if (unit === 'hour') return result
    result.setHours(0)
    if (unit === 'day') return result
    result.setDate(1)
    if (unit === 'month') return result
    result.setMonth(0)
    return result
}

function dateLabel(time: number, unit: Exclude<DateUnit, 'original'>) {
    const date = new Date(time)
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    if (unit === 'year') return `${year}`
    if (unit === 'month') return `${year}-${month}`
    if (unit === 'day') return `${year}-${month}-${day}`
    if (unit === 'hour') return `${year}-${month}-${day} ${hour}:00`
    return `${year}-${month}-${day} ${hour}:${minute}`
}

function aggregateDate(values: InsightValue[], unit: DateUnit) {
    if (unit === 'original') return values.map(value => ({...value, _sortValue: new Date(value.value).getTime()}))
    const buckets = new Map<number, number>()
    for (const item of values) {
        const time = new Date(item.value).getTime()
        if (!Number.isFinite(time)) continue
        const bucket = floorDate(new Date(time), unit).getTime()
        buckets.set(bucket, (buckets.get(bucket) || 0) + item.count)
    }
    return [...buckets].map(([bucket, count]) => ({value: dateLabel(bucket, unit), count, _sortValue: bucket}))
}

export async function renderDataInsights(info: tu.DataPropStat[], onPropertyValueClick?: DataInsightValueClickCallback): Promise<HTMLDivElement> {
    const root = createElement(null, 'div')
    const controls = createElement(root, 'div', ['d-flex', 'flex-wrap', 'gap-2', 'align-items-end', 'mb-2'])
    const chartHost = createElement(root, 'div', ['border', 'border-light-subtle', 'rounded', 'p-2'])
    const chartHeader = createElement(chartHost, 'div', ['d-flex', 'justify-content-between', 'align-items-center', 'mb-2'])
    const title = createElement(chartHeader, 'h6', ['m-0'], 'Data insights')
    const subtitle = createElement(chartHeader, 'small', ['text-muted'])
    const chartBody = createElement(chartHost, 'div')
    if (info.length === 0) {
        createElement(chartBody, 'div', ['text-muted'], 'No data insights available.')
        return root
    }

    const addSelect = (label: string, options: [string, string][]) => {
        const group = createElement(controls, 'div')
        createElement(group, 'label', ['form-label', 'mb-1'], label)
        const select = createElement(group, 'select', ['form-select'])
        for (const [text, value] of options) createElement(select, 'option', [], text, {}, {value})
        return select
    }
    const propertySelect = addSelect('Property', info.map(stat => stat.propName).sort().map(value => [value, value]))
    const chartTypeSelect = addSelect('Chart type', [['Bar chart', 'bar'], ['Line chart', 'line'], ['Pie chart', 'pie'], ['Doughnut chart', 'doughnut'], ['Polar area chart', 'polarArea'], ['Text Summary', 'text']])
    const sortSelect = addSelect('Sort by', [['Count (desc)', 'count'], ['Value (asc)', 'value']])

    const binGroup = createElement(controls, 'div')
    const binLabel = createElement(binGroup, 'label', ['form-label', 'mb-1'], 'Bin size')
    const binInput = createElement(binGroup, 'input', ['form-control'], '', {}, {type: 'number', step: 'any', value: 0})
    const dateBinSelect = createElement(binGroup, 'select', ['form-select'], '', {display: 'none'})
    for (const [text, value] of [['Original', 'original'], ['Minute', 'minute'], ['Hour', 'hour'], ['Day', 'day'], ['Month', 'month'], ['Year', 'year']]) {
        createElement(dateBinSelect, 'option', [], text, {}, {value})
    }
    const addCountInput = (label: string, placeholder: string) => {
        const group = createElement(controls, 'div')
        createElement(group, 'label', ['form-label', 'mb-1'], label)
        const input = createElement(group, 'input', ['form-control'], '', {}, {type: 'number', min: 0, step: 1, value: ''})
        input.placeholder = placeholder
        return input
    }
    const hideAboveInput = addCountInput('Hide count >', 'No limit')
    const hideBelowInput = addCountInput('Hide count <', 'No limit')
    let currentChart: any = null

    async function render() {
        const stat = info.find(item => item.propName === propertySelect.value) || info[0]
        const dataType = guessDataType(stat.uniqueValues.map(value => value.value || ''))
        const color = dataType === 'colorName' ? (value: string) => value : (value: string) => getStringColor(value, 100, 40)
        binLabel.textContent = dataType === 'date' ? 'Date bin size' : 'Bin size'
        syncDisplay(dateBinSelect, dataType === 'date')
        syncDisplay(binInput, dataType === 'integer' || dataType === 'float')
        let values: InsightValue[] = [...stat.uniqueValues]
        if (dataType === 'date') values = aggregateDate(values, (dateBinSelect.value || 'day') as DateUnit)
        else if (dataType === 'integer' || dataType === 'float') values = aggregateNumeric(values, Number(binInput.value))
        const beforeFilter = values.length
        const below = Number(hideBelowInput.value)
        const above = Number(hideAboveInput.value)
        if (hideBelowInput.value.trim() && Number.isFinite(below) && below >= 0) values = values.filter(value => value.count >= below)
        if (hideAboveInput.value.trim() && Number.isFinite(above) && above >= 0) values = values.filter(value => value.count <= above)
        if (sortSelect.value === 'value') {
            values.sort(dataType === 'integer' || dataType === 'float' || dataType === 'date'
                ? (left, right) => (left._sortValue || 0) - (right._sortValue || 0)
                : (left, right) => left.value.localeCompare(right.value))
        } else values.sort((left, right) => right.count - left.count)
        title.textContent = `Group by "${stat.propName}"`
        subtitle.textContent = `${values.length} categories${values.length !== beforeFilter ? ` (filtered from ${beforeFilter})` : ''}`
        chartBody.replaceChildren()
        currentChart?.destroy?.()
        currentChart = null
        if (values.length === 0) {
            createElement(chartBody, 'div', ['text-muted'], 'No values to display with current filters.')
            return
        }
        if (chartTypeSelect.value === 'text') {
            const summary = createElement(chartBody, 'div', ['d-flex', 'flex-wrap', 'gap-1'])
            for (const item of values) {
                const value = item.value || '(empty)'
                const entry = createElement(summary, 'span', ['border', 'rounded', 'p-1', 'hover-effect'], '', {cursor: onPropertyValueClick ? 'pointer' : 'default'})
                createElement(entry, 'span', ['fw-bold'], value, {color: color(value)})
                createElement(entry, 'span', ['text-muted'], ` (${item.count})`)
                entry.onclick = () => onPropertyValueClick?.(stat.propName, item.value)
            }
            return
        }
        const {chart} = await createChart(chartBody, `${Math.max(500, values.length * 55)}px`, '420px', {
            type: chartTypeSelect.value,
            options: {
                responsive: true, maintainAspectRatio: false,
                onClick: (_event: unknown, elements: {index: number}[]) => {
                    const item = values[elements[0]?.index]
                    if (item) onPropertyValueClick?.(stat.propName, item.value)
                },
                onHover: (event: {native?: MouseEvent}, elements: unknown[]) => {
                    const target = event.native?.target as HTMLElement | undefined
                    if (target) target.style.cursor = elements.length ? 'pointer' : 'default'
                },
                plugins: {legend: {display: false}}
            },
            data: {
                labels: values.map(value => value.value || '(empty)'),
                datasets: [{label: stat.propName, data: values.map(value => value.count), backgroundColor: values.map(value => color(value.value))}]
            }
        })
        currentChart = chart
    }
    propertySelect.onchange = render
    chartTypeSelect.onchange = render
    sortSelect.onchange = render
    hideBelowInput.oninput = render
    hideAboveInput.oninput = render
    binInput.oninput = render
    dateBinSelect.onchange = render
    await render()
    return root
}