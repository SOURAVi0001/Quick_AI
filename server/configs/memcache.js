/**
 * In-memory LRU cache with TTL support.
 * Sits in front of Redis to avoid 800ms+ round-trip to remote Redis from India.
 * Falls back to Redis on miss, and populates itself on Redis hits.
 */

const DEFAULT_MAX_ENTRIES = 200;

class MemCache {
  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.cache = new Map(); // key -> { value, expiresAt }
    this.maxEntries = maxEntries;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key) {
    this.cache.delete(key);
  }

  // Delete all keys matching a prefix
  delByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

// Singleton instance
const memCache = new MemCache();
export default memCache;
