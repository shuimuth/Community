
// Admin User Management Cloud Object
const db = uniCloud.database()
const dbCmd = db.command

module.exports = {
  _before: async function() {
    const clientInfo = this.getClientInfo()
    const uniIdCommon = require('uni-id-common')
    const uniID = uniIdCommon.createInstance({ clientInfo })
    const payload = await uniID.checkToken(clientInfo.uniIdToken)
    if (payload.errCode) throw new Error('Unauthorized: Please login as admin')
    this.uid = payload.uid
    const userRes = await db.collection('uni-id-users').where({ _id: this.uid }).field({ role: 1 }).get()
    const user = userRes.data?.[0]
    if (!user?.role || (!user.role.includes('admin') && !user.role.includes('super_admin'))) {
      throw new Error('Unauthorized: Admin role required')
    }
  },

  /**
   * Get users list with pagination and search
   */
  async getUsers(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', status } = params
    const where = {}
    if (keyword) {
      where.nickname = new RegExp(keyword, 'i')
    }
    if (status !== undefined && status !== '') {
      where.status = parseInt(status)
    }

    const countRes = await db.collection('uni-id-users').where(where).count()
    const listRes = await db.collection('uni-id-users')
      .where(where)
      .field({ nickname: 1, avatar: 1, mobile: 1, status: 1, register_date: 1 })
      .orderBy('register_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // Merge with user-profile data
    const list = listRes.data || []
    for (const user of list) {
      const profileRes = await db.collection('user-profile').where({ user_id: user._id }).limit(1).get()
      const profile = profileRes.data?.[0] || {}
      user.credit_score = profile.credit_score || 100
      user.balance = profile.balance || 0
      user.is_verified = profile.is_verified || false
    }

    return {
      list: listRes.data || [],
      total: countRes.total || 0
    }
  },

  /**
   * Get user detail with stats
   */
  async getUserDetail(params = {}) {
    const { userId } = params
    if (!userId) throw new Error('Missing userId')

    const userRes = await db.collection('uni-id-users')
      .where({ _id: userId })
      .field({ nickname: 1, avatar: 1, mobile: 1, status: 1, register_date: 1, real_name: 1, community_id: 1, community_name: 1, role: 1 })
      .get()

    const user = userRes.data?.[0]
    if (!user) throw new Error('User not found')

    // Merge with user-profile data
    const profileRes = await db.collection('user-profile').where({ user_id: userId }).limit(1).get()
    const profile = profileRes.data?.[0] || {}
    user.credit_score = profile.credit_score || 100
    user.balance = profile.balance || 0
    user.frozen_balance = profile.frozen_balance || 0
    user.is_verified = profile.is_verified || false

    // Get user stats
    const [publishedRes, takenRes, completedRes, reviewRes] = await Promise.all([
      db.collection('tasks').where({ publisher_id: userId }).count(),
      db.collection('task_orders').where({ taker_id: userId }).count(),
      db.collection('task_orders').where({ taker_id: userId, status: 'completed' }).count(),
      db.collection('reviews').where({ target_user_id: userId }).field({ rating: 1 }).limit(100).get()
    ])

    const ratings = reviewRes.data?.map(r => r.rating) || []
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '-'

    return {
      user,
      stats: {
        publishedTasks: publishedRes.total,
        takenTasks: takenRes.total,
        completedTasks: completedRes.total,
        avgRating
      }
    }
  },

  /**
   * Toggle user status (enable/disable)
   */
  async toggleUserStatus(params = {}) {
    const { userId, status } = params
    if (!userId) throw new Error('Missing userId')

    await db.collection('uni-id-users').doc(userId).update({ status: parseInt(status) })

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid,
      operator_name: 'admin',
      type: 'update',
      module: 'user',
      description: `${status === 1 ? '禁用' : '启用'}用户 ${userId}`,
      target_id: userId,
      create_date: Date.now()
    })

    return { success: true }
  }
}
