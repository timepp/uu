
export interface CacheStorage {
    getItem(location: string[]): Promise<string | null>
    setItem(location: string[], value: string): Promise<void>
    removeItem(location: string[]): Promise<void>
}

export class MemoryCacheStorage implements CacheStorage {
    private cache: Map<string, string> = new Map()
    getItem(location: string[]): Promise<string | null> {
        const key = location.join('/');
        return Promise.resolve(this.cache.get(key) || null);
    }
    setItem(location: string[], value: string): Promise<void> {
        const key = location.join('/');
        this.cache.set(key, value);
        return Promise.resolve();
    }
    removeItem(location: string[]): Promise<void> {
        const key = location.join('/');
        this.cache.delete(key);
        return Promise.resolve();
    }
}

export class CachedCaller {
    constructor(private storage: CacheStorage) {
    }
    /**
     * Call async function and cache result
     * @param func The async function to execute
     * @param args Function arguments
     * @returns Function execution result (from cache or new execution)
     */
    async call<
        T extends (...args: never[]) => Promise<unknown>
    >(
        func: T,
        ...args: Parameters<T>
    ): Promise<Awaited<ReturnType<T>>> {
        console.log(`Calling function ${func.name} with cache enabled...`);

        // Generate cache key
        const cacheKey = {
            func: func.name || "anonymous",
            args: args,
        };

        // Generate hash as filename
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(cacheKey));
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const location = [func.name || "anonymous", hash];

        // Check if cache exists
        const cached = await this.storage.getItem(location);
        if (cached) {
            const cacheData = JSON.parse(cached) as { hitCount: number; data: Awaited<ReturnType<T>> };
            console.log(`Cache hit: ${location.join('/')}`);
            cacheData.hitCount = (cacheData.hitCount??0)+1
            await this.storage.setItem(location, JSON.stringify(cacheData, null, 2));
            return cacheData.data;
        }

        // Execute function
        const result = (await func(...args)) as Awaited<ReturnType<T>>;

        const cacheData = {
            function: func.name || "anonymous",
            args: args,
            created: new Date().toISOString(),
            hitCount: 0,
            data: result,
        };
        await this.storage.setItem(location, JSON.stringify(cacheData, null, 2));
        console.log(`Cache saved for function ${func.name}`);

        return result;
    }
}