
// Cloud object: finance-service
// Handles withdrawal requests, balance operations, and transaction records

const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

module.exports = {
  _before: async function() {
    const clientInfo = this.getClientInfo()
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo })
    this.userInfo = await this.uniIdCommon.checkToken(clientInfo.uniIdToken)
    if (!this.userInfo || !this.userInfo.uid) {
      throw new Error('Unauthorized: Please login first')
    }
    this.uid = this.userInfo.uid
  },

  /**
   * Submit a withdrawal request
   */
  async submitWithdraw(params) {
    const { amount, method = 'wechat' } = params || {}

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('请输入有效的提现金额')
    }

    const MIN_WITHDRAW = 10
    if (amount < MIN_WITHDRAW) {
      throw new Error(`最低提现金额为${MIN_WITHDRAW}元`)
    }

    // Check user balance and verification status
    const userRes = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({ balance: 1, is_verified: 1, real_name: 1 })
      .get()

    const user = userRes.data && userRes.data[0]
    if (!user) {
      throw new Error('用户不存在')
    }

    if (!user.is_verified) {
      throw new Error('请先完成实名认证')
    }

    if ((user.balance || 0) < amount) {
      throw new Error('余额不足')
    }

    const now = Date.now()

    // Use transaction to ensure atomicity
    const transaction = await db.startTransaction()
    try {
      // Deduct balance
      await transaction.collection('uni-id-users').doc(this.uid).update({
        balance: dbCmd.inc(-amount),
        updated_at: now
      })

      // Create withdrawal record
      const withdrawalData = {
        user_id: this.uid,
        amount,
        method,
        real_name: user.real_name || '',
        status: 'pending',
        created_at: now,
        updated_at: now
      }

      await transaction.collection('withdrawals').add(withdrawalData)

      // Create transaction record
      const transactionData = {
        user_id: this.uid,
        type: 'withdraw',
        amount,
        description: `提现到${method === 'wechat' ? '微信零钱' : '银行卡'}`,
        status: 'pending',
        created_at: now
      }

      await transaction.collection('transactions').add(transactionData)

      await transaction.commit()

      return { success: true, message: '提现申请已提交' }
    } catch (e) {
      await transaction.rollback()
      throw new Error('提现申请失败，请稍后重试')
    }
  },

  /**
   * Get withdrawal records
   */
  async getWithdrawals(params) {
    const { status = '', page = 1, pageSize = 20 } = params || {}

    const query = { user_id: this.uid }
    if (status) {
      query.status = status
    }

    const countRes = await db.collection('withdrawals')
      .where(query)
      .count()

    const res = await db.collection('withdrawals')
      .where(query)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      data: res.data || [],
      count: countRes.total || 0
    }
  }
}
