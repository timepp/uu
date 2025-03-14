// this script will put `uu.ts` in the current directory

import * as hash from './hash.ts'
import * as fs from 'jsr:@std/fs'
import { assets } from './bootstrap-assets.ts'
import * as ma from './memory-asset.ts'

// check hash if uu.ts exists
const uuFile = 'uu.ts'
if (fs.existsSync(uuFile)) {
    const isValid = await hash.validateHash(uuFile)
    if (!isValid) {
        console.error('uu.ts is not valid, please run the script again')
        Deno.exit(1)
    }
}

ma.saveMemoryAssets(assets, '.')
