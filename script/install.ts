// this script will put `uu.ts` in the current directory

import * as hash from './hash.ts'
import * as fs from 'jsr:@std/fs@1.0.14'
import { assets } from './bootstrap-assets.ts'
import * as ma from './memory-asset.ts'

// check hash if uu.ts exists
const uuFile = 'uu.ts'
if (fs.existsSync(uuFile)) {
    console.log('checking existing uu.ts...')
    const {isValid, oldHash, newHash} = await hash.validateHash(uuFile)
    if (!isValid) {
        const newFile = uuFile + '.' + newHash
        fs.moveSync(uuFile, newFile, { overwrite: true })
        console.log('uu.ts has local modifications, please review it. Renamed to', newFile)
    }
}

ma.saveMemoryAssets(assets, '.')
console.log('latest uu.ts saved to current directory.')