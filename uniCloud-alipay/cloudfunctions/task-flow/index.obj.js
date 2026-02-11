// Cloud object: task-flow
// Handles task status transitions, settlement, and reviews

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
   * Receiver confirms task as done
   */
  async receiverConfirm(params) {
    const { task_id } = params || {}
    if (!task_id) throw new Error('Task ID is required')

    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data || taskRes.data.length === 0) throw new Error('Task not found')
    const task = taskRes.data[0]

    if (task.receiver_id !== this.uid) throw new Error('Only the receiver can confirm completion')
    if (task.status !== 'in_progress') throw new Error('Task is not in progress')

    await db.collection('tasks').doc(task_id).update({
      status: 'waiting_confirm',
      receiver_confirmed_at: Date.now(),
      updated_at: Date.now()
    })

    // Create notification for publisher
    await db.collection('messages').add({
      user_id: task.publisher_id,
      title: '任务完成确认',
      content: `接单者已完成任务"${task.title}"，请确认`,
      type: 'task_completed',
      related_id: task_id,
      related_type: 'task',
      is_read: false,
      created_at: Date.now()
    })

    return { success: true }
  },

  /**
   * Publisher confirms task completion and triggers settlement
   */
  async publisherConfirm(params) {
    const { task_id } = params || {}
    if (!task_id) throw new Error('Task ID is required')

    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data || taskRes.data.length === 0) throw new Error('Task not found')
    const task = taskRes.data[0]

    if (task.publisher_id !== this.uid) throw new Error('Only the publisher can confirm')
    if (task.status !== 'waiting_confirm') throw new Error('Task is not waiting for confirmation')

    // Update task status
    await db.collection('tasks').doc(task_id).update({
      status: 'completed',
      completed_at: Date.now(),
      updated_at: Date.now()
    })

    // Settlement: transfer reward to receiver balance
    await db.collection('uni-id-users').doc(task.receiver_id).update({
      balance: dbCmd.inc(task.reward)
    })

    // Create transaction record for receiver (income)
    const receiverUser = await db.collection('uni-id-users').doc(task.receiver_id).get()
    await db.collection('transactions').add({
      user_id: task.receiver_id,
      type: 'income',
      amount: task.reward,
      balance_after: (receiverUser.data?.[0]?.balance || 0) + task.reward,
      related_id: task_id,
      related_type: 'task',
      description: `完成任务"${task.title}"获得报酬`,
      status: 'completed',
      created_at: Date.now()
    })

    // Update receiver task count
    await db.collection('uni-id-users').doc(task.receiver_id).update({
      task_completed_count: dbCmd.inc(1),
      credit_score: dbCmd.inc(2) // +2 for completing task
    })

    // Notify receiver
    await db.collection('messages').add({
      user_id: task.receiver_id,
      title: '任务报酬到账',
      content: `任务"${task.title}"已完成，报酬 ¥${task.reward} 已到账`,
      type: 'task_confirmed',
      related_id: task_id,
      related_type: 'task',
      is_read: false,
      created_at: Date.now()
    })

    return { success: true }
  },

  /**
   * Cancel task (publisher only, before being accepted or during)
   */
  async cancelTask(params) {
    const { task_id, reason } = params || {}
    if (!task_id) throw new Error('Task ID is required')

    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data || taskRes.data.length === 0) throw new Error('Task not found')
    const task = taskRes.data[0]

    if (task.publisher_id !== this.uid) throw new Error('Only the publisher can cancel')
    if (!['pending', 'in_progress'].includes(task.status)) {
      throw new Error('Task cannot be cancelled in current status')
    }

    // Update task status
    await db.collection('tasks').doc(task_id).update({
      status: 'cancelled',
      cancelled_at: Date.now(),
      cancel_reason: reason || 'Publisher cancelled',
      updated_at: Date.now()
    })

    // Refund - create refund transaction for publisher
    const publisherUser = await db.collection('uni-id-users').doc(task.publisher_id).get()
    const refundAmount = task.total_amount || (task.reward + (task.service_fee || 0))

    await db.collection('transactions').add({
      user_id: task.publisher_id,
      type: 'refund',
      amount: refundAmount,
      balance_after: (publisherUser.data?.[0]?.balance || 0) + refundAmount,
      related_id: task_id,
      related_type: 'task',
      description: `取消任务"${task.title}"退款`,
      status: 'completed',
      created_at: Date.now()
    })

    // Update publisher balance (refund)
    await db.collection('uni-id-users').doc(task.publisher_id).update({
      balance: dbCmd.inc(refundAmount)
    })

    // Update order status
    await db.collection('task_orders').where({
      task_id: task_id
    }).update({
      status: 'refunded',
      refunded_at: Date.now(),
      updated_at: Date.now()
    })

    // Notify receiver if task was in progress
    if (task.receiver_id) {
      await db.collection('messages').add({
        user_id: task.receiver_id,
        title: '任务已取消',
        content: `任务"${task.title}"已被发布者取消`,
        type: 'task_cancelled',
        related_id: task_id,
        related_type: 'task',
        is_read: false,
        created_at: Date.now()
      })
    }

    // Decrease community task count
    await db.collection('communities').doc(task.community_id).update({
      task_count: dbCmd.inc(-1)
    })

    return { success: true }
  },

  /**
   * Publisher disputes task
   */
  async dispute(params) {
    const { task_id, reason } = params || {}
    if (!task_id) throw new Error('Task ID is required')

    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data || taskRes.data.length === 0) throw new Error('Task not found')
    const task = taskRes.data[0]

    if (task.publisher_id !== this.uid) throw new Error('Only the publisher can dispute')
    if (task.status !== 'waiting_confirm') throw new Error('Can only dispute tasks waiting for confirmation')

    await db.collection('tasks').doc(task_id).update({
      status: 'disputed',
      updated_at: Date.now()
    })

    // Notify receiver
    await db.collection('messages').add({
      user_id: task.receiver_id,
      title: '任务申诉',
      content: `发布者对任务"${task.title}"发起了申诉`,
      type: 'system',
      related_id: task_id,
      related_type: 'task',
      is_read: false,
      created_at: Date.now()
    })

    return { success: true }
  },

  /**
   * Submit review after task completion
   */
  async submitReview(params) {
    const { task_id, rating, content } = params || {}
    if (!task_id) throw new Error('Task ID is required')
    if (!rating || rating < 1 || rating > 5) throw new Error('Rating must be 1-5')

    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data || taskRes.data.length === 0) throw new Error('Task not found')
    const task = taskRes.data[0]

    if (task.status !== 'completed') throw new Error('Can only review completed tasks')

    // Determine reviewer role
    let reviewer_role, reviewee_id
    if (task.publisher_id === this.uid) {
      reviewer_role = 'publisher'
      reviewee_id = task.receiver_id
    } else if (task.receiver_id === this.uid) {
      reviewer_role = 'receiver'
      reviewee_id = task.publisher_id
    } else {
      throw new Error('Only task participants can submit reviews')
    }

    // Check duplicate review
    const existRes = await db.collection('reviews').where({
      task_id, reviewer_id: this.uid
    }).count()
    if (existRes.total > 0) throw new Error('You have already reviewed this task')

    // Get reviewer info
    const userRes = await db.collection('uni-id-users').doc(this.uid).get()
    const user = userRes.data?.[0] || {}

    // Create review
    await db.collection('reviews').add({
      task_id,
      reviewer_id: this.uid,
      reviewee_id,
      reviewer_role,
      rating,
      content: content || '',
      reviewer_name: user.nickname || user.real_name || '',
      reviewer_avatar: user.avatar || '',
      created_at: Date.now()
    })

    // Update reviewee credit score
    let creditChange = 0
    if (rating >= 4) creditChange = 3   // Good review
    else if (rating <= 2) creditChange = -5  // Bad review

    if (creditChange !== 0) {
      await db.collection('uni-id-users').doc(reviewee_id).update({
        credit_score: dbCmd.inc(creditChange)
      })
    }

    // Notify reviewee
    await db.collection('messages').add({
      user_id: reviewee_id,
      title: '收到新评价',
      content: `您收到了一个${rating}星评价`,
      type: 'review_received',
      related_id: task_id,
      related_type: 'review',
      is_read: false,
      created_at: Date.now()
    })

    return { success: true }
  }
}
