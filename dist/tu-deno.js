// deno specific which can only be used in demo env
import * as tuc from './tu-cache.js';
export class DenoFileCacheStorage {
    baseDir;
    fileExt;
    constructor(baseDir = './cache', fileExt = '.json') {
        this.baseDir = baseDir;
        this.fileExt = fileExt;
    }
    getDir(location) {
        return [this.baseDir, ...location.slice(0, -1)].join('/');
    }
    getPath(location) {
        return [this.baseDir, ...location].join('/') + this.fileExt;
    }
    async getItem(location) {
        const path = this.getPath(location);
        try {
            const data = await Deno.readTextFile(path);
            console.log(`Deno File Cache hit for ${path}`);
            return data;
        }
        catch (error) {
            return null;
        }
    }
    async setItem(location, value) {
        // ensure dir exists
        const dir = this.getDir(location);
        await Deno.mkdir(dir, { recursive: true });
        const path = this.getPath(location);
        await Deno.writeTextFile(path, value);
    }
    async removeItem(location) {
        const path = this.getPath(location);
        try {
            await Deno.remove(path);
            console.log(`Deno File Cache removed for ${path}`);
        }
        catch (error) {
            // ignore error
        }
    }
}
export function createDenoCachedCaller(baseDir, fileExt) {
    const storage = new DenoFileCacheStorage(baseDir, fileExt);
    return new tuc.CachedCaller(storage);
}
