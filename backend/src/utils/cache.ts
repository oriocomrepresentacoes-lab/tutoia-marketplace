type CacheItem<T> = {
    value: T;
    expiry: number;
};

class SimpleCache {
    private cache: Map<string, CacheItem<any>> = new Map();

    set<T>(key: string, value: T, ttlSeconds: number) {
        const expiry = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, expiry });
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key: string) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

export const cache = new SimpleCache();
