// Cloud object: user-center
// Handles user profile management, info completion, and login state

const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

/**
 * Helper: Get or create user profile from user-profile collection
 * @param {string} userId - The user ID
 * @returns {object} The user profile document
 */
async function _getOrCreateProfile(userId) {
  const res = await db.collection('user-profile')
    .where({ user_id: userId })
    .limit(1)
    .get()

  if (res.data && res.data.length > 0) {
    return res.data[0]
  }

  // Auto-create profile if not exists
  const now = Date.now()
  const defaultProfile = {
    user_id: userId,
    credit_score: 100,
    balance: 0,
    frozen_balance: 0,
    is_verified: false,
    points: 0,
    member_level: 0,
    is_merchant: false,
    task_published_count: 0,
    task_completed_count: 0,
    created_at: now,
    updated_at: now
  }
  const addRes = await db.collection('user-profile').add(defaultProfile)
  defaultProfile._id = addRes.id
  return defaultProfile
}

/**
 * Helper: Update user profile fields
 * @param {string} userId - The user ID
 * @param {object} data - Fields to update
 */
async function _updateProfile(userId, data) {
  data.updated_at = Date.now()
  await db.collection('user-profile')
    .where({ user_id: userId })
    .update(data)
}

module.exports = {
  _before: async function() {
    // Get client info
    const clientInfo = this.getClientInfo()
    // Create uni-id instance
    this.uniIdCommon = uniIdCommon.createInstance({
      clientInfo
    })
    // Verify token
    this.userInfo = await this.uniIdCommon.checkToken(clientInfo.uniIdToken)
    if (!this.userInfo || !this.userInfo.uid) {
      throw new Error('Unauthorized: Please login first')
    }
    this.uid = this.userInfo.uid
  },

  /**
   * Get current user info
   */
  async getUserInfo() {
    // Get basic user info from uni-id-users
    const res = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({
        _id: 1,
        nickname: 1,
        avatar: 1,
        avatar_file: 1,
        real_name: 1,
        mobile: 1,
        gender: 1,
        role: 1,
        status: 1,
        realname_auth: 1
      })
      .get()

    const user = (res.data && res.data.length > 0) ? res.data[0] : null
    if (!user) return null

    // Get extended profile from user-profile
    const profile = await _getOrCreateProfile(this.uid)

    // Merge user info and profile
    // Determine is_verified from realname_auth
    const isVerified = user.realname_auth?.auth_status === 2

    return {
      ...user,
      credit_score: profile.credit_score,
      balance: profile.balance,
      frozen_balance: profile.frozen_balance,
      is_verified: isVerified,
      points: profile.points,
      member_level: profile.member_level,
      is_merchant: profile.is_merchant
    }
  },

  /**
   * Complete user profile info
   */
  async completeProfile(params) {
    const { real_name, mobile, gender } = params || {}

    // Validate
    if (!real_name || real_name.length < 2 || real_name.length > 20) {
      throw new Error('Please enter a valid name (2-20 characters)')
    }
    if (!mobile || !/^1[3-9]\d{9}$/.test(mobile)) {
      throw new Error('Please enter a valid phone number')
    }
    if (![0, 1, 2].includes(gender)) {
      throw new Error('Please select a valid gender')
    }

    await db.collection('uni-id-users').doc(this.uid).update({
      real_name,
      mobile,
      gender,
      updated_at: Date.now()
    })

    return { success: true, message: 'Profile updated successfully' }
  },

  /**
   * Update user avatar
   */
  async updateAvatar(params) {
    const { avatar } = params || {}
    if (!avatar) {
      throw new Error('Avatar URL is required')
    }

    await db.collection('uni-id-users').doc(this.uid).update({
      avatar,
      updated_at: Date.now()
    })

    return { success: true }
  },

  /**
   * Get user's tasks (published or accepted)
   */
  async getMyTasks(params) {
    const { type = 'published', status = '', page = 1, pageSize = 20 } = params || {}

    const query = {}

    if (type === 'published') {
      query.publisher_id = this.uid
    } else if (type === 'accepted') {
      query.receiver_id = this.uid
    }

    if (status) {
      query.status = status
    }

    const countRes = await db.collection('tasks')
      .where(query)
      .count()

    const res = await db.collection('tasks')
      .where(query)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      data: res.data || [],
      count: countRes.total || 0
    }
  },

  /**
   * Get balance info with recent transactions
   */
  async getBalanceInfo() {
    // Get user balance from user-profile
    const profile = await _getOrCreateProfile(this.uid)

    // Get total income
    const incomeRes = await db.collection('transactions')
      .where({
        user_id: this.uid,
        type: 'income',
        status: 'completed'
      })
      .field({ amount: 1 })
      .get()

    let totalIncome = 0
    if (incomeRes.data) {
      totalIncome = incomeRes.data.reduce((sum, item) => sum + (item.amount || 0), 0)
    }

    // Get total withdraw
    const withdrawRes = await db.collection('transactions')
      .where({
        user_id: this.uid,
        type: 'withdraw',
        status: 'completed'
      })
      .field({ amount: 1 })
      .get()

    let totalWithdraw = 0
    if (withdrawRes.data) {
      totalWithdraw = withdrawRes.data.reduce((sum, item) => sum + (item.amount || 0), 0)
    }

    // Get recent 10 transactions
    const recentRes = await db.collection('transactions')
      .where({
        user_id: this.uid
      })
      .orderBy('created_at', 'desc')
      .limit(10)
      .get()

    return {
      balance: profile.balance || 0,
      frozen_balance: profile.frozen_balance || 0,
      total_income: totalIncome,
      total_withdraw: totalWithdraw,
      recent_transactions: recentRes.data || []
    }
  },

  /**
   * Get transaction records with pagination and type filter
   */
  async getTransactions(params) {
    const { type = '', page = 1, pageSize = 20 } = params || {}

    const query = { user_id: this.uid }

    if (type) {
      query.type = type
    }

    const countRes = await db.collection('transactions')
      .where(query)
      .count()

    const res = await db.collection('transactions')
      .where(query)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      data: res.data || [],
      count: countRes.total || 0
    }
  },

  /**
   * Get identity verification status from uni-id-users.realname_auth
   */
  async getVerifyStatus() {
    const res = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({ realname_auth: 1, mobile: 1 })
      .get()

    const user = (res.data && res.data.length > 0) ? res.data[0] : null
    const auth = user?.realname_auth || null

    return {
      auth_status: auth?.auth_status ?? 0,
      type: auth?.type ?? 0,
      real_name: auth?.real_name || '',
      identity: auth?.identity || '',
      id_card_front: auth?.id_card_front || '',
      id_card_back: auth?.id_card_back || '',
      in_hand: auth?.in_hand || '',
      auth_date: auth?.auth_date || null,
      mobile: user?.mobile || ''
    }
  },

  /**
   * Submit identity verification using uni-id-users.realname_auth
   */
  async submitVerification(params) {
    const { real_name, identity, id_card_front, id_card_back, in_hand } = params || {}

    // Validate name
    if (!real_name || real_name.length < 2 || real_name.length > 20) {
      throw new Error('请输入正确的姓名（2-20个字符）')
    }

    // Validate ID card number (18 digits, last one can be X)
    if (!identity || !/^\d{17}[\dXx]$/.test(identity)) {
      throw new Error('请输入正确的18位身份证号')
    }

    // Validate photos
    if (!id_card_front) {
      throw new Error('请上传身份证正面照片')
    }
    if (!id_card_back) {
      throw new Error('请上传身份证反面照片')
    }

    // Check current auth status
    const userRes = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({ realname_auth: 1 })
      .get()

    const currentAuth = (userRes.data && userRes.data.length > 0) ? userRes.data[0]?.realname_auth : null
    if (currentAuth?.auth_status === 2) {
      throw new Error('您已完成实名认证，无需重复认证')
    }
    if (currentAuth?.auth_status === 1) {
      throw new Error('您的认证正在审核中，请耐心等待')
    }

    // Check if ID card is already used by another user
    const existRes = await db.collection('uni-id-users')
      .where({
        _id: dbCmd.neq(this.uid),
        'realname_auth.identity': identity,
        'realname_auth.auth_status': dbCmd.in([1, 2])
      })
      .count()

    if (existRes.total > 0) {
      throw new Error('该身份证号已被其他账户使用')
    }

    // Update realname_auth in uni-id-users
    const now = Date.now()
    await db.collection('uni-id-users').doc(this.uid).update({
      realname_auth: {
        type: 0,
        auth_status: 1,
        real_name,
        identity,
        id_card_front: id_card_front || '',
        id_card_back: id_card_back || '',
        in_hand: in_hand || ''
      },
      real_name,
      updated_at: now
    })

    return { success: true, message: '认证资料已提交，请等待审核' }
  },

  /**
   * Update user nickname
   */
  async updateNickname(params) {
    const { nickname } = params || {}
    if (!nickname || nickname.length < 1 || nickname.length > 20) {
      throw new Error('昵称长度应在1-20个字符之间')
    }

    await db.collection('uni-id-users').doc(this.uid).update({
      nickname,
      updated_at: Date.now()
    })

    return { success: true }
  }
}
