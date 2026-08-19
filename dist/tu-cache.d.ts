export interface CacheStorage {
    getItem(location: string[]): Promise<string | null>;
    setItem(location: string[], value: string): Promise<void>;
    removeItem(location: string[]): Promise<void>;
}
export declare class MemoryCacheStorage implements CacheStorage {
    private cache;
    getItem(location: string[]): Promise<string | null>;
    setItem(location: string[], value: string): Promise<void>;
    removeItem(location: string[]): Promise<void>;
}
export declare class CachedCaller {
    private storage;
    constructor(storage: CacheStorage);
    /**
     * Call async function and cache result
     * @param func The async function to execute
     * @param args Function arguments
     * @returns Function execution result (from cache or new execution)
     */
    call<T extends (...args: never[]) => Promise<unknown>>(func: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;
}
