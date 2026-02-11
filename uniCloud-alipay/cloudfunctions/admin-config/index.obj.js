
// Admin Config Management Cloud Object
const db = uniCloud.database()

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
   * Get system config
   */
  async getConfig() {
    const res = await db.collection('system_config')
      .where({ config_key: 'platform_settings' })
      .limit(1)
      .get()

    if (res.data?.length > 0) {
      return res.data[0].config_value || {}
    }

    // Return default config
    return {
      platform_fee_rate: 0.1,
      min_withdraw_amount: 10,
      min_reward: 1,
      max_reward: 5000,
      auto_confirm_hours: 24,
      max_task_images: 6,
      initial_credit_score: 100,
      credit_verify_bonus: 10,
      credit_complete_bonus: 2,
      credit_good_review_bonus: 3,
      credit_bad_review_penalty: 5,
      credit_cancel_penalty: 10,
      credit_complaint_penalty: 20,
      credit_limit_take_threshold: 60,
      credit_limit_publish_threshold: 40
    }
  },

  /**
   * Update system config
   */
  async updateConfig(params = {}) {
    const configValue = { ...params }
    delete configValue.config_key // Prevent key overwrite

    // Check if config exists
    const existRes = await db.collection('system_config')
      .where({ config_key: 'platform_settings' })
      .limit(1)
      .get()

    if (existRes.data?.length > 0) {
      await db.collection('system_config').doc(existRes.data[0]._id).update({
        config_value: configValue,
        update_date: Date.now(),
        updated_by: this.uid
      })
    } else {
      await db.collection('system_config').add({
        config_key: 'platform_settings',
        config_name: '平台设置',
        config_value: configValue,
        create_date: Date.now(),
        update_date: Date.now(),
        updated_by: this.uid
      })
    }

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid, operator_name: this.adminName,
      type: 'update', module: 'config',
      description: '更新系统配置',
      detail: configValue,
      create_date: Date.now()
    })

    return { success: true }
  }
}
