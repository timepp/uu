import * as uu from '../src/uu.ts'

function createWindowTable() {
    const str = uu.stringify(window)
    const newWindow = JSON.parse(str)

    const arr = Object.entries(newWindow).map(([k, v]) => {
        return {key: k, value: v, type: typeof v}
    })

    const e = uu.visualizeArray(arr, {
        stateKey: 'windowTable', 
        pageSize: 10,
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