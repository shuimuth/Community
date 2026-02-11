
// Admin Task Management Cloud Object
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
   * Get tasks list
   */
  async getTasks(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', status, category } = params
    const where = {}
    if (keyword) {
      where.title = new RegExp(keyword, 'i')
    }
    if (status) where.status = status
    if (category) where.category = category

    const countRes = await db.collection('tasks').where(where).count()
    const listRes = await db.collection('tasks')
      .where(where)
      .field({ title: 1, category: 1, reward: 1, status: 1, publisher_id: 1, publisher_name: 1, taker_name: 1, community_name: 1, create_date: 1, deadline: 1 })
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { list: listRes.data || [], total: countRes.total || 0 }
  },

  /**
   * Get task detail
   */
  async getTaskDetail(params = {}) {
    const { taskId } = params
    if (!taskId) throw new Error('Missing taskId')

    const taskRes = await db.collection('tasks').doc(taskId).get()
    return taskRes.data?.[0] || null
  },

  /**
   * Force cancel a task (admin action)
   */
  async forceCancel(params = {}) {
    const { taskId } = params
    if (!taskId) throw new Error('Missing taskId')

    const taskRes = await db.collection('tasks').doc(taskId).get()
    const task = taskRes.data?.[0]
    if (!task) throw new Error('Task not found')

    // Update task status
    await db.collection('tasks').doc(taskId).update({
      status: 'cancelled',
      cancel_reason: '管理员强制取消',
      update_date: Date.now()
    })

    // If task was paid, refund to publisher
    if (task.status === 'in_progress' || task.status === 'waiting_confirm') {
      if (task.reward && task.publisher_id) {
        await db.collection('uni-id-users').doc(task.publisher_id).update({
          balance: dbCmd.inc(task.reward)
        })
        // Record transaction
        await db.collection('transactions').add({
          user_id: task.publisher_id,
          type: 'refund',
          amount: task.reward,
          description: `任务「${task.title}」被管理员取消，退款`,
          related_id: taskId,
          create_date: Date.now()
        })
      }
    }

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid,
      operator_name: 'admin',
      type: 'update',
      module: 'task',
      description: `强制取消任务「${task.title}」`,
      target_id: taskId,
      create_date: Date.now()
    })

    return { success: true }
  }
}
