// this script will put `uu.ts` in the current directory

import * as hash from './hash.ts'
import * as fs from 'jsr:@std/fs@1.0.14'
import { assets } from './bootstrap-assets.ts'
import * as ma from './memory-asset.ts'

for (const file of Object.keys(assets)) {
    // check hash if uu.ts exists
    if (fs.existsSync(file)) {
        const { isValid, oldHash, newHash } = await hash.validateHash(file)
        if (!isValid) {
            const newFile = file + '.' + newHash
            fs.moveSync(file, newFile, { overwrite: true })
            console.log('file has local modifications, please review it. Renamed to', newFile)
        }
    }
}

ma.saveMemoryAssets(assets, '.')
console.log('latest uu.ts saved to current directory.')