// Cloud object: task-service
// Handles task creation, acceptance, draft management, payment flow

const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

/**
 * Get system config for task publishing (standalone function)
 */
async function _getTaskConfig() {
  const res = await db.collection('system_config')
    .where({ key: 'platform_config' })
    .limit(1)
    .get()

  if (res.data && res.data.length > 0) {
    const config = res.data[0]
    return {
      service_fee_rate: config.service_fee_rate || 0.1,
      min_reward: config.min_reward || 5,
      max_reward: config.max_reward || 1000,
      task_types: config.task_types || ['取快递', '接送小孩', '陪诊', '陪读', '代扔垃圾', '宠物喂养', '其他']
    }
  }

  return {
    service_fee_rate: 0.1,
    min_reward: 5,
    max_reward: 1000,
    task_types: ['取快递', '接送小孩', '陪诊', '陪读', '代扔垃圾', '宠物喂养', '其他']
  }
}

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
   * Get system config for task publishing
   */
  async getTaskConfig() {
    return await _getTaskConfig()
  },

  /**
   * Create a new task
   */
  async createTask(params) {
    const {
      title, task_type, custom_type, description,
      community_id, community_name, address,
      reward, images, expected_time
    } = params || {}

    // Validate required fields
    if (!title || title.length < 2 || title.length > 50) {
      throw new Error('Title must be 2-50 characters')
    }
    if (!task_type) {
      throw new Error('Task type is required')
    }
    if (!description || description.length < 10 || description.length > 500) {
      throw new Error('Description must be 10-500 characters')
    }
    if (!community_id) {
      throw new Error('Community is required')
    }
    if (!reward || reward < 5 || reward > 1000) {
      throw new Error('Reward must be between 5-1000')
    }

    // Check credit score and balance from user-profile
    const profileRes = await db.collection('user-profile').where({ user_id: this.uid }).limit(1).get()
    const profile = profileRes.data?.[0]
    if (profile && (profile.credit_score || 100) < 40) {
      throw new Error('Credit score too low to publish tasks')
    }

    // Check if publisher has enough balance to pay the reward
    if (!profile || (profile.balance || 0) < reward) {
      throw new Error('余额不足，请先充值')
    }

    // Get basic user info
    const userRes = await db.collection('uni-id-users').doc(this.uid).get()
    if (!userRes.data || userRes.data.length === 0) {
      throw new Error('User not found')
    }
    const user = userRes.data[0]

    // Get config for fee calculation
    // Service fee is deducted from the receiver's settlement, not charged to the publisher
    const config = await _getTaskConfig()
    const service_fee = Math.round(reward * config.service_fee_rate * 100) / 100
    const total_amount = reward

    // Generate order number
    const order_no = 'T' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase()

    // Create task record
    const taskData = {
      publisher_id: this.uid,
      publisher_name: user.nickname || user.real_name || '',
      publisher_avatar: user.avatar || '',
      community_id,
      community_name: community_name || '',
      task_type,
      custom_type: task_type === '其他' ? (custom_type || '') : '',
      title,
      description,
      images: images || [],
      address: address || '',
      reward,
      service_fee,
      total_amount,
      status: 'pending',
      expected_time: expected_time || null,
      order_no,
      is_draft: false,
      created_at: Date.now(),
      updated_at: Date.now()
    }

    const taskRes = await db.collection('tasks').add(taskData)

    // Create task order record
    // Publisher only pays the reward amount; service fee is deducted from receiver on settlement
    await db.collection('task_orders').add({
      task_id: taskRes.id,
      user_id: this.uid,
      order_no,
      amount: reward,
      reward,
      service_fee,
      service_fee_from: 'receiver',
      pay_type: 'wxpay',
      status: 'paid', // Simplified: mark as paid directly
      paid_at: Date.now(),
      created_at: Date.now()
    })

    // Deduct reward from publisher balance and update task count in user-profile
    await db.collection('user-profile').where({ user_id: this.uid }).update({
      balance: dbCmd.inc(-reward),
      task_published_count: dbCmd.inc(1),
      updated_at: Date.now()
    })

    // Create transaction record for publisher expense
    const updatedProfileRes = await db.collection('user-profile').where({ user_id: this.uid }).limit(1).get()
    const updatedProfile = updatedProfileRes.data?.[0] || {}
    await db.collection('transactions').add({
      user_id: this.uid,
      type: 'expense',
      amount: reward,
      balance_after: updatedProfile.balance || 0,
      related_id: taskRes.id,
      related_type: 'task',
      description: '发布任务"' + title + '"支付报酬',
      status: 'completed',
      created_at: Date.now()
    })

    // Update community task count
    await db.collection('communities').doc(community_id).update({
      task_count: dbCmd.inc(1)
    })

    return {
      success: true,
      task_id: taskRes.id,
      order_no,
      total_amount
    }
  },

  /**
   * Save task as draft
   */
  async saveDraft(params) {
    const {
      draft_id, title, task_type, custom_type, description,
      community_id, community_name, address,
      reward, images, expected_time
    } = params || {}

    // Get user info
    const userRes = await db.collection('uni-id-users').doc(this.uid).get()
    const user = userRes.data?.[0] || {}

    const draftData = {
      publisher_id: this.uid,
      publisher_name: user.nickname || user.real_name || '',
      publisher_avatar: user.avatar || '',
      community_id: community_id || '',
      community_name: community_name || '',
      task_type: task_type || '',
      custom_type: custom_type || '',
      title: title || '',
      description: description || '',
      images: images || [],
      address: address || '',
      reward: reward || 0,
      service_fee: 0,
      total_amount: 0,
      status: 'pending',
      expected_time: expected_time || null,
      is_draft: true,
      updated_at: Date.now()
    }

    if (draft_id) {
      await db.collection('tasks').doc(draft_id).update(draftData)
      return { success: true, draft_id }
    } else {
      draftData.created_at = Date.now()
      const res = await db.collection('tasks').add(draftData)
      return { success: true, draft_id: res.id }
    }
  },

  /**
   * Get user's draft
   */
  async getDraft() {
    const res = await db.collection('tasks')
      .where({
        publisher_id: this.uid,
        is_draft: true
      })
      .orderBy('updated_at', 'desc')
      .limit(1)
      .get()

    return res.data?.[0] || null
  },

  /**
   * Delete draft
   */
  async deleteDraft(params) {
    const { draft_id } = params || {}
    if (!draft_id) throw new Error('Draft ID is required')

    await db.collection('tasks').where({
      _id: draft_id,
      publisher_id: this.uid,
      is_draft: true
    }).remove()

    return { success: true }
  },

  /**
   * Accept a task
   */
  async acceptTask(params) {
    const { task_id } = params || {}
    if (!task_id) throw new Error('Task ID is required')

    // Get task
    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data || taskRes.data.length === 0) {
      throw new Error('Task not found')
    }
    const task = taskRes.data[0]

    // Validate
    if (task.publisher_id === this.uid) {
      throw new Error('Cannot accept your own task')
    }
    if (task.status !== 'pending') {
      throw new Error('Task is not available for acceptance')
    }
    if (task.is_draft) {
      throw new Error('Cannot accept a draft task')
    }

    // Check credit score from user-profile
    const profileRes2 = await db.collection('user-profile').where({ user_id: this.uid }).limit(1).get()
    const acceptProfile = profileRes2.data?.[0]
    if (acceptProfile && (acceptProfile.credit_score || 100) < 60) {
      throw new Error('Credit score too low to accept tasks')
    }

    // Get basic user info
    const userRes = await db.collection('uni-id-users').doc(this.uid).get()
    const user = userRes.data?.[0]
    if (!user) throw new Error('User not found')

    // Update task (atomic check to prevent race condition)
    const updateRes = await db.collection('tasks')
      .where({
        _id: task_id,
        status: 'pending'
      })
      .update({
        receiver_id: this.uid,
        receiver_name: user.nickname || user.real_name || '',
        receiver_avatar: user.avatar || '',
        status: 'in_progress',
        accepted_at: Date.now(),
        updated_at: Date.now()
      })

    if (updateRes.updated === 0) {
      throw new Error('Task has already been accepted by another user')
    }

    return { success: true }
  }
}
