
// Admin Dispute Management Cloud Object
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
   * Get disputes list
   */
  async getDisputes(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', status } = params
    const where = {}
    if (keyword) {
      where.$or = [
        { task_title: new RegExp(keyword, 'i') },
        { complainant_name: new RegExp(keyword, 'i') }
      ]
    }
    if (status) where.status = status

    const countRes = await db.collection('task_orders').where({ ...where, is_disputed: true }).count()
    const listRes = await db.collection('task_orders')
      .where({ ...where, is_disputed: true })
      .field({ task_id: 1, task_title: 1, complainant_name: 1, respondent_name: 1, dispute_reason: 1, dispute_status: 1, create_date: 1 })
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // Map fields for frontend compatibility
    const list = (listRes.data || []).map(item => ({
      ...item,
      reason: item.dispute_reason,
      status: item.dispute_status || 'pending'
    }))

    return { list, total: countRes.total || 0 }
  },

  /**
   * Get dispute detail
   */
  async getDisputeDetail(params = {}) {
    const { disputeId } = params
    if (!disputeId) throw new Error('Missing disputeId')

    const res = await db.collection('task_orders').doc(disputeId).get()
    const order = res.data?.[0]
    if (!order) throw new Error('Dispute not found')

    // Get related task info
    let taskInfo = null
    if (order.task_id) {
      const taskRes = await db.collection('tasks').doc(order.task_id).get()
      taskInfo = taskRes.data?.[0]
    }

    return {
      ...order,
      reason: order.dispute_reason,
      description: order.dispute_description,
      status: order.dispute_status || 'pending',
      evidence: order.dispute_evidence || [],
      handle_result: order.dispute_handle_result,
      handle_opinion: order.dispute_handle_opinion,
      handler_name: order.dispute_handler_name,
      handle_date: order.dispute_handle_date,
      task_info: taskInfo
    }
  },

  /**
   * Handle a dispute
   */
  async handleDispute(params = {}) {
    const { disputeId, result, opinion, refundAmount = 0 } = params
    if (!disputeId) throw new Error('Missing disputeId')
    if (!result) throw new Error('Missing result')
    if (!opinion) throw new Error('Missing opinion')

    const orderRes = await db.collection('task_orders').doc(disputeId).get()
    const order = orderRes.data?.[0]
    if (!order) throw new Error('Dispute order not found')

    const updateData = {
      dispute_status: 'resolved',
      dispute_handle_result: result,
      dispute_handle_opinion: opinion,
      dispute_handler_id: this.uid,
      dispute_handler_name: this.adminName,
      dispute_handle_date: Date.now(),
      update_date: Date.now()
    }

    // Handle refund based on result
    if (result === 'refund' && refundAmount > 0 && order.task_id) {
      const taskRes = await db.collection('tasks').doc(order.task_id).get()
      const task = taskRes.data?.[0]
      if (task && task.publisher_id) {
        // Refund to complainant (publisher) via user-profile
        await db.collection('user-profile').where({ user_id: task.publisher_id }).update({
          balance: dbCmd.inc(refundAmount),
          updated_at: Date.now()
        })
        await db.collection('transactions').add({
          user_id: task.publisher_id,
          type: 'refund',
          amount: refundAmount,
          description: `申诉裁决退款 - 任务「${task.title}」`,
          related_id: disputeId,
          create_date: Date.now()
        })
      }
      // Update task status
      await db.collection('tasks').doc(order.task_id).update({
        status: 'cancelled',
        update_date: Date.now()
      })
    } else if (result === 'split' && order.task_id) {
      const taskRes = await db.collection('tasks').doc(order.task_id).get()
      const task = taskRes.data?.[0]
      if (task) {
        const halfAmount = (task.reward || 0) / 2
        // Refund half to publisher
        if (task.publisher_id && halfAmount > 0) {
          await db.collection('user-profile').where({ user_id: task.publisher_id }).update({
            balance: dbCmd.inc(halfAmount),
            updated_at: Date.now()
          })
          await db.collection('transactions').add({
            user_id: task.publisher_id, type: 'refund', amount: halfAmount,
            description: `申诉裁决退款（50%）- 任务「${task.title}」`,
            related_id: disputeId, create_date: Date.now()
          })
        }
        // Pay half to taker
        if (order.taker_id && halfAmount > 0) {
          await db.collection('user-profile').where({ user_id: order.taker_id }).update({
            balance: dbCmd.inc(halfAmount),
            updated_at: Date.now()
          })
          await db.collection('transactions').add({
            user_id: order.taker_id, type: 'income', amount: halfAmount,
            description: `申诉裁决收入（50%）- 任务「${task.title}」`,
            related_id: disputeId, create_date: Date.now()
          })
        }
        await db.collection('tasks').doc(order.task_id).update({ status: 'cancelled', update_date: Date.now() })
      }
    } else if (result === 'reject') {
      // Dismiss the dispute, complete the task normally
      if (order.task_id) {
        await db.collection('tasks').doc(order.task_id).update({ status: 'completed', update_date: Date.now() })
      }
    }

    await db.collection('task_orders').doc(disputeId).update(updateData)

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid, operator_name: this.adminName,
      type: 'audit', module: 'dispute',
      description: `处理申诉 ${disputeId}，结果：${result}`,
      target_id: disputeId, create_date: Date.now()
    })

    return { success: true }
  }
}
