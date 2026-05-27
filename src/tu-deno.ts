// deno specific which can only be used in demo env

import * as tuc from './tu-cache.ts'

export class DenoFileCacheStorage implements tuc.CacheStorage {
    constructor(private baseDir: string = './cache', private fileExt = '.json') {
    }
    private getDir(location: string[]) {
        return [this.baseDir, ...location.slice(0, -1)].join('/')
    }
    private getPath(location: string[]) {
        return [this.baseDir, ...location].join('/') + this.fileExt
    }
    async getItem(location: string[]) {
        const path = this.getPath(location)
        try {
            const data = await Deno.readTextFile(path)
            console.log(`Deno File Cache hit for ${path}`)
            return data
        } catch (error) {
            return null
        }
    }
    async setItem(location: string[], value: string) {
        // ensure dir exists
        const dir = this.getDir(location)
        await Deno.mkdir(dir, { recursive: true })
        const path = this.getPath(location)
        await Deno.writeTextFile(path, value)
    }
    async removeItem(location: string[]) {
        const path = this.getPath(location)
        try {
            await Deno.remove(path)
            console.log(`Deno File Cache removed for ${path}`)
        } catch (error) {
                // ignore error
        }
    }
}

export function createDenoCachedCaller(baseDir?: string, fileExt?: string) {
    const storage = new DenoFileCacheStorage(baseDir, fileExt)
    return new tuc.CachedCaller(storage)
}
