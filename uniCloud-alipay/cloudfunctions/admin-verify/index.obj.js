// Admin Verify Management Cloud Object
// Handles realname authentication review for admin
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
    const userRes = await db.collection('uni-id-users').where({ _id: this.uid }).field({ role: 1, nickname: 1 }).get()
    const user = userRes.data?.[0]
    if (!user?.role || (!user.role.includes('admin') && !user.role.includes('super_admin'))) {
      throw new Error('Unauthorized: Admin role required')
    }
    this.adminName = user.nickname || 'admin'
  },

  /**
   * Get verifications list with pagination and filters
   * @param {object} params - { page, pageSize, keyword, status }
   * status: 1=pending, 2=approved, 3=rejected
   */
  async getVerifications(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', status } = params

    // Build query for users with realname_auth submitted
    const where = {
      'realname_auth.auth_status': dbCmd.in([1, 2, 3])
    }

    // Filter by auth_status
    if (status !== undefined && status !== null && status !== '') {
      where['realname_auth.auth_status'] = Number(status)
    }

    // Keyword search on real_name or identity
    if (keyword) {
      where.$or = [
        { 'realname_auth.real_name': new RegExp(keyword, 'i') },
        { 'realname_auth.identity': new RegExp(keyword, 'i') },
        { nickname: new RegExp(keyword, 'i') }
      ]
      // Remove the default status filter if keyword is provided but no status
      if (status === undefined || status === null || status === '') {
        // Keep the default in([1,2,3]) filter
      }
    }

    const countRes = await db.collection('uni-id-users')
      .where(where)
      .count()

    const listRes = await db.collection('uni-id-users')
      .where(where)
      .field({
        _id: 1,
        nickname: 1,
        avatar: 1,
        mobile: 1,
        realname_auth: 1,
        register_date: 1
      })
      .orderBy('realname_auth.auth_status', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // Transform data for frontend
    const list = (listRes.data || []).map(user => ({
      _id: user._id,
      nickname: user.nickname || '-',
      avatar: user.avatar || '',
      mobile: user.mobile || '-',
      real_name: user.realname_auth?.real_name || '-',
      identity: user.realname_auth?.identity || '-',
      auth_status: user.realname_auth?.auth_status || 0,
      id_card_front: user.realname_auth?.id_card_front || '',
      id_card_back: user.realname_auth?.id_card_back || '',
      in_hand: user.realname_auth?.in_hand || '',
      auth_date: user.realname_auth?.auth_date || null,
      register_date: user.register_date || null
    }))

    return { list, total: countRes.total || 0 }
  },

  /**
   * Approve a user's realname verification
   * @param {object} params - { userId }
   */
  async approveVerification(params = {}) {
    const { userId } = params
    if (!userId) throw new Error('Missing userId')

    // Get current user data
    const userRes = await db.collection('uni-id-users')
      .doc(userId)
      .field({ realname_auth: 1, nickname: 1 })
      .get()

    const user = userRes.data?.[0]
    if (!user) throw new Error('User not found')
    if (!user.realname_auth) throw new Error('User has no verification submission')
    if (user.realname_auth.auth_status !== 1) {
      throw new Error('Only pending verifications can be approved')
    }

    const now = Date.now()

    // Update realname_auth status to approved
    await db.collection('uni-id-users').doc(userId).update({
      'realname_auth.auth_status': 2,
      'realname_auth.auth_date': now,
      updated_at: now
    })

    // Update user-profile: set is_verified = true, credit_score +10
    const profileRes = await db.collection('user-profile')
      .where({ user_id: userId })
      .limit(1)
      .get()

    if (profileRes.data && profileRes.data.length > 0) {
      await db.collection('user-profile')
        .where({ user_id: userId })
        .update({
          is_verified: true,
          credit_score: dbCmd.inc(10),
          updated_at: now
        })
    }

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid,
      operator_name: this.adminName,
      type: 'audit',
      module: 'verify',
      description: `通过实名认证 - 用户 ${user.nickname || userId}（${user.realname_auth.real_name || '-'}）`,
      target_id: userId,
      create_date: now
    })

    return { success: true }
  },

  /**
   * Reject a user's realname verification
   * @param {object} params - { userId, reason }
   */
  async rejectVerification(params = {}) {
    const { userId, reason = '' } = params
    if (!userId) throw new Error('Missing userId')

    // Get current user data
    const userRes = await db.collection('uni-id-users')
      .doc(userId)
      .field({ realname_auth: 1, nickname: 1 })
      .get()

    const user = userRes.data?.[0]
    if (!user) throw new Error('User not found')
    if (!user.realname_auth) throw new Error('User has no verification submission')
    if (user.realname_auth.auth_status !== 1) {
      throw new Error('Only pending verifications can be rejected')
    }

    const now = Date.now()

    // Update realname_auth status to rejected
    await db.collection('uni-id-users').doc(userId).update({
      'realname_auth.auth_status': 3,
      'realname_auth.reject_reason': reason || '审核不通过',
      updated_at: now
    })

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid,
      operator_name: this.adminName,
      type: 'audit',
      module: 'verify',
      description: `拒绝实名认证 - 用户 ${user.nickname || userId}（${user.realname_auth.real_name || '-'}），原因：${reason || '审核不通过'}`,
      target_id: userId,
      create_date: now
    })

    return { success: true }
  }
}
