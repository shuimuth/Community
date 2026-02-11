
// Cloud object: notification-service
// Handles message creation, subscription message sending, and notification management

const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

// Message type configurations
const MESSAGE_CONFIG = {
  task_accepted: {
    title: '任务已被接单',
    template: (data) => `您发布的任务「${data.task_title}」已被${data.receiver_name || '用户'}接单`
  },
  task_completed: {
    title: '任务已完成',
    template: (data) => `任务「${data.task_title}」接单人已提交完成，请确认`
  },
  task_cancelled: {
    title: '任务已取消',
    template: (data) => `任务「${data.task_title}」已被取消，费用将原路退回`
  },
  task_confirmed: {
    title: '任务确认完成',
    template: (data) => `任务「${data.task_title}」已确认完成，报酬已到账`
  },
  withdraw_result: {
    title: '提现结果通知',
    template: (data) => `您的提现申请${data.status === 'approved' ? '已通过，预计1-3个工作日到账' : '已被拒绝：' + (data.reason || '')}`
  },
  review_received: {
    title: '收到新评价',
    template: (data) => `您在任务「${data.task_title}」中收到了${data.score}星评价`
  },
  system: {
    title: '系统通知',
    template: (data) => data.content || '您有一条新的系统通知'
  }
}

module.exports = {
  _before: async function() {
    const clientInfo = this.getClientInfo()
    this.clientInfo = clientInfo
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo })

    // Token verification is optional for internal calls
    try {
      this.userInfo = await this.uniIdCommon.checkToken(clientInfo.uniIdToken)
      this.uid = this.userInfo?.uid || null
    } catch (e) {
      this.uid = null
    }
  },

  /**
   * Send a notification message to a user
   * @param {object} params
   * @param {string} params.user_id - Target user ID
   * @param {string} params.type - Message type
   * @param {object} params.data - Message data (task_title, etc.)
   * @param {string} params.related_id - Related entity ID (task_id, etc.)
   * @param {string} params.related_type - Related entity type ('task', 'withdraw', etc.)
   */
  async sendNotification(params) {
    const { user_id, type, data = {}, related_id = '', related_type = '' } = params || {}

    if (!user_id) throw new Error('Target user ID is required')
    if (!type || !MESSAGE_CONFIG[type]) throw new Error('Invalid message type')

    const config = MESSAGE_CONFIG[type]
    const now = Date.now()

    const messageData = {
      user_id,
      type,
      title: data.title || config.title,
      content: config.template(data),
      related_id,
      related_type,
      is_read: false,
      created_at: now,
      updated_at: now
    }

    const res = await db.collection('messages').add(messageData)

    // Try to send WeChat subscription message (non-blocking)
    this._sendSubscriptionMessage(user_id, type, data).catch(e => {
      console.warn('Send subscription message failed:', e.message)
    })

    return { success: true, message_id: res.id }
  },

  /**
   * Batch send notifications (e.g., for system announcements)
   */
  async sendBatchNotification(params) {
    const { user_ids = [], type, data = {}, related_id = '', related_type = '' } = params || {}

    if (!user_ids.length) throw new Error('At least one user ID is required')
    if (!type || !MESSAGE_CONFIG[type]) throw new Error('Invalid message type')

    const config = MESSAGE_CONFIG[type]
    const now = Date.now()

    const messages = user_ids.map(user_id => ({
      user_id,
      type,
      title: data.title || config.title,
      content: config.template(data),
      related_id,
      related_type,
      is_read: false,
      created_at: now,
      updated_at: now
    }))

    // Batch insert
    for (const msg of messages) {
      await db.collection('messages').add(msg)
    }

    return { success: true, count: messages.length }
  },

  /**
   * Get messages for current user
   */
  async getMessages(params) {
    if (!this.uid) throw new Error('Unauthorized')

    const { page = 1, pageSize = 20, type = '' } = params || {}

    const query = { user_id: this.uid }
    if (type) {
      query.type = type
    }

    const countRes = await db.collection('messages')
      .where(query)
      .count()

    const res = await db.collection('messages')
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
   * Get unread message count
   */
  async getUnreadCount() {
    if (!this.uid) throw new Error('Unauthorized')

    const res = await db.collection('messages')
      .where({
        user_id: this.uid,
        is_read: false
      })
      .count()

    return { count: res.total || 0 }
  },

  /**
   * Mark a single message as read
   */
  async markAsRead(params) {
    if (!this.uid) throw new Error('Unauthorized')

    const { message_id } = params || {}
    if (!message_id) throw new Error('Message ID is required')

    await db.collection('messages').doc(message_id).update({
      is_read: true,
      updated_at: Date.now()
    })

    return { success: true }
  },

  /**
   * Mark all messages as read
   */
  async markAllAsRead() {
    if (!this.uid) throw new Error('Unauthorized')

    await db.collection('messages')
      .where({
        user_id: this.uid,
        is_read: false
      })
      .update({
        is_read: true,
        updated_at: Date.now()
      })

    return { success: true }
  },

  /**
   * Delete a message
   */
  async deleteMessage(params) {
    if (!this.uid) throw new Error('Unauthorized')

    const { message_id } = params || {}
    if (!message_id) throw new Error('Message ID is required')

    // Verify ownership
    const msgRes = await db.collection('messages').doc(message_id).get()
    if (!msgRes.data || msgRes.data.length === 0) {
      throw new Error('消息不存在')
    }
    if (msgRes.data[0].user_id !== this.uid) {
      throw new Error('无权删除此消息')
    }

    await db.collection('messages').doc(message_id).remove()
    return { success: true }
  },

  /**
   * Internal: Send WeChat subscription message
   * In production, this should use the WeChat subscription message API
   */
  async _sendSubscriptionMessage(userId, type, data) {
    // Get user's openid
    const userRes = await db.collection('uni-id-users')
      .doc(userId)
      .field({ wx_openid: 1 })
      .get()

    if (!userRes.data || !userRes.data[0] || !userRes.data[0].wx_openid) {
      return // User has no WeChat openid, skip
    }

    const openid = userRes.data[0].wx_openid['mp-weixin']
    if (!openid) return

    // WeChat subscription message template mapping
    // In production, configure actual template IDs from WeChat MP backend
    const templateMap = {
      task_accepted: {
        template_id: 'TEMPLATE_ID_TASK_ACCEPTED',
        dataBuilder: (d) => ({
          thing1: { value: d.task_title?.substring(0, 20) || '任务' },
          name2: { value: d.receiver_name?.substring(0, 20) || '用户' },
          time3: { value: new Date().toLocaleString('zh-CN') }
        })
      },
      task_completed: {
        template_id: 'TEMPLATE_ID_TASK_COMPLETED',
        dataBuilder: (d) => ({
          thing1: { value: d.task_title?.substring(0, 20) || '任务' },
          phrase2: { value: '待确认' },
          time3: { value: new Date().toLocaleString('zh-CN') }
        })
      },
      task_confirmed: {
        template_id: 'TEMPLATE_ID_TASK_CONFIRMED',
        dataBuilder: (d) => ({
          thing1: { value: d.task_title?.substring(0, 20) || '任务' },
          amount2: { value: `${d.reward || 0}元` },
          time3: { value: new Date().toLocaleString('zh-CN') }
        })
      },
      withdraw_result: {
        template_id: 'TEMPLATE_ID_WITHDRAW',
        dataBuilder: (d) => ({
          amount1: { value: `${d.amount || 0}元` },
          phrase2: { value: d.status === 'approved' ? '已通过' : '已拒绝' },
          time3: { value: new Date().toLocaleString('zh-CN') }
        })
      }
    }

    const tmpl = templateMap[type]
    if (!tmpl) return // No template for this message type

    // In production, call WeChat API:
    // await uniCloud.httpclient.request('https://api.weixin.qq.com/cgi-bin/message/subscribe/send', { ... })
    console.log(`[Subscription Message] Would send to ${openid}, template: ${tmpl.template_id}`)
  }
}
