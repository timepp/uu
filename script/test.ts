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
    // ut.assertEquals(tu.stringify(obj2), `{"name":"test","v":{"x":100,"y":"<<circular ref to the root object>>"}}`)

    const obj3 = {
        name: 'wang',
        age: 40,
        hobbies: ['reading', 'traveling', 'swimming', 'coding', 'hiking'],
    }
    const r3 = tu.safeStringify(obj3, 2, Infinity, Infinity, false, (path, value, start, end) => {
        console.log('callback:', path, value, start, end)
    })
    console.log('safeStringify result:', r3.str)
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

Deno.test('parseTimeRange basics and range syntax', () => {
    const r = tu.parseTimeRange('2025-03-01 01:02..2025-03-02 03:04:05', 0)
    ut.assertEquals(r.start.toISOString(), '2025-03-01T01:02:00.000Z')
    ut.assertEquals(r.end.toISOString(), '2025-03-02T03:04:05.000Z')

    const rs = tu.parseTimeRange('2025-03-02 00:00..2025-03-01 00:00', 0)
    ut.assertEquals(rs.start.toISOString(), '2025-03-01T00:00:00.000Z')
    ut.assertEquals(rs.end.toISOString(), '2025-03-02T00:00:00.000Z')
})

Deno.test('parseTimeRange rangeSpec and alias reuse', () => {
    const day = tu.parseTimeRange('2025-03-21', 0)
    ut.assertEquals(day.start.toISOString(), '2025-03-21T00:00:00.000Z')
    ut.assertEquals(day.end.toISOString(), '2025-03-22T00:00:00.000Z')

    const month = tu.parseTimeRange('2025-03', 0)
    ut.assertEquals(month.start.toISOString(), '2025-03-01T00:00:00.000Z')
    ut.assertEquals(month.end.toISOString(), '2025-04-01T00:00:00.000Z')

    const year = tu.parseTimeRange('2025', 0)
    ut.assertEquals(year.start.toISOString(), '2025-01-01T00:00:00.000Z')
    ut.assertEquals(year.end.toISOString(), '2026-01-01T00:00:00.000Z')
})

Deno.test('parseTimeRange wrapper applies adjustment before boundary', () => {
    const r = tu.parseTimeRange('month(2025-03-31-1M)', 0)
    ut.assertEquals(r.start.toISOString(), '2025-02-01T00:00:00.000Z')
    ut.assertEquals(r.end.toISOString(), '2025-03-01T00:00:00.000Z')

    const d = tu.parseTimeRange('day(2025-03-31-1M)', 0)
    ut.assertEquals(d.start.toISOString(), '2025-02-28T00:00:00.000Z')
    ut.assertEquals(d.end.toISOString(), '2025-03-01T00:00:00.000Z')
})

Deno.test('parseTimeRange timezone shift and flexible spaces/case', () => {
    const r = tu.parseTimeRange('  ThIs   WeEk  ', 8 * 60)
    const expected = tu.parseTimeRange('week(now)', 8 * 60)
    ut.assertEquals(r.start.toISOString(), expected.start.toISOString())
    ut.assertEquals(r.end.toISOString(), expected.end.toISOString())
})

Deno.test('parseTimeRange rejects standalone timeSpec and multiple adjustments', () => {
    ut.assertThrows(() => tu.parseTimeRange('now', 0))
    ut.assertThrows(() => tu.parseTimeRange('now+1d+2h..now+3d', 0))
})