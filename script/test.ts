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
            r1: {r2: "r4"}
        }
    }
    
    const arr: any[] = []
    uu.traverseObject(data, (key, value, isLeaf) => arr.push([isLeaf, key, value]))
    ut.assertEquals(JSON.stringify(arr), `[[false,[],{"name":"test","age":30,"hobbies":["reading","gaming"],"address":{"city":"New York","zip":"10001","r1":{"r2":"r4"}}}],[true,["name"],"test"],[true,["age"],30],[false,["hobbies"],["reading","gaming"]],[true,["hobbies","0"],"reading"],[true,["hobbies","1"],"gaming"],[false,["address"],{"city":"New York","zip":"10001","r1":{"r2":"r4"}}],[true,["address","city"],"New York"],[true,["address","zip"],"10001"],[false,["address","r1"],{"r2":"r4"}],[true,["address","r1","r2"],"r4"]]`)
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

    const json = `{"name":"value\\"ccc\\"89"}`
    console.log(json)
    const result2 = uu.highlightJson(json)
    result2.forEach(v => console.log(v.content, v.category))
})

Deno.test('derivedUrl', async () => {
    const url = 'https://example.com/path?name=value&age=30&extra=extra'
    const paramsToAdd = { name: 'newValue', newParam: 'newValue' }
    const paramsToRemove = /age|extra/
    const newUrl = uu.derivedUrl(url, paramsToAdd, paramsToRemove)
    console.log(newUrl)
    ut.assertEquals(newUrl, 'https://example.com/path?name=newValue&newParam=newValue')
})
