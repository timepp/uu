
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
     * 调用异步函数并缓存结果
     * @param func 要执行的异步函数
     * @param args 函数参数
     * @returns 函数执行结果（从缓存或新执行）
     */
    async call<
        T extends (...args: never[]) => Promise<unknown>
    >(
        func: T,
        ...args: Parameters<T>
    ): Promise<Awaited<ReturnType<T>>> {
        console.log(`Calling function ${func.name} with cache enabled...`);

        // 生成缓存键
        const cacheKey = {
            func: func.name || "anonymous",
            args: args,
        };

        // 生成 hash 作为文件名
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(cacheKey));
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const location = [func.name || "anonymous", hash];

        // 检查缓存是否存在
        const cached = await this.storage.getItem(location);
        if (cached) {
            const cacheData = JSON.parse(cached) as { hitCount: number; data: Awaited<ReturnType<T>> };
            console.log(`Cache hit: ${location.join('/')}`);
            cacheData.hitCount = (cacheData.hitCount??0)+1
            await this.storage.setItem(location, JSON.stringify(cacheData, null, 2));
            return cacheData.data;
        }

        // 执行函数
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