
// Cloud object: credit-service
// Handles credit score calculation, reviews management, and user profile

const uniIdCommon = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const $ = db.command.aggregate

// Credit score change values
const CREDIT_CHANGES = {
  REGISTER: 100,
  VERIFY: 10,
  COMPLETE_TASK: 2,
  GOOD_REVIEW: 3,
  BAD_REVIEW: -5,
  CANCEL_ACCEPTED: -10,
  COMPLAINT: -20
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
   * Submit a review for a completed task
   */
  async submitReview(params) {
    const { task_id, target_user_id, score, content = '', reviewer_role } = params || {}

    // Validate
    if (!task_id) throw new Error('任务ID不能为空')
    if (!target_user_id) throw new Error('评价对象不能为空')
    if (!score || score < 1 || score > 5) throw new Error('评分范围为1-5')
    if (!['publisher', 'receiver'].includes(reviewer_role)) {
      throw new Error('评价角色无效')
    }

    // Check task exists and is completed
    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data || taskRes.data.length === 0) {
      throw new Error('任务不存在')
    }

    const task = taskRes.data[0]
    if (task.status !== 'completed') {
      throw new Error('只能对已完成的任务进行评价')
    }

    // Check not reviewing self
    if (target_user_id === this.uid) {
      throw new Error('不能评价自己')
    }

    // Check if already reviewed
    const existRes = await db.collection('reviews').where({
      task_id,
      reviewer_id: this.uid,
      target_user_id
    }).count()

    if (existRes.total > 0) {
      throw new Error('您已对该任务进行过评价')
    }

    // Get reviewer and target info
    const reviewerRes = await db.collection('uni-id-users')
      .doc(this.uid)
      .field({ nickname: 1, avatar: 1 })
      .get()
    const reviewer = reviewerRes.data && reviewerRes.data[0]

    const now = Date.now()

    // Create review record
    const reviewData = {
      task_id,
      task_title: task.title || '',
      reviewer_id: this.uid,
      reviewer_name: reviewer?.nickname || '',
      reviewer_avatar: reviewer?.avatar || '',
      reviewer_role,
      target_user_id,
      score,
      content: content.substring(0, 200),
      created_at: now
    }

    await db.collection('reviews').add(reviewData)

    // Update target user credit score based on review
    let creditChange = 0
    if (score >= 4) {
      creditChange = CREDIT_CHANGES.GOOD_REVIEW
    } else if (score <= 2) {
      creditChange = CREDIT_CHANGES.BAD_REVIEW
    }

    if (creditChange !== 0) {
      await db.collection('uni-id-users').doc(target_user_id).update({
        credit_score: dbCmd.inc(creditChange),
        updated_at: now
      })
    }

    return { success: true, message: '评价提交成功' }
  },

  /**
   * Get reviews (received or given)
   */
  async getReviews(params) {
    const { type = 'received', page = 1, pageSize = 20 } = params || {}

    const query = {}
    if (type === 'received') {
      query.target_user_id = this.uid
    } else {
      query.reviewer_id = this.uid
    }

    const countRes = await db.collection('reviews')
      .where(query)
      .count()

    const res = await db.collection('reviews')
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
   * Get review statistics for current user
   */
  async getReviewStats() {
    const reviews = await db.collection('reviews')
      .where({ target_user_id: this.uid })
      .field({ score: 1 })
      .get()

    const data = reviews.data || []
    const total = data.length

    if (total === 0) {
      return {
        average_score: 0,
        total_reviews: 0,
        good_rate: 0
      }
    }

    const sumScore = data.reduce((sum, item) => sum + (item.score || 0), 0)
    const goodCount = data.filter(item => item.score >= 4).length

    return {
      average_score: sumScore / total,
      total_reviews: total,
      good_rate: goodCount / total
    }
  },

  /**
   * Get public user profile (for viewing other users)
   */
  async getUserProfile(params) {
    const { user_id } = params || {}
    if (!user_id) throw new Error('用户ID不能为空')

    // Get user basic info
    const userRes = await db.collection('uni-id-users')
      .doc(user_id)
      .field({
        nickname: 1,
        avatar: 1,
        credit_score: 1,
        is_verified: 1
      })
      .get()

    if (!userRes.data || userRes.data.length === 0) {
      throw new Error('用户不存在')
    }

    const user = userRes.data[0]

    // Get published task count
    const publishedRes = await db.collection('tasks')
      .where({ publisher_id: user_id })
      .count()

    // Get completed task count (as receiver)
    const completedRes = await db.collection('tasks')
      .where({ receiver_id: user_id, status: 'completed' })
      .count()

    // Get review stats
    const reviewsAll = await db.collection('reviews')
      .where({ target_user_id: user_id })
      .field({ score: 1 })
      .get()

    const reviewData = reviewsAll.data || []
    const totalReviews = reviewData.length
    let averageScore = 0
    let goodRate = 0

    if (totalReviews > 0) {
      const sum = reviewData.reduce((s, r) => s + (r.score || 0), 0)
      averageScore = sum / totalReviews
      goodRate = reviewData.filter(r => r.score >= 4).length / totalReviews
    }

    // Get recent reviews (last 20)
    const recentReviews = await db.collection('reviews')
      .where({ target_user_id: user_id })
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()

    return {
      _id: user_id,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      credit_score: user.credit_score || 0,
      is_verified: user.is_verified || false,
      published_count: publishedRes.total || 0,
      completed_count: completedRes.total || 0,
      average_score: averageScore,
      good_rate: goodRate,
      reviews: recentReviews.data || []
    }
  },

  /**
   * Update credit score (internal use, called from other cloud functions)
   * @param {string} userId - Target user ID
   * @param {string} reason - Reason code (e.g., 'complete_task', 'good_review')
   * @param {number} change - Score change value
   */
  async _updateCreditScore(userId, reason, change) {
    if (!userId || !change) return

    const now = Date.now()

    // Ensure credit score doesn't go below 0
    const userRes = await db.collection('uni-id-users')
      .doc(userId)
      .field({ credit_score: 1 })
      .get()

    if (!userRes.data || userRes.data.length === 0) return

    const currentScore = userRes.data[0].credit_score || 0
    const newScore = Math.max(0, currentScore + change)

    await db.collection('uni-id-users').doc(userId).update({
      credit_score: newScore,
      updated_at: now
    })

    return { success: true, new_score: newScore }
  }
}
