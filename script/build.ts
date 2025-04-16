import * as ma from './memory-asset.ts'
import * as hash from './hash.ts'
import * as assets from './assets.ts'

const myDir = import.meta.dirname

for (const file of assets.files) {
    console.log(`updating hash: ${file.name}`)
    const filePath = `${file.path}`
    hash.updateHash(filePath)
}

ma.createMemoryAssets(assets.files, `${myDir}/bootstrap-assets.ts`)
console.log('Memory assets created at bootstrap-assets.ts')
