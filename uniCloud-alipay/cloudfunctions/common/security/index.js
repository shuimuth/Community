
/**
 * Common security middleware for cloud objects
 * Provides: auth verification, rate limiting, input validation, content safety
 */
const db = uniCloud.database()
const dbCmd = db.command
const crypto = require('crypto')

// AES encryption key (should be stored in config center in production)
const ENCRYPT_KEY = 'community-task-platform-aes-key!'
const ENCRYPT_IV = '1234567890abcdef'

/**
 * Verify user token and return user info
 * @param {Object} clientInfo - Client info from cloud function context
 * @returns {Object} { uid, userInfo }
 */
async function verifyToken(clientInfo) {
  if (!clientInfo || !clientInfo.uniIdToken) {
    throw new Error('未登录，请先登录')
  }
  const uniIdCommon = require('uni-id-common')
  const uniID = uniIdCommon.createInstance({ clientInfo })
  const payload = await uniID.checkToken(clientInfo.uniIdToken)
  if (payload.errCode) {
    throw new Error('登录已过期，请重新登录')
  }
  return { uid: payload.uid, role: payload.role || [] }
}

/**
 * Verify admin role
 * @param {string} uid - User ID
 * @returns {Object} user info with role
 */
async function verifyAdmin(uid) {
  const userRes = await db.collection('uni-id-users')
    .where({ _id: uid })
    .field({ role: 1, nickname: 1 })
    .get()
  const user = userRes.data?.[0]
  if (!user || !user.role || (!user.role.includes('admin') && !user.role.includes('super_admin'))) {
    throw new Error('无管理员权限')
  }
  return user
}

/**
 * Rate limiter - limit requests per user
 * Uses in-memory cache with cleanup
 * @param {string} uid - User ID
 * @param {string} action - Action identifier
 * @param {number} maxRequests - Max requests allowed (default 10)
 * @param {number} windowMs - Time window in ms (default 1000ms = 1s)
 */
const rateLimitCache = {}
const RATE_LIMIT_CLEANUP_INTERVAL = 60000 // Clean up every 60s

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  Object.keys(rateLimitCache).forEach(key => {
    if (rateLimitCache[key].expiry < now) {
      delete rateLimitCache[key]
    }
  })
}, RATE_LIMIT_CLEANUP_INTERVAL)

function rateLimit(uid, action = 'default', maxRequests = 10, windowMs = 1000) {
  const key = `${uid}:${action}`
  const now = Date.now()

  if (!rateLimitCache[key] || rateLimitCache[key].expiry < now) {
    rateLimitCache[key] = {
      count: 1,
      expiry: now + windowMs
    }
    return true
  }

  rateLimitCache[key].count++
  if (rateLimitCache[key].count > maxRequests) {
    throw new Error('操作过于频繁，请稍后再试')
  }
  return true
}

/**
 * Input parameter validation
 * @param {Object} params - Parameters to validate
 * @param {Object} rules - Validation rules
 * Example rules: { title: { required: true, type: 'string', maxLength: 100 } }
 */
function validateParams(params, rules) {
  if (!params || typeof params !== 'object') {
    throw new Error('参数格式错误')
  }

  for (const [field, rule] of Object.entries(rules)) {
    const value = params[field]

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new Error(`参数 ${rule.label || field} 不能为空`)
    }

    // Skip further validation if value is empty and not required
    if (value === undefined || value === null || value === '') continue

    // Type check
    if (rule.type) {
      if (rule.type === 'string' && typeof value !== 'string') {
        throw new Error(`参数 ${rule.label || field} 格式错误`)
      }
      if (rule.type === 'number' && typeof value !== 'number') {
        throw new Error(`参数 ${rule.label || field} 必须是数字`)
      }
      if (rule.type === 'array' && !Array.isArray(value)) {
        throw new Error(`参数 ${rule.label || field} 格式错误`)
      }
    }

    // String length check
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        throw new Error(`${rule.label || field} 长度不能小于 ${rule.minLength}`)
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        throw new Error(`${rule.label || field} 长度不能超过 ${rule.maxLength}`)
      }
    }

    // Number range check
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        throw new Error(`${rule.label || field} 不能小于 ${rule.min}`)
      }
      if (rule.max !== undefined && value > rule.max) {
        throw new Error(`${rule.label || field} 不能大于 ${rule.max}`)
      }
    }

    // Array length check
    if (Array.isArray(value)) {
      if (rule.maxItems && value.length > rule.maxItems) {
        throw new Error(`${rule.label || field} 最多 ${rule.maxItems} 项`)
      }
    }

    // Pattern check (regex)
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        throw new Error(`${rule.label || field} 格式不正确`)
      }
    }

    // Enum check
    if (rule.enum && !rule.enum.includes(value)) {
      throw new Error(`${rule.label || field} 值不在允许范围内`)
    }
  }

  return true
}

