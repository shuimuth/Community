// Cloud object: community-service
// Handles community search, user-community association management

const db = uniCloud.database()
const dbCmd = db.command

module.exports = {
  _before: async function() {
    const clientInfo = this.getClientInfo()
    const uniIdCommon = require('uni-id-common')
    this.uniIdCommon = uniIdCommon.createInstance({ clientInfo })
    this.userInfo = await this.uniIdCommon.checkToken(clientInfo.uniIdToken)
    if (!this.userInfo || !this.userInfo.uid) {
      throw new Error('Unauthorized: Please login first')
    }
    this.uid = this.userInfo.uid
  },

  /**
   * Search communities by keyword
   */
  async searchCommunities(params) {
    const { keyword, page = 1, pageSize = 20 } = params || {}

    let query = db.collection('communities')

    if (keyword) {
      query = query.where({
        name: new RegExp(keyword, 'i')
      })
    }

    const countRes = await query.count()
    const dataRes = await query
      .orderBy('name', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      data: dataRes.data || [],
      total: countRes.total || 0
    }
  },

  /**
   * Get user's communities
   */
  async getUserCommunities() {
    const ucRes = await db.collection('user_communities')
      .where({ user_id: this.uid })
      .get()

    if (!ucRes.data || ucRes.data.length === 0) {
      return []
    }

    const communityIds = ucRes.data.map(item => item.community_id)
    const cRes = await db.collection('communities')
      .where({ _id: dbCmd.in(communityIds) })
      .get()

    return cRes.data || []
  },

  /**
   * Add user-community association
   */
  async addCommunity(params) {
    const { community_id } = params || {}
    if (!community_id) {
      throw new Error('Community ID is required')
    }

    // Check max limit (5)
    const countRes = await db.collection('user_communities')
      .where({ user_id: this.uid })
      .count()

    if (countRes.total >= 5) {
      throw new Error('Maximum 5 communities allowed')
    }

    // Check duplicate
    const existRes = await db.collection('user_communities')
      .where({ user_id: this.uid, community_id })
      .count()

    if (existRes.total > 0) {
      throw new Error('Community already added')
    }

    await db.collection('user_communities').add({
      user_id: this.uid,
      community_id,
      created_at: Date.now()
    })

    return { success: true }
  },

  /**
   * Remove user-community association
   */
  async removeCommunity(params) {
    const { community_id } = params || {}
    if (!community_id) {
      throw new Error('Community ID is required')
    }

    // Check remaining count (must keep at least 1)
    const countRes = await db.collection('user_communities')
      .where({ user_id: this.uid })
      .count()

    if (countRes.total <= 1) {
      throw new Error('Must keep at least 1 community')
    }

    await db.collection('user_communities')
      .where({ user_id: this.uid, community_id })
      .remove()

    return { success: true }
  }
}
