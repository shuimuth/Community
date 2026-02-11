
/**
 * Navigation guard and permission control utilities
 * Provides: login check, info completion check, route protection
 */

/**
 * Pages that require login
 */
const LOGIN_REQUIRED_PAGES = [
  '/pages/task/publish',
  '/pages/task/detail',
  '/pages/user/my-tasks',
  '/pages/user/balance',
  '/pages/user/transactions',
  '/pages/user/withdraw',
  '/pages/user/reviews',
  '/pages/user/verify',
  '/pages/user/profile',
  '/pages/user/settings',
  '/pages/profile/complete',
  '/pages/publish/index',
  '/pages/message/index',
  '/pages/community/select',
  '/pages/community/manage'
]

/**
 * Pages that require completed user profile
 */
const PROFILE_REQUIRED_PAGES = [
  '/pages/task/publish',
  '/pages/publish/index'
]

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  const token = uni.getStorageSync('uni_id_token')
  const expired = uni.getStorageSync('uni_id_token_expired')
  if (!token) return false
  if (expired && Date.now() > expired) return false
  return true
}

/**
 * Navigate with login check
 * Redirects to login if not authenticated
 */
export function navigateWithAuth(url: string, options?: { redirect?: boolean }): void {
  if (!isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' })
    }, 1000)
    return
  }

  if (options?.redirect) {
    uni.redirectTo({ url })
  } else {
    uni.navigateTo({ url })
  }
}

/**
 * Check if a page path requires login
 */
export function requiresLogin(path: string): boolean {
  return LOGIN_REQUIRED_PAGES.some(p => path.startsWith(p))
}

/**
 * Check if a page path requires completed profile
 */
export function requiresProfile(path: string): boolean {
  return PROFILE_REQUIRED_PAGES.some(p => path.startsWith(p))
}

/**
 * Intercept page navigation
 * Add to App.vue onShow or use as global interceptor
 */
export function setupNavigationGuard(): void {
  // Override uni.navigateTo for global auth checking
  const originalNavigateTo = uni.navigateTo
  ;(uni as any).navigateTo = function(options: UniNamespace.NavigateToOptions) {
    const url = options.url || ''
    const path = url.split('?')[0]

    if (requiresLogin(path) && !isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => {
        originalNavigateTo.call(uni, {
          url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
        })
      }, 1000)
      return
    }

    return originalNavigateTo.call(uni, options)
  }
}

/**
 * Prevent frequent clicks (button debounce)
 * Returns a function that wraps the handler with click throttle
 */
export function preventDoubleClick<T extends (...args: any[]) => any>(
  fn: T,
  interval: number = 1500
): (...args: Parameters<T>) => void {
  let lastClickTime = 0
  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastClickTime < interval) {
      console.warn('Prevented double click')
      return
    }
    lastClickTime = now
    return fn.apply(this, args)
  }
}
