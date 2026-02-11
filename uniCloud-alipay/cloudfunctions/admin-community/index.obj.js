
// Admin Community Management Cloud Object
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
   * Get communities list
   */
  async getCommunities(params = {}) {
    const { page = 1, pageSize = 20, keyword = '' } = params
    const where = {}
    if (keyword) {
      where.name = new RegExp(keyword, 'i')
    }

    const countRes = await db.collection('communities').where(where).count()
    const listRes = await db.collection('communities')
      .where(where)
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // Get user count for each community
    const list = await Promise.all((listRes.data || []).map(async (item) => {
      const ucRes = await db.collection('user_communities').where({ community_id: item._id }).count()
      return { ...item, user_count: ucRes.total || 0 }
    }))

    return { list, total: countRes.total || 0 }
  },

  /**
   * Add a new community
   */
  async addCommunity(params = {}) {
    const { name, region, address, location, status = 1 } = params
    if (!name || !region || !address) throw new Error('Missing required fields')

    // Check duplicate name
    const existRes = await db.collection('communities').where({ name }).count()
    if (existRes.total > 0) throw new Error('小区名称已存在')

    const data = {
      name,
      region,
      address,
      status,
      create_date: Date.now(),
      update_date: Date.now()
    }
    if (location) data.location = location

    const addRes = await db.collection('communities').add(data)

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid, operator_name: this.adminName,
      type: 'create', module: 'community',
      description: `添加小区「${name}」`,
      target_id: addRes.id, create_date: Date.now()
    })

    return { success: true, id: addRes.id }
  },

  /**
   * Update community
   */
  async updateCommunity(params = {}) {
    const { communityId, name, region, address, location, status } = params
    if (!communityId) throw new Error('Missing communityId')

    const updateData = { update_date: Date.now() }
    if (name !== undefined) updateData.name = name
    if (region !== undefined) updateData.region = region
    if (address !== undefined) updateData.address = address
    if (location !== undefined) updateData.location = location
    if (status !== undefined) updateData.status = status

    await db.collection('communities').doc(communityId).update(updateData)

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid, operator_name: this.adminName,
      type: 'update', module: 'community',
      description: `更新小区「${name || communityId}」`,
      target_id: communityId, create_date: Date.now()
    })

    return { success: true }
  },

  /**
   * Delete community (with validation)
   */
  async deleteCommunity(params = {}) {
    const { communityId } = params
    if (!communityId) throw new Error('Missing communityId')

    // Check if there are active users
    const ucRes = await db.collection('user_communities').where({ community_id: communityId }).count()
    if (ucRes.total > 0) {
      throw new Error(`该小区下仍有 ${ucRes.total} 名用户，无法删除。请先移除关联用户。`)
    }

    // Check if there are active tasks
    const taskRes = await db.collection('tasks').where({
      community_id: communityId,
      status: dbCmd.in(['pending', 'in_progress', 'waiting_confirm'])
    }).count()
    if (taskRes.total > 0) {
      throw new Error(`该小区下仍有 ${taskRes.total} 个进行中的任务，无法删除。`)
    }

    const comRes = await db.collection('communities').doc(communityId).get()
    const community = comRes.data?.[0]

    await db.collection('communities').doc(communityId).remove()

    // Log admin action
    await db.collection('admin_logs').add({
      operator_id: this.uid, operator_name: this.adminName,
      type: 'delete', module: 'community',
      description: `删除小区「${community?.name || communityId}」`,
      target_id: communityId, create_date: Date.now()
    })

    return { success: true }
  }
}
