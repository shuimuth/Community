// Cloud object: task-query
// Handles task listing, search, and filtering

const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

module.exports = {
  _before: async function() {
    const clientInfo = this.getClientInfo()
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo })
    // Token check is optional for task browsing (allow anonymous read)
    try {
      this.userInfo = await this.uniIdCommon.checkToken(clientInfo.uniIdToken)
      this.uid = this.userInfo?.uid || null
    } catch (e) {
      this.uid = null
    }
  },

  /**
   * Get task list by user's communities
   */
  async getTaskList(params) {
    const {
      community_ids, task_type, status,
      page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc'
    } = params || {}

    let filter = {
      is_draft: false
    }

    // Filter by community
    if (community_ids && community_ids.length > 0) {
      filter.community_id = dbCmd.in(community_ids)
    }

    // Filter by task type
    if (task_type && task_type !== 'all') {
      filter.task_type = task_type
    }

    // Filter by status
    if (status && status !== 'all') {
      filter.status = status
    } else {
      // Default: only show pending tasks in hall
      filter.status = 'pending'
    }

    const countRes = await db.collection('tasks')
      .where(filter)
      .count()

    const dataRes = await db.collection('tasks')
      .where(filter)
      .orderBy(sortBy, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({
        _id: 1, title: 1, task_type: 1, custom_type: 1,
        community_name: 1, reward: 1, status: 1,
        publisher_name: 1, publisher_avatar: 1,
        expected_time: 1, created_at: 1,
        images: 1, address: 1
      })
      .get()

    return {
      data: dataRes.data || [],
      total: countRes.total || 0
    }
  },

  /**
   * Search tasks by keyword
   */
  async searchTasks(params) {
    const {
      keyword, community_ids, task_type,
      min_reward, max_reward,
      page = 1, pageSize = 20
    } = params || {}

    let filter = {
      is_draft: false,
      status: 'pending'
    }

    // Filter by community
    if (community_ids && community_ids.length > 0) {
      filter.community_id = dbCmd.in(community_ids)
    }

    // Filter by task type
    if (task_type && task_type !== 'all') {
      filter.task_type = task_type
    }

    // Filter by reward range
    if (min_reward !== undefined && max_reward !== undefined) {
      filter.reward = dbCmd.gte(min_reward).and(dbCmd.lte(max_reward))
    } else if (min_reward !== undefined) {
      filter.reward = dbCmd.gte(min_reward)
    } else if (max_reward !== undefined) {
      filter.reward = dbCmd.lte(max_reward)
    }

    // Keyword search (title or description)
    if (keyword) {
      const reg = new RegExp(keyword, 'i')
      filter = {
        ...filter,
        ...{
          $or: [
            { title: reg },
            { description: reg }
          ]
        }
      }
    }

    const countRes = await db.collection('tasks')
      .where(filter)
      .count()

    const dataRes = await db.collection('tasks')
      .where(filter)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({
        _id: 1, title: 1, task_type: 1, custom_type: 1,
        community_name: 1, reward: 1, status: 1,
        publisher_name: 1, publisher_avatar: 1,
        expected_time: 1, created_at: 1,
        images: 1, address: 1, description: 1
      })
      .get()

    return {
      data: dataRes.data || [],
      total: countRes.total || 0
    }
  },

  /**
   * Get task detail
   */
  async getTaskDetail(params) {
    const { task_id } = params || {}
    if (!task_id) throw new Error('Task ID is required')

    const res = await db.collection('tasks').doc(task_id).get()
    // Compatible with both array and single object return formats
    const task = Array.isArray(res.data) ? res.data[0] : res.data
    if (!task) {
      throw new Error('Task not found, task_id=' + task_id)
    }

    // Get publisher info
    let publisher = null
    if (task.publisher_id) {
      const pubRes = await db.collection('uni-id-users')
        .doc(task.publisher_id)
        .field({
          _id: 1, nickname: 1, avatar: 1, mobile: 1
        })
        .get()
      publisher = pubRes.data?.[0] || null

      // Get publisher profile from user-profile
      if (publisher) {
        const pubProfileRes = await db.collection('user-profile')
          .where({ user_id: task.publisher_id })
          .limit(1)
          .get()
        const pubProfile = pubProfileRes.data?.[0] || {}
        publisher.credit_score = pubProfile.credit_score || 100
        publisher.task_published_count = pubProfile.task_published_count || 0
        publisher.task_completed_count = pubProfile.task_completed_count || 0
      }
    }

    // Get receiver info if exists
    let receiver = null
    if (task.receiver_id) {
      const recRes = await db.collection('uni-id-users')
        .doc(task.receiver_id)
        .field({
          _id: 1, nickname: 1, avatar: 1
        })
        .get()
      receiver = recRes.data?.[0] || null

      // Get receiver profile from user-profile
      if (receiver) {
        const recProfileRes = await db.collection('user-profile')
          .where({ user_id: task.receiver_id })
          .limit(1)
          .get()
        const recProfile = recProfileRes.data?.[0] || {}
        receiver.credit_score = recProfile.credit_score || 100
        receiver.task_completed_count = recProfile.task_completed_count || 0
      }
    }

    return {
      ...task,
      publisher,
      receiver,
      is_publisher: this.uid === task.publisher_id,
      is_receiver: this.uid === task.receiver_id
    }
  },

  /**
   * Get user's tasks (published or accepted)
   */
  async getMyTasks(params) {
    const { type = 'published', status, page = 1, pageSize = 20 } = params || {}

    if (!this.uid) throw new Error('Unauthorized')

    let filter = { is_draft: false }

    if (type === 'published') {
      filter.publisher_id = this.uid
    } else {
      filter.receiver_id = this.uid
    }

    if (status && status !== 'all') {
      filter.status = status
    }

    const countRes = await db.collection('tasks').where(filter).count()

    const dataRes = await db.collection('tasks')
      .where(filter)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({
        _id: 1, title: 1, task_type: 1, custom_type: 1,
        community_name: 1, reward: 1, status: 1,
        publisher_name: 1, publisher_avatar: 1,
        receiver_name: 1, receiver_avatar: 1,
        expected_time: 1, created_at: 1,
        accepted_at: 1, completed_at: 1
      })
      .get()

    return {
      data: dataRes.data || [],
      total: countRes.total || 0
    }
  }
}
