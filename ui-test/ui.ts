import * as uu from '../src/uu.ts'
import { demoItems, type DemoItem } from './demo-data.ts'

function createTestImageUrl(label: string) {
    const width = Math.floor(Math.random() * 481) + 160
    const height = Math.floor(Math.random() * 381) + 100
    const hue = Math.floor(Math.random() * 360)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="hsl(${hue} 65% 55%)"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="24">${width} x ${height}</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16">${label}</text></svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createWindowTable() {
    const str = uu.stringify(window)
    const newWindow = JSON.parse(str)
    const imageUrls = new WeakMap<object, string>()

    const arr = Object.entries(newWindow).map(([k, v]) => {
        const item = {key: k, value: v, type: typeof v}
        imageUrls.set(item, createTestImageUrl(k))
        return item
    })

    const e = uu.visualizeArray(arr, {
        stateKey: 'windowTable', 
        pageSize: 10,
        tileRenderOption: {
            header: item => {
                const img = document.createElement('img')
                img.src = imageUrls.get(item) || ''
                img.loading = 'lazy'
                img.style.width = '100%'
                img.style.height = 'auto'
                img.style.display = 'block'
                img.style.maxHeight = '200px'
                return img
            },
            hidePropName: true
        },
        wallRenderOption: {
            imageUrl: item => imageUrls.get(item) || ''
        },
        itemActions: {
            ExceptionTest: async (item, index) => {
                throw new Error(`Exception test for item at index ${index}`)
            }
        }
    })

    return e
}

function createLoadMoreTable() {
    const arr = [
        {key: 'item1', value: 'value1', type: 'string'},
        {key: 'item2', value: 'value2', type: 'string'},
        {key: 'item3', value: 'value3', type: 'string'}
    ]
    let total = 3
    const e = uu.visualizeArray(arr, {
        stateKey: 'loadMoreTable',
        pageSize: 20,
        loadMore: () => {
            return new Promise(resolve => {
                if (total >= 10) {
                    resolve([])
                    return
                }
                setTimeout(() => {
                    const newItems = [
                        {key: `item${total + 1}`, value: `value${total + 1}`, type: 'string'},
                        {key: `item${total + 2}`, value: `value${total + 2}`, type: 'string'}
                    ]
                    total += newItems.length
                    resolve(newItems)
                }, 1000)
            })
        }
    })

    return e
}

