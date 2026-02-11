/**
 * Application constants
 */

// Task status enum
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  WAITING_CONFIRM: 'waiting_confirm',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
} as const

// Task type list
export const TASK_TYPES = [
  '取快递',
  '接送小孩',
  '陪诊',
  '陪读',
  '代扔垃圾',
  '宠物喂养',
  '其他'
] as const

// Task type colors for badges
export const TASK_TYPE_COLORS: Record<string, string> = {
  '取快递': '#ff9800',
  '接送小孩': '#4caf50',
  '陪诊': '#2196f3',
  '陪读': '#9c27b0',
  '代扔垃圾': '#795548',
  '宠物喂养': '#e91e63',
  '其他': '#607d8b'
}

// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: 'income',           // Task reward income
  EXPENSE: 'expense',         // Task publish payment
  WITHDRAW: 'withdraw',       // Balance withdrawal
  REFUND: 'refund',           // Task cancellation refund
  SERVICE_FEE: 'service_fee'  // Platform service fee
} as const

// Withdrawal status
export const WITHDRAW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
  FAILED: 'failed'
} as const

// Message types
export const MESSAGE_TYPES = {
  TASK_ACCEPTED: 'task_accepted',
  TASK_COMPLETED: 'task_completed',
  TASK_CANCELLED: 'task_cancelled',
  TASK_CONFIRMED: 'task_confirmed',
  WITHDRAW_RESULT: 'withdraw_result',
  REVIEW_RECEIVED: 'review_received',
  SYSTEM: 'system'
} as const

// Credit score changes
export const CREDIT_CHANGES = {
  REGISTER: 100,        // Initial score on registration
  VERIFY: 10,           // Complete identity verification
  COMPLETE_TASK: 2,     // Complete a task as receiver
  GOOD_REVIEW: 3,       // Receive 5-star review
  BAD_REVIEW: -5,       // Receive 1-2 star review
  CANCEL_ACCEPTED: -10, // Cancel after accepting task
  COMPLAINT: -20        // Verified complaint
} as const

// Credit level thresholds
export const CREDIT_LEVELS = {
  EXCELLENT: { min: 90, label: '优秀', color: '#4cd964' },
  GOOD: { min: 70, label: '良好', color: '#007aff' },
  NORMAL: { min: 60, label: '一般', color: '#f0ad4e' },
  POOR: { min: 0, label: '较差', color: '#dd524d' }
} as const

// Platform defaults
export const PLATFORM = {
  SERVICE_FEE_RATE: 0.1,        // 10% service fee
  MIN_WITHDRAW: 10,              // Min withdrawal amount
  MIN_REWARD: 5,                 // Min task reward
  MAX_REWARD: 1000,              // Max task reward
  AUTO_CONFIRM_HOURS: 48,        // Auto-confirm after 48 hours
  MAX_COMMUNITIES: 5,            // Max communities per user
  PAGE_SIZE: 20,                 // Default page size
  MAX_IMAGES: 6,                 // Max images per task
  MAX_IMAGE_SIZE: 5 * 1024 * 1024  // 5MB per image
} as const

// Collection names
export const COLLECTIONS = {
  USERS: 'uni-id-users',
  COMMUNITIES: 'communities',
  USER_COMMUNITIES: 'user_communities',
  TASKS: 'tasks',
  TASK_ORDERS: 'task_orders',
  TRANSACTIONS: 'transactions',
  REVIEWS: 'reviews',
  MESSAGES: 'messages',
  WITHDRAWALS: 'withdrawals',
  ADMIN_LOGS: 'admin_logs',
  SYSTEM_CONFIG: 'system_config'
} as const
