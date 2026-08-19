import * as tuc from './tu-cache.ts';
export declare class DenoFileCacheStorage implements tuc.CacheStorage {
    private baseDir;
    private fileExt;
    constructor(baseDir?: string, fileExt?: string);
    private getDir;
    private getPath;
    getItem(location: string[]): Promise<any>;
    setItem(location: string[], value: string): Promise<void>;
    removeItem(location: string[]): Promise<void>;
}
export declare function createDenoCachedCaller(baseDir?: string, fileExt?: string): tuc.CachedCaller;
