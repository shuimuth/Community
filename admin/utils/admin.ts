
/**
 * Admin API request utility
 */

export async function adminCallCloud<T = any>(
  objectName: string,
  methodName: string,
  params?: Record<string, any>
): Promise<T> {
  try {
    const obj = uniCloud.importObject(objectName)
    const result = await (obj as any)[methodName](params)
    return result as T
  } catch (e: any) {
    console.error(`Admin cloud error [${objectName}.${methodName}]:`, e)
    const errMsg = e.message || '请求失败'

    // Handle auth errors
    if (errMsg.includes('Unauthorized') || errMsg.includes('token')) {
      uni.removeStorageSync('admin_token')
      uni.reLaunch({ url: '/pages/login/login' })
      return Promise.reject(e)
    }

    uni.showToast({ title: errMsg, icon: 'none' })
    throw e
  }
}

/**
 * Format timestamp to date string
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

/**
 * Format amount to 2 decimal places
 */
export function formatAmount(val: number): string {
  return (val || 0).toFixed(2)
}

/**
 * Task status label mapping
 */
export function getTaskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待接单',
    in_progress: '进行中',
    waiting_confirm: '待确认',
    completed: '已完成',
    cancelled: '已取消',
    disputed: '申诉中'
  }
  return map[status] || status
}

/**
 * Task status color mapping
 */
export function getTaskStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#409EFF',
    in_progress: '#E6A23C',
    waiting_confirm: '#9B59B6',
    completed: '#67C23A',
    cancelled: '#909399',
    disputed: '#F56C6C'
  }
  return map[status] || '#909399'
}

/**
 * Withdraw status label
 */
export function getWithdrawStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    paid: '已打款',
    failed: '打款失败'
  }
  return map[status] || status
}

/**
 * Menu configuration for admin sidebar
 */
export const adminMenus = [
  {
    key: 'dashboard',
    title: '数据仪表盘',
    icon: 'home',
    path: '/pages/index/index'
  },
  {
    key: 'user',
    title: '用户管理',
    icon: 'person',
    path: '/pages/user/list'
  },
  {
    key: 'task',
    title: '任务管理',
    icon: 'list',
    path: '/pages/task/list'
  },
  {
    key: 'dispute',
    title: '申诉管理',
    icon: 'flag',
    path: '/pages/dispute/list'
  },
  {
    key: 'withdraw',
    title: '提现审核',
    icon: 'wallet',
    path: '/pages/withdraw/list'
  },
  {
    key: 'community',
    title: '小区管理',
    icon: 'location',
    path: '/pages/community/list'
  },
  {
    key: 'config',
    title: '系统配置',
    icon: 'gear',
    path: '/pages/system/config'
  },
  {
    key: 'log',
    title: '操作日志',
    icon: 'paperplane',
    path: '/pages/system/log'
  }
]
