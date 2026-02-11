
// Admin Log Management Cloud Object
const db = uniCloud.database()

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
   * Get admin operation logs
   */
  async getLogs(params = {}) {
    const { page = 1, pageSize = 20, keyword = '', module: logModule, type } = params
    const where = {}
    if (keyword) {
      where.$or = [
        { description: new RegExp(keyword, 'i') },
        { operator_name: new RegExp(keyword, 'i') }
      ]
    }
    if (logModule) where.module = logModule
    if (type) where.type = type

    const countRes = await db.collection('admin_logs').where(where).count()
    const listRes = await db.collection('admin_logs')
      .where(where)
      .orderBy('create_date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { list: listRes.data || [], total: countRes.total || 0 }
  }
}
