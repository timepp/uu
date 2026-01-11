import * as uu from '../src/uu.ts'

const ig = uu.createDataArea(document.body, [
    // { name: 'Filter', valueId: 'filter' },
    // { name: 'File', onClick: (params) => {}},
    { name: 'Sort By', valueId: 'sortBy' },
    { name: 'Apply', onClick: (params) => {
        return uu.createCodeMirrorJsonViewer(params)
    }}
])

const arr = Object.entries(window).map(([k, v]) => {
    return {key: k, value: v, type: typeof v}
})

const e = uu.visualizeArray(arr, {
    stateKey: 'windowTable', 
    rawIndexColumn: '#', 
    pageSize: 10,
    onCellClick: (item, prop) => {
        if (prop === 'value') {
            const value = item.value
            const text = uu.stringify(value, 2)
            uu.showJsonResult('value', text)
        }
    }
})

document.body.appendChild(e)