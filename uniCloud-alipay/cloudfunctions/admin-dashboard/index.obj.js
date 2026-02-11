
// Admin Dashboard Cloud Object
const db = uniCloud.database()
const dbCmd = db.command
const $ = dbCmd.aggregate

module.exports = {
  _before: async function() {
    // Verify admin token
    const clientInfo = this.getClientInfo()
    const uniIdCommon = require('uni-id-common')
    const uniID = uniIdCommon.createInstance({ clientInfo })
    const payload = await uniID.checkToken(clientInfo.uniIdToken)
    if (payload.errCode) {
      throw new Error('Unauthorized: Please login as admin')
    }
    this.uid = payload.uid
    // Check admin role
    const userRes = await db.collection('uni-id-users')
      .where({ _id: this.uid })
      .field({ role: 1 })
      .get()
    const user = userRes.data?.[0]
    if (!user || !user.role || (!user.role.includes('admin') && !user.role.includes('super_admin'))) {
      throw new Error('Unauthorized: Admin role required')
    }
  },

  /**
   * Get dashboard overview stats
   */
  async getOverview() {
    const now = Date.now()
    const todayStart = new Date(new Date().toDateString()).getTime()
    const yesterdayStart = todayStart - 86400000

    // Today's stats
    const [todayUsers, todayTasks, todayCompleted, yesterdayUsers, yesterdayTasks, yesterdayCompleted, totalUsers, totalTasks, pendingWithdrawals] = await Promise.all([
      // Today new users
      db.collection('uni-id-users').where({ register_date: dbCmd.gte(todayStart) }).count(),
      // Today new tasks
      db.collection('tasks').where({ create_date: dbCmd.gte(todayStart) }).count(),
      // Today completed tasks
      db.collection('tasks').where({ status: 'completed', update_date: dbCmd.gte(todayStart) }).count(),
      // Yesterday new users
      db.collection('uni-id-users').where({ register_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(todayStart)) }).count(),
      // Yesterday new tasks
      db.collection('tasks').where({ create_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(todayStart)) }).count(),
      // Yesterday completed tasks
      db.collection('tasks').where({ status: 'completed', update_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(todayStart)) }).count(),
      // Total users
      db.collection('uni-id-users').count(),
      // Total tasks
      db.collection('tasks').count(),
      // Pending withdrawals
      db.collection('withdrawals').where({ status: 'pending' }).count()
    ])

    // Today's transaction amount
    const todayAmountRes = await db.collection('transactions')
      .where({ create_date: dbCmd.gte(todayStart), type: 'income' })
      .field({ amount: 1 })
      .get()
    const todayAmount = todayAmountRes.data.reduce((sum, t) => sum + (t.amount || 0), 0)

    // Total transaction amount
    const totalAmountRes = await db.collection('transactions')
      .where({ type: 'income' })
      .field({ amount: 1 })
      .limit(1000)
      .get()
    const totalAmount = totalAmountRes.data.reduce((sum, t) => sum + (t.amount || 0), 0)

    // Calculate trends
    const calcTrend = (today, yesterday) => {
      if (!yesterday) return today > 0 ? 100 : 0
      return ((today - yesterday) / yesterday * 100)
    }

    return {
      todayNewUsers: todayUsers.total,
      todayNewTasks: todayTasks.total,
      todayAmount: todayAmount.toFixed(2),
      todayCompleted: todayCompleted.total,
      totalUsers: totalUsers.total,
      totalTasks: totalTasks.total,
      totalAmount: totalAmount.toFixed(2),
      pendingWithdrawals: pendingWithdrawals.total,
      usersTrend: calcTrend(todayUsers.total, yesterdayUsers.total),
      tasksTrend: calcTrend(todayTasks.total, yesterdayTasks.total),
      amountTrend: 0,
      completedTrend: calcTrend(todayCompleted.total, yesterdayCompleted.total)
    }
  },

  /**
   * Get chart data for trends
   */
  async getChartData(params = {}) {
    const { range = '7d' } = params
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const startTime = Date.now() - days * 86400000

    // User growth by day
    const usersRes = await db.collection('uni-id-users')
      .where({ register_date: dbCmd.gte(startTime) })
      .field({ register_date: 1 })
      .limit(1000)
      .get()

    // Task trend by day
    const tasksRes = await db.collection('tasks')
      .where({ create_date: dbCmd.gte(startTime) })
      .field({ create_date: 1, category: 1, status: 1 })
      .limit(1000)
      .get()

    // Group by day
    const step = days > 14 ? Math.ceil(days / 10) : 1
    const userGrowth = []
    const taskTrend = []
    let maxUser = 0, maxTask = 0

    for (let i = days - 1; i >= 0; i -= step) {
      const dayStart = new Date(new Date(Date.now() - i * 86400000).toDateString()).getTime()
      const dayEnd = dayStart + step * 86400000
      const d = new Date(dayStart)
      const label = `${d.getMonth() + 1}/${d.getDate()}`

      const uCount = usersRes.data.filter(u => u.register_date >= dayStart && u.register_date < dayEnd).length
      const tCount = tasksRes.data.filter(t => t.create_date >= dayStart && t.create_date < dayEnd).length

      maxUser = Math.max(maxUser, uCount)
      maxTask = Math.max(maxTask, tCount)
      userGrowth.push({ label, count: uCount })
      taskTrend.push({ label, count: tCount })
    }

    // Task type distribution
    const typeMap = {}
    tasksRes.data.forEach(t => {
      const cat = t.category || '其他'
      typeMap[cat] = (typeMap[cat] || 0) + 1
    })
    const totalTaskCount = tasksRes.data.length || 1
    const taskTypes = Object.entries(typeMap)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round(count / totalTaskCount * 100)
      }))
      .sort((a, b) => b.count - a.count)

    // Task status distribution
    const statusMap = {}
    tasksRes.data.forEach(t => {
      const s = t.status || 'unknown'
      statusMap[s] = (statusMap[s] || 0) + 1
    })
    const statusLabels = {
      pending: '待接单', in_progress: '进行中', waiting_confirm: '待确认',
      completed: '已完成', cancelled: '已取消', disputed: '申诉中'
    }
    const taskStatus = Object.entries(statusMap)
      .map(([key, count]) => ({
        name: statusLabels[key] || key,
        count,
        percent: Math.round(count / totalTaskCount * 100)
      }))

    return {
      userGrowth,
      taskTrend,
      taskTypes,
      taskStatus,
      maxUser: maxUser || 1,
      maxTask: maxTask || 1
    }
  },

  /**
   * Get recent activities
   */
  async getRecentActivities() {
    // Get recent tasks
    const recentTasks = await db.collection('tasks')
      .orderBy('create_date', 'desc')
      .limit(5)
      .field({ title: 1, status: 1, create_date: 1, publisher_name: 1 })
      .get()

    const list = recentTasks.data.map(t => ({
      content: `用户 ${t.publisher_name || '未知'} 发布了任务「${t.title}」`,
      time: new Date(t.create_date).toLocaleString(),
      color: '#409EFF'
    }))

    return { list }
  }
}
