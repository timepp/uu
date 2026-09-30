import * as uu from '../src/uu.ts'

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

uu.createFoldableArea(document.body, 'Load More Table', createLoadMoreTable())
uu.createFoldableArea(document.body, 'Window Table', createWindowTable())