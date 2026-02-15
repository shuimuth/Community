
// Admin Withdraw Management Cloud Object
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
   * Get withdrawals list
   */
  async getWithdrawals(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', status } = params
    const where = {}
    if (keyword) {
      where.user_name = new RegExp(keyword, 'i')
    }
    if (status) where.status = status

    const countRes = await db.collection('withdrawals').where(where).count()
    const listRes = await db.collection('withdrawals')
      .where(where)
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { list: listRes.data || [], total: countRes.total || 0 }
  },

  /**
   * Approve withdrawal
   */
  async approveWithdraw(params = {}) {
    const { withdrawId } = params
    if (!withdrawId) throw new Error('Missing withdrawId')

    const wRes = await db.collection('withdrawals').doc(withdrawId).get()
    const withdrawal = wRes.data?.[0]
    if (!withdrawal) throw new Error('Withdrawal not found')
    if (withdrawal.status !== 'pending') throw new Error('Withdrawal is not pending')

    await db.collection('withdrawals').doc(withdrawId).update({
      status: 'approved',
      handler_id: this.uid,
      handler_name: this.adminName,
      handle_date: Date.now(),
      update_date: Date.now()
    })

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid, operator_name: this.adminName,
      type: 'audit', module: 'withdraw',
      description: `通过提现申请 ¥${(withdrawal.amount || 0).toFixed(2)} - 用户 ${withdrawal.user_name || withdrawal.user_id}`,
      target_id: withdrawId, create_date: Date.now()
    })

    return { success: true }
  },

  /**
   * Reject withdrawal
   */
  async rejectWithdraw(params = {}) {
    const { withdrawId, reason = '' } = params
    if (!withdrawId) throw new Error('Missing withdrawId')

    const wRes = await db.collection('withdrawals').doc(withdrawId).get()
    const withdrawal = wRes.data?.[0]
    if (!withdrawal) throw new Error('Withdrawal not found')
    if (withdrawal.status !== 'pending') throw new Error('Withdrawal is not pending')

    // Return frozen amount to user balance
    if (withdrawal.user_id && withdrawal.amount) {
      await db.collection('user-profile').where({ user_id: withdrawal.user_id }).update({
        balance: dbCmd.inc(withdrawal.amount),
        frozen_balance: dbCmd.inc(-withdrawal.amount),
        updated_at: Date.now()
      })
      // Record transaction
      await db.collection('transactions').add({
        user_id: withdrawal.user_id,
        type: 'refund',
        amount: withdrawal.amount,
        description: `提现申请被拒绝，退回余额。原因：${reason || '审核不通过'}`,
        related_id: withdrawId,
        create_date: Date.now()
      })
    }

    await db.collection('withdrawals').doc(withdrawId).update({
      status: 'rejected',
      reject_reason: reason,
      handler_id: this.uid,
      handler_name: this.adminName,
      handle_date: Date.now(),
      update_date: Date.now()
    })

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid, operator_name: this.adminName,
      type: 'audit', module: 'withdraw',
      description: `拒绝提现申请 ¥${(withdrawal.amount || 0).toFixed(2)} - 原因：${reason}`,
      target_id: withdrawId, create_date: Date.now()
    })

    return { success: true }
  }
}
