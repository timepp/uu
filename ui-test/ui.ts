import * as uu from '../src/uu.ts'

const str = uu.stringify(window)
const newWindow = JSON.parse(str)

const arr = Object.entries(newWindow).map(([k, v]) => {
    return {key: k, value: v, type: typeof v}
})

const e = uu.visualizeArray(arr, {
    stateKey: 'windowTable', 
    pageSize: 10,
})

document.body.appendChild(e)