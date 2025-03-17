import * as uu from '../uu.ts'
import * as ut from 'jsr:@std/assert@1.0.2'

Deno.test('object traverse', async () => {
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
    
    const arr: any[] = []
    uu.traverseObject(data, (path, value, type) => arr.push([path, value, type]))
    // filter out the object nodes
    const leafs = arr.filter(v => v[2] === 'leaf')
    ut.assertEquals(JSON.stringify(leafs), `[[["name"],"test","leaf"],[["age"],30,"leaf"],[["hobbies","0"],"reading","leaf"],[["hobbies","1"],"gaming","leaf"],[["address","city"],"New York","leaf"],[["address","zip"],"10001","leaf"],[["address","r1","r2"],"r4","leaf"]]`)

    const objectPaths = arr.filter(v => v[2] === 'object').map(v => v[0])
    ut.assertEquals(objectPaths, [[], ["hobbies"], ["address"], ["address", "r1"]])

    const loopPaths = arr.filter(v => v[2] === 'loop').map(v => v[0])
    ut.assertEquals(loopPaths, [["address", "recursive"]])
})

Deno.test('data format', async () => {
    const d = new Date('2023-10-01T12:34:56Z')
    ut.assertEquals(uu.formatTime(d, 0), '2023-10-01 12:34:56')
    ut.assertEquals(uu.formatTime(d, -480), '2023-10-01 20:34:56')
    ut.assertEquals(uu.formatTime(d, 480), '2023-10-01 04:34:56')
    ut.assertEquals(uu.formatFloat(1234.56789), '1234.57')
    ut.assertEquals(uu.formatFloat(1234.56789, 3), '1234.568')
    ut.assertEquals(uu.formatFloat(1234.00000, 3, 1), '1234.0')
})

Deno.test('highLight', async () => {
    const text = `{"name": "value3389"}`

    const result1 = uu.highLight(text, [[/"[^"]+":/g, 'key'], [/"[^"]+"/g, 'string'], [/\d+/g, 'number']])
    console.log(result1)
    ut.assertEquals(result1, [
        { category: '', content: '{' },
        { category: 'key', content: '"name":' },
        { category: '', content: ' ' },
        { category: 'string', content: '"value3389"' },
        { category: '', content: '}' }
    ])
})

Deno.test('derivedUrl', async () => {
    const url = 'https://example.com/path?name=value&age=30&extra=extra'
    const paramsToAdd = { name: 'newValue', newParam: 'newValue' }
    const paramsToRemove = /age|extra/
    const newUrl = uu.derivedUrl(url, paramsToAdd, paramsToRemove)
    ut.assertEquals(newUrl, 'https://example.com/path?name=newValue&newParam=newValue')
})
