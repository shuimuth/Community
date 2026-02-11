// Cloud object: user-center
// Handles user profile management, info completion, and login state

const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

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
        credit_score: 1,
        balance: 1,
        frozen_balance: 1,
        is_verified: 1,
        points: 1,
        member_level: 1,
        is_merchant: 1,
        role: 1,
        status: 1
      })
      .get()

    if (res.data && res.data.length > 0) {
      return res.data[0]
    }
    return null
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
    // Get user balance
    const userRes = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({
        balance: 1,
        frozen_balance: 1
      })
      .get()

    const user = userRes.data && userRes.data[0] ? userRes.data[0] : {}

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
      balance: user.balance || 0,
      frozen_balance: user.frozen_balance || 0,
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
   * Get identity verification status
   */
  async getVerifyStatus() {
    const res = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({
        is_verified: 1,
        real_name: 1,
        id_card: 1,
        verified_at: 1
      })
      .get()

    if (res.data && res.data.length > 0) {
      return res.data[0]
    }
    return { is_verified: false }
  },

  /**
   * Submit identity verification
   */
  async submitVerification(params) {
    const { real_name, id_card } = params || {}

    // Validate name
    if (!real_name || real_name.length < 2 || real_name.length > 20) {
      throw new Error('请输入正确的姓名（2-20个字符）')
    }

    // Validate ID card (18 digits, last one can be X)
    if (!id_card || !/^\d{17}[\dXx]$/.test(id_card)) {
      throw new Error('请输入正确的18位身份证号')
    }

    // Check if already verified
    const userRes = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({ is_verified: 1 })
      .get()

    if (userRes.data && userRes.data[0] && userRes.data[0].is_verified) {
      throw new Error('您已完成实名认证，无需重复认证')
    }

    // Check if ID card is already used by another user
    const existRes = await db.collection('uni-id-users')
      .where({
        id_card: id_card,
        _id: dbCmd.neq(this.uid)
      })
      .count()

    if (existRes.total > 0) {
      throw new Error('该身份证号已被其他账户使用')
    }

    // Update user with verification info
    // In production, you should call a third-party ID verification API here
    const now = Date.now()
    await db.collection('uni-id-users').doc(this.uid).update({
      real_name,
      id_card,
      is_verified: true,
      verified_at: now,
      // Add credit score for verification
      credit_score: dbCmd.inc(10),
      updated_at: now
    })

    return { success: true, message: '实名认证成功' }
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
