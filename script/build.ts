import * as ma from './memory-asset.ts'

const files = [
    {name: 'uu.ts', path: 'uu.ts'}
]

const myDir = import.meta.dirname

// const version = JSON.parse(Deno.readTextFileSync('jsr.json')).version

ma.createMemoryAssets(files, `${myDir}/bootstrap-assets.ts`)
