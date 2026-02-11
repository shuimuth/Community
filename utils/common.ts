/**
 * Common utility functions
 */

/**
 * Format date to readable string
 */
export function formatDate(date: Date | number | string, format: string = 'YYYY-MM-DD HH:mm'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * Format relative time (e.g. "3 minutes ago")
 */
export function formatRelativeTime(date: Date | number | string): string {
  const now = Date.now()
  const target = new Date(date).getTime()
  const diff = now - target

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`
  return formatDate(date, 'YYYY-MM-DD')
}

/**
 * Format price with two decimal places
 */
export function formatPrice(price: number): string {
  return price.toFixed(2)
}

/**
 * Calculate service fee
 */
export function calcServiceFee(reward: number, rate: number = 0.1): number {
  return Math.round(reward * rate * 100) / 100
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: any[]) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  } as T
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number = 300): T {
  let lastTime = 0
  return function (this: any, ...args: any[]) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      fn.apply(this, args)
      lastTime = now
    }
  } as T
}

/**
 * Show toast message
 */
export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  uni.showToast({ title, icon, duration: 2000 })
}

/**
 * Show loading
 */
export function showLoading(title: string = '加载中...') {
  uni.showLoading({ title, mask: true })
}

/**
 * Hide loading
 */
export function hideLoading() {
  uni.hideLoading()
}

/**
 * Show confirm modal
 */
export function showConfirm(content: string, title: string = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => {
        resolve(!!res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * Compress image before upload (max width 1200px)
 */
export function compressImage(src: string, maxWidth: number = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality: 80,
      compressedWidth: maxWidth,
      success: (res) => {
        resolve(res.tempFilePath)
      },
      fail: (err) => {
        // If compression fails, return original
        console.warn('Image compression failed:', err)
        resolve(src)
      }
    })
  })
}

/**
 * Upload image to uniCloud storage
 */
export async function uploadImage(filePath: string, cloudPath: string): Promise<string> {
  const compressed = await compressImage(filePath)
  const res = await uniCloud.uploadFile({
    filePath: compressed,
    cloudPath
  })
  return res.fileID
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * Validate ID card number
 */
export function isValidIdCard(idCard: string): boolean {
  return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard)
}

/**
 * Mask phone number (e.g. 138****1234)
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

/**
 * Get task status text
 */
export function getTaskStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待接单',
    in_progress: '进行中',
    waiting_confirm: '待确认',
    completed: '已完成',
    cancelled: '已取消',
    disputed: '申诉中'
  }
  return map[status] || '未知'
}

/**
 * Get task status color
 */
export function getTaskStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#f0ad4e',
    in_progress: '#007aff',
    waiting_confirm: '#9b59b6',
    completed: '#4cd964',
    cancelled: '#999999',
    disputed: '#dd524d'
  }
  return map[status] || '#999999'
}