function createShowcase() {
    const root = uu.createElement(null, 'div', ['uu-demo'])
    uu.createElement(root, 'p', ['text-muted'], '36 synthetic products; 24 initially loaded. All data is fixed, and preview images are generated locally.')
    const guide = uu.createElement(root, 'ul', ['small'])
    for (const text of [
        'Filter category, status, shipping.region, and tags. Ctrl-click adds values; All clears a row. Hidden columns can still filter.',
        'Try text search "eco", or expressions: price > 50 && featured, shipping.region === "North", tags.includes("gift"). Press Enter to apply.',
        'Switch table / tile / wall; click sortable headers, choose columns, change page size, or open Charts for price, rating, dates, booleans, and colors.',
        'Select items with checkboxes or Ctrl-click. The options menu offers comparison, selection summaries, and JSON export. Hover and press F to open it; use Sort for random ordering.',
        'Select description to try folded text, currency to see a uniform field, and ["shipping.region"] to contrast a literal dotted key with shipping.region.',
        'Use + to load six more items at a time. Recreate the view or reload the page to restore saved settings; Reset affects only this demo.',
    ]) uu.createElement(guide, 'li', [], text)

    const statusColors: Record<DemoItem['status'], string> = {
        draft: '#6c757d', active: '#198754', 'low-stock': '#b66b00', archived: '#dc3545',
    }
    root.appendChild(uu.createSizeBar(null, Object.entries(statusColors).map(([name, color]) => ({
        name, color, value: demoItems.filter(item => item.status === name).length,
    })), 'products'))
    const controls = uu.createElement(root, 'div', ['d-flex', 'gap-2', 'my-2'])
    const feedback = uu.createElement(root, 'div', ['alert', 'alert-secondary', 'small'], 'Click a product name or use a selection action to see feedback.')
    feedback.setAttribute('role', 'status')
    feedback.setAttribute('aria-live', 'polite')
    const host = uu.createElement(root, 'div', ['uu-demo-view'])
    const stateKey = 'uu-feature-demo'
    const imageUrls = new Map<string, string>()
    function imageUrl(item: DemoItem) {
        let url = imageUrls.get(item.id)
        if (!url) {
            url = createTestImageUrl(item.id)
            imageUrls.set(item.id, url)
        }
        return url
    }
    function render() {
        const items = demoItems.slice(0, 24)
        let loaded = items.length
        const view = uu.visualizeArray(items, {
            stateKey,
            pageSize: 6,
            flattenNestedObjects: true,
            initialFilterProps: ['category', 'status', 'shipping.region', 'tags'],
            stringFoldThreshold: 70,
            sortBy: [{ prop: 'status', order: 'asc' }, { prop: 'price', order: 'desc' }],
            getSortingValue: (item, prop) => prop === 'status'
                ? ['active', 'low-stock', 'draft', 'archived'].indexOf(item.status)
                : undefined,
            renderOption: {
                propOptions: {
                    name: {
                        onClick: item => {
                            feedback.textContent = `${item.id}: ${item.name}; ${item.shipping.region}; stock ${item.stock}.`
                            return true
                        },
                    },
                    price: { formatter: item => `$${item.price.toFixed(2)}`, style: { textAlign: 'right', whiteSpace: 'nowrap' } },
                    status: {
                        formatter: item => uu.createElement(null, 'span', ['badge'], item.status, { backgroundColor: statusColors[item.status] }),
                    },
                    featured: { formatter: item => item.featured ? 'Yes' : 'No' },
                    color: {
                        formatter: item => uu.createElement(null, 'span', ['badge'], item.color, { backgroundColor: item.color }),
                    },
                },
            },
            tableRenderOption: { props: ['name', 'category', 'status', 'price', 'stock', 'shipping.region', 'tags', 'featured'] },
            tileRenderOption: {
                props: ['name', 'status', 'price', 'rating', 'tags'],
                header: item => uu.createElement(null, 'img', [], undefined, {
                    width: '100%', height: '160px', objectFit: 'cover',
                }, { src: imageUrl(item), alt: item.name, loading: 'lazy' }),
            },
            wallRenderOption: {
                props: ['name', 'price', 'status'],
                imageUrl,
                imageWidth: '220px',
                rowGap: '10px',
            },
            itemActions: (item: DemoItem) => ({
                Inspect: () => { void uu.showDialog(item.name, uu.visualizeObject(item), { actions: ['Close'] }) },
            }),
            multiItemActions: {
                'Selection Summary': selected => {
                    feedback.textContent = `${selected.length} selected: ${selected.map(item => item.id).join(', ')}; combined price $${selected.reduce((sum, item) => sum + item.price, 0).toFixed(2)}.`
                },
                'Export Selected JSON': selected => uu.triggerDownload(selected, 'uu-demo-selection.json'),
            },
            onPropertyValueClick: (property, value) => {
                feedback.textContent = `Chart value clicked: ${property} = ${value}.`
            },
            loadMore: async () => {
                const next = demoItems.slice(loaded, loaded + 6)
                loaded += next.length
                feedback.textContent = next.length ? `Loaded ${loaded} / ${demoItems.length} products.` : 'All 36 products are loaded.'
                return next
            },
        })
        host.replaceChildren(view)
    }
    uu.createButton(controls, ['btn-outline-secondary'], 'Recreate view (restore settings)', render)
    uu.createButton(controls, ['btn-outline-danger'], 'Reset demo settings', () => {
        localStorage.removeItem(stateKey)
        localStorage.removeItem(`${stateKey}:property-filter`)
        feedback.textContent = 'Demo settings reset.'
        render()
    })
    render()
    return root
}

uu.createFoldableArea(document.body, 'UU Feature Showcase', createShowcase, false)
uu.createFoldableArea(document.body, 'Load More Table', createLoadMoreTable())
uu.createFoldableArea(document.body, 'Window Table', createWindowTable())