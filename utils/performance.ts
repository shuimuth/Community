
/**
 * Performance optimization utilities
 * Image lazy loading, list virtualization helpers, cache management
 */

/**
 * Simple in-memory cache with TTL
 */
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map()

  /**
   * Get cached data
   */
  get<T = any>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    return item.data as T
  }

  /**
   * Set cached data with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in ms (default 5 minutes)
   */
  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, { data, expiry: Date.now() + ttl })
  }

  /**
   * Remove cached data
   */
  remove(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }
}

// Global shared cache instance
export const memCache = new MemoryCache()

/**
 * Cache wrapper for async functions
 * Caches function results based on args
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyPrefix: string,
  ttl: number = 300000
): T {
  return (async function(...args: any[]) {
    const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`
    const cached = memCache.get(cacheKey)
    if (cached !== null) return cached

    const result = await fn(...args)
    memCache.set(cacheKey, result, ttl)
    return result
  }) as unknown as T
}

/**
 * Batch image preload
 * Preloads images for smoother scrolling experience
 */
export function preloadImages(urls: string[]): void {
  if (!urls || urls.length === 0) return
  urls.forEach(url => {
    if (url) {
      uni.getImageInfo({
        src: url,
        success: () => {},
        fail: () => {}
      })
    }
  })
}

/**
 * Virtual list helper for long lists
 * Calculates visible range based on scroll position
 */
export function calcVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  buffer: number = 5
): { start: number; end: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const endIndex = Math.min(totalItems, Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer)
  return { start: startIndex, end: endIndex }
}

/**
 * Storage helper with quota management
 * Auto-clears old data when approaching storage limit
 */
export const storageHelper = {
  /**
   * Set with optional expiry
   */
  set(key: string, data: any, expiryMs?: number): void {
    try {
      const item: any = { data, timestamp: Date.now() }
      if (expiryMs) {
        item.expiry = Date.now() + expiryMs
      }
      uni.setStorageSync(key, JSON.stringify(item))
    } catch (e) {
      console.error('Storage set failed:', e)
      // Try to free up space
      this.cleanup()
      try {
        const item: any = { data, timestamp: Date.now() }
        if (expiryMs) item.expiry = Date.now() + expiryMs
        uni.setStorageSync(key, JSON.stringify(item))
      } catch (e2) {
        console.error('Storage set failed after cleanup:', e2)
      }
    }
  },

  /**
   * Get with expiry check
   */
  get<T = any>(key: string): T | null {
    try {
      const raw = uni.getStorageSync(key)
      if (!raw) return null
      const item = JSON.parse(raw)
      if (item.expiry && Date.now() > item.expiry) {
        uni.removeStorageSync(key)
        return null
      }
      return item.data as T
    } catch (e) {
      return null
    }
  },

  /**
   * Remove item
   */
  remove(key: string): void {
    try { uni.removeStorageSync(key) } catch (e) {}
  },

  /**
   * Cleanup expired items
   */
  cleanup(): void {
    try {
      const res = uni.getStorageInfoSync()
      const keys = res.keys || []
      const now = Date.now()
      keys.forEach(key => {
        try {
          // Skip system keys
          if (key.startsWith('uni_') || key.startsWith('__')) return
          const raw = uni.getStorageSync(key)
          if (!raw) return
          const item = JSON.parse(raw)
          if (item.expiry && now > item.expiry) {
            uni.removeStorageSync(key)
          }
        } catch (e) {}
      })
    } catch (e) {
      console.error('Storage cleanup failed:', e)
    }
  }
}

/**
 * Batch upload images with concurrency control
 * @param filePaths - Array of local file paths
 * @param cloudDir - Cloud storage directory
 * @param concurrency - Max concurrent uploads (default 3)
 * @returns Array of cloud file IDs
 */
export async function batchUploadImages(
  filePaths: string[],
  cloudDir: string = 'tasks',
  concurrency: number = 3
): Promise<string[]> {
  const results: string[] = []
  const queue = [...filePaths]

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const filePath = queue.shift()!
      const ext = filePath.split('.').pop() || 'jpg'
      const cloudPath = `${cloudDir}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
      try {
        // Compress before upload
        let compressedPath = filePath
        try {
          const compRes = await new Promise<any>((resolve, reject) => {
            uni.compressImage({
              src: filePath,
              quality: 80,
              compressedWidth: 1200,
              success: resolve,
              fail: reject
            })
          })
          compressedPath = compRes.tempFilePath
        } catch (e) { /* Use original if compression fails */ }

        const res = await uniCloud.uploadFile({
          filePath: compressedPath,
          cloudPath
        })
        results.push(res.fileID)
      } catch (e) {
        console.error('Upload failed for:', filePath, e)
        results.push('')
      }
    }
  }

  // Run with concurrency limit
  const workers = Array(Math.min(concurrency, filePaths.length)).fill(null).map(() => processNext())
  await Promise.all(workers)

  return results.filter(id => id !== '')
}