/**
 * Content safety check - filter sensitive/harmful content
 * Uses keyword-based filtering (production should use cloud content security API)
 * @param {string} content - Text content to check
 * @returns {boolean} true if safe
 */
const SENSITIVE_WORDS = [
  // Placeholder sensitive word list
  // In production, integrate with WeChat content security API (msgSecCheck)
]

function checkContentSafety(content) {
  if (!content || typeof content !== 'string') return true

  // Basic XSS prevention
  const xssPattern = /<script[\s\S]*?>[\s\S]*?<\/script>/gi
  if (xssPattern.test(content)) {
    throw new Error('内容包含不安全字符')
  }

  // SQL injection prevention
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi
  if (sqlPattern.test(content) && content.length < 20) {
    throw new Error('内容包含不安全字符')
  }

  // Check sensitive words
  for (const word of SENSITIVE_WORDS) {
    if (content.includes(word)) {
      throw new Error('内容包含敏感词汇，请修改后重新提交')
    }
  }

  return true
}

/**
 * Encrypt sensitive data (phone number, ID card number)
 * @param {string} plainText - Text to encrypt
 * @returns {string} Encrypted hex string
 */
function encryptData(plainText) {
  if (!plainText) return ''
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPT_KEY, ENCRYPT_IV)
    let encrypted = cipher.update(plainText, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  } catch (e) {
    console.error('Encrypt error:', e)
    return plainText
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted hex string
 * @returns {string} Decrypted plain text
 */
function decryptData(encryptedText) {
  if (!encryptedText) return ''
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPT_KEY, ENCRYPT_IV)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (e) {
    console.error('Decrypt error:', e)
    return encryptedText
  }
}

/**
 * Mask sensitive data for display
 * @param {string} data - Data to mask
 * @param {string} type - Type: 'phone', 'idcard', 'name'
 */
function maskData(data, type = 'phone') {
  if (!data) return ''
  if (type === 'phone' && data.length === 11) {
    return data.substring(0, 3) + '****' + data.substring(7)
  }
  if (type === 'idcard' && data.length >= 15) {
    return data.substring(0, 4) + '**********' + data.substring(data.length - 4)
  }
  if (type === 'name' && data.length >= 2) {
    return data[0] + '*'.repeat(data.length - 1)
  }
  return data
}

/**
 * Generate unique order/transaction number
 * @param {string} prefix - Prefix like 'TXN', 'WD'
 * @returns {string} Unique number
 */
function generateOrderNo(prefix = 'ORD') {
  const now = new Date()
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${dateStr}${random}`
}

/**
 * Prevent duplicate payment/operation
 * Uses idempotency key stored in DB
 * @param {string} idempotencyKey - Unique key for this operation
 * @param {number} expiryMs - Expiry time in ms (default 5 minutes)
 * @returns {boolean} true if operation can proceed
 */
async function checkIdempotency(idempotencyKey, expiryMs = 300000) {
  if (!idempotencyKey) return true

  const now = Date.now()
  const res = await db.collection('system_config')
    .where({
      config_key: `idempotency:${idempotencyKey}`,
      config_value: { expiry: db.command.gte(now) }
    })
    .count()

  if (res.total > 0) {
    throw new Error('请勿重复操作')
  }

  // Store idempotency key
  await db.collection('system_config').add({
    config_key: `idempotency:${idempotencyKey}`,
    config_value: { expiry: now + expiryMs },
    create_date: now
  })

  return true
}

/**
 * Record admin operation log
 * @param {Object} logData - Log data
 */
async function recordAdminLog(logData) {
  try {
    await db.collection('admin_logs').add({
      ...logData,
      create_date: Date.now()
    })
  } catch (e) {
    console.error('Record admin log failed:', e)
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
  rateLimit,
  validateParams,
  checkContentSafety,
  encryptData,
  decryptData,
  maskData,
  generateOrderNo,
  checkIdempotency,
  recordAdminLog
}
