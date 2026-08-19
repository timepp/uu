export class MemoryCacheStorage {
    cache = new Map();
    getItem(location) {
        const key = location.join('/');
        return Promise.resolve(this.cache.get(key) || null);
    }
    setItem(location, value) {
        const key = location.join('/');
        this.cache.set(key, value);
        return Promise.resolve();
    }
    removeItem(location) {
        const key = location.join('/');
        this.cache.delete(key);
        return Promise.resolve();
    }
}
export class CachedCaller {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Call async function and cache result
     * @param func The async function to execute
     * @param args Function arguments
     * @returns Function execution result (from cache or new execution)
     */
    async call(func, ...args) {
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
            const cacheData = JSON.parse(cached);
            console.log(`Cache hit: ${location.join('/')}`);
            cacheData.hitCount = (cacheData.hitCount ?? 0) + 1;
            await this.storage.setItem(location, JSON.stringify(cacheData, null, 2));
            return cacheData.data;
        }
        // Execute function
        const result = (await func(...args));
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
