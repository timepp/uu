import * as tu from '../src/tu.ts'
import * as ut from 'jsr:@std/assert@1.0.2'

Deno.test('object traverse', () => {
    const data = {
        name: 'test',
        age: 30,
        hobbies: ['reading', 'gaming'],
        address: {
            city: 'New York',
            zip: '10001',
            r1: {r2: "r4"},
            recursive: {}
        }
    }
    data.address.recursive = data.address // Creating a recursive reference
    
    const arr: [string[], unknown, string][] = []
    tu.traverseObject(data, -1, (path, value, type) => arr.push([path, value, type]))
    // filter out the object nodes
    const leafs = arr.filter(v => v[2] === 'leaf')
    ut.assertEquals(JSON.stringify(leafs), `[[["name"],"test","leaf"],[["age"],30,"leaf"],[["hobbies","0"],"reading","leaf"],[["hobbies","1"],"gaming","leaf"],[["address","city"],"New York","leaf"],[["address","zip"],"10001","leaf"],[["address","r1","r2"],"r4","leaf"]]`)

    const objectPaths = arr.filter(v => v[2] === 'object').map(v => v[0])
    ut.assertEquals(objectPaths, [[], ["hobbies"], ["address"], ["address", "r1"]])

    const loopPaths = arr.filter(v => v[2] === 'loop').map(v => v[0])
    ut.assertEquals(loopPaths, [["address", "recursive"]])
})

Deno.test('stringify', () => {
    ut.assertEquals(tu.stringify(1), '1')
    ut.assertEquals(tu.stringify("test"), `"test"`)
    ut.assertEquals(tu.stringify([1, 2, 3]), `[1,2,3]`)
    ut.assertEquals(tu.stringify({}), `{}`)
    ut.assertEquals(tu.safeStringify({}, 2, Infinity, Infinity, false).str, `{}`)
    const obj2 = {
        name: 'test', 
        v: {x: 100, y: {}}
    }
    obj2.v.y = obj2
    // console.log(JSON.stringify(obj2))
    ut.assertEquals(tu.stringify(obj2), `{"name":"test","v":{"x":100,"y":"<<circular ref to the root object>>"}}`)
})

Deno.test('data format', () => {
    const d = new Date('2023-10-01T12:34:56Z')
    ut.assertEquals(tu.formatTime(d, 0), '2023-10-01 12:34:56')
    ut.assertEquals(tu.formatTime(d, -480), '2023-10-01 20:34:56')
    ut.assertEquals(tu.formatTime(d, 480), '2023-10-01 04:34:56')
    ut.assertEquals(tu.formatFloat(1234.56789), '1234.57')
    ut.assertEquals(tu.formatFloat(1234.56789, 3), '1234.568')
    ut.assertEquals(tu.formatFloat(1234.00000, 3, 1), '1234.0')
})

Deno.test('highLight', () => {
    const text = `{"name": "value3389"}`

    const result1 = tu.segmentByRegex(text, [[/"[^"]+":/g, 'key'], [/"[^"]+"/g, 'string'], [/\d+/g, 'number']])
    console.log(result1)
    ut.assertEquals(result1, [
        { category: '', content: '{' },
        { category: 'key', content: '"name":' },
        { category: '', content: ' ' },
        { category: 'string', content: '"value3389"' },
        { category: '', content: '}' }
    ])
})

Deno.test('derivedUrl', () => {
    const url = 'https://example.com/path?name=value&age=30&extra=extra'
    const paramsToAdd = { name: 'newValue', newParam: 'newValue' }
    const paramsToRemove = /age|extra/
    const newUrl = tu.derivedUrl(url, paramsToAdd, paramsToRemove)
    ut.assertEquals(newUrl, 'https://example.com/path?name=newValue&newParam=newValue')
})

Deno.test('indention', () => {
    ut.assertEquals(tu.getIndention('   fire'), 3)
    ut.assertEquals(tu.indentTextWithSpaces('fire', 4), '    fire')
    ut.assertEquals(tu.unIndentTextWithSpaces('   fire', 4), 'fire')
    ut.assertEquals(tu.unIndentTextWithSpaces('   fire', 3), 'fire')
    ut.assertEquals(tu.unIndentTextWithSpaces('   fire', 2), ' fire')
    ut.assertEquals(tu.trimEmptyLines(' \n\n  fire\n\n', 'head'), '  fire\n\n')
    ut.assertEquals(tu.trimEmptyLines(' \n\n  fire\n\n', 'tail'), ' \n\n  fire')
})

Deno.test('hash', async () => {
    console.log('hash of "hello":', tu.simpleHash('hello'))
    console.log('hash of "world":', await tu.hash('world'))
})