/**
 * API request utility for uniCloud
 * Enhanced with security: retry, dedup, token refresh, error handling
 */

// Pending request map for deduplication
const pendingRequests = new Map<string, Promise<any>>()

/**
 * Generate request key for dedup
 */
function getRequestKey(objectName: string, methodName: string, params?: any): string {
  return `${objectName}.${methodName}:${JSON.stringify(params || {})}`
}

/**
 * Call cloud object method with enhanced security
 * - Automatic retry on network failure
 * - Deduplication of identical concurrent requests
 * - Token expiry detection and re-login redirect
 * - Unified error handling
 */
export async function callCloudObject<T = any>(
  objectName: string,
  methodName: string,
  params?: Record<string, any>,
  options?: {
    retry?: number       // Retry times on failure (default 1)
    dedup?: boolean      // Deduplicate concurrent identical requests (default false)
    silent?: boolean     // Don't show toast on error (default false)
    timeout?: number     // Timeout in ms (default 15000)
  }
): Promise<T> {
  const { retry = 1, dedup = false, silent = false, timeout = 15000 } = options || {}
  const requestKey = getRequestKey(objectName, methodName, params)

  // Deduplication: if same request is in-flight, return the same promise
  if (dedup && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<T>
  }

  const doRequest = async (retryCount: number): Promise<T> => {
    try {
      const obj = uniCloud.importObject(objectName, { customUI: true })

      // Create a timeout race
      const resultPromise = (obj as any)[methodName](params)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时，请检查网络')), timeout)
      })

      const result = await Promise.race([resultPromise, timeoutPromise])
      return result as T
    } catch (e: any) {
      const errMsg = e.message || e.errMsg || ''

      // Token expired - redirect to login
      if (errMsg.includes('token') || errMsg.includes('登录') || errMsg.includes('Unauthorized') || e.errCode === 'TOKEN_INVALID') {
        uni.removeStorageSync('uni_id_token')
        uni.removeStorageSync('uni_id_token_expired')
        if (!silent) {
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
        }
        // Delay navigation to allow toast display
        setTimeout(() => {
          uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' })
        }, 1500)
        throw e
      }

      // Network error - retry
      if (retryCount > 0 && (errMsg.includes('timeout') || errMsg.includes('网络') || errMsg.includes('Network'))) {
        console.warn(`Retrying [${objectName}.${methodName}] (${retry - retryCount + 1}/${retry})`)
        await new Promise(resolve => setTimeout(resolve, 500 * (retry - retryCount + 1)))
        return doRequest(retryCount - 1)
      }

      console.error(`Cloud object error [${objectName}.${methodName}]:`, e)
      if (!silent) {
        const displayMsg = errMsg.length > 50 ? '请求失败，请稍后重试' : (errMsg || '请求失败，请稍后重试')
        uni.showToast({ title: displayMsg, icon: 'none' })
      }
      throw e
    }
  }

  const promise = doRequest(retry)

  if (dedup) {
    pendingRequests.set(requestKey, promise)
    promise.finally(() => {
      pendingRequests.delete(requestKey)
    })
  }

  return promise
}

/**
 * JQL database query helper
 */
export function getDb() {
  return uniCloud.database()
}

/**
 * JQL collection reference helper
 */
export function getCollection(name: string) {
  return uniCloud.database().collection(name)
}

/**
 * Paginated JQL query
 */
export async function paginatedQuery<T = any>(options: {
  collection: string
  where?: string
  field?: string
  orderBy?: string
  page: number
  pageSize: number
  getCount?: boolean
}): Promise<{ data: T[]; count: number }> {
  const { collection, where, field, orderBy, page, pageSize, getCount = true } = options

  let query = getCollection(collection)

  if (where) {
    query = query.where(where) as any
  }
  if (field) {
    query = query.field(field) as any
  }
  if (orderBy) {
    query = query.orderBy(orderBy) as any
  }

  query = query.skip((page - 1) * pageSize).limit(pageSize) as any

  if (getCount) {
    query = (query as any).getCount()
  }

  const res = await query.get()

  return {
    data: (res.result?.data || []) as T[],
    count: res.result?.count || 0
  }
}
