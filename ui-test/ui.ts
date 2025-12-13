import * as uu from '../src/uu.ts'

const data = {
    name: 'test',
    age: 30,
    isMale: true,
    isStudent: false,
    hobbies: ['reading', 'gaming'],
    comments: "I like the book \"the 3 body problem\" very much!",
    address: {
        city: 'New York',
        zip: null,
        r1: {r2: "r4"}
    }
}
const jv = uu.createJsonView(JSON.stringify(data, null, 2))
const hr = uu.createElement(null, 'hr')
const wv = uu.createJsonView(uu.stringify(window, 2).str)
document.body.append(jv, hr, wv)

// const arr = Object.entries(window).map(([k, v]) => {
//     return {key: k, value: v, type: typeof v}
// })

// const e = uu.visualizeArray(arr, {
//     stateKey: 'windowTable', 
//     rawIndexColumn: '#', 
//     pageSize: 10,
//     onCellClick: (item, prop) => {
//         if (prop === 'value') {
//             const value = item.value
//             const text = uu.stringify(value, 2).str
//             uu.showJsonResult('value', text)
//         }
//     }
// })

// document.body.appendChild(e)