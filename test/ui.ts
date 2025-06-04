import * as uu from '../uu.ts'

const div = uu.createElement(document.body, 'div', [], 'Hello, world!', {color: 'red'})
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
// document.body.appendChild(jv)

const arr = Object.entries(window).map(([k, v]) => {
    return {key: k, value: v, type: typeof v}
})

const e = uu.createTableFromArray(arr, {
    stateKey: 'windowTable', 
    rawIndexColumn: '#', 
    pageSize: 10,
    onCellClick: (item, prop) => {
        if (prop === 'value') {
            const value = item.value
            const text = JSON.stringify(value, uu.getStringifyReplacer({maxStringLength: 10}), 2)
            uu.showInDialog(`window.${item.key}`, uu.createJsonView(text))
        }
    }
})

document.body.appendChild(e)