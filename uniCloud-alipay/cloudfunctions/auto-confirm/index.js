'use strict'
// Scheduled cloud function: auto-confirm
// Automatically confirms tasks when publisher hasn't responded within 48 hours

const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event, context) => {
  console.log('Auto-confirm cloud function triggered')

  // Get system config for auto-confirm hours
  const configRes = await db.collection('system_config')
    .where({ key: 'platform_config' })
    .limit(1)
    .get()

  const autoConfirmHours = configRes.data?.[0]?.auto_confirm_hours || 48
  const threshold = Date.now() - autoConfirmHours * 60 * 60 * 1000

  // Find tasks waiting for confirmation that have exceeded the threshold
  const tasksRes = await db.collection('tasks')
    .where({
      status: 'waiting_confirm',
      receiver_confirmed_at: dbCmd.lt(threshold)
    })
    .limit(100)
    .get()

  const tasks = tasksRes.data || []
  console.log(`Found ${tasks.length} tasks to auto-confirm`)

  let successCount = 0
  let failCount = 0

  for (const task of tasks) {
    try {
      // Update task status
      await db.collection('tasks').doc(task._id).update({
        status: 'completed',
        completed_at: Date.now(),
        updated_at: Date.now()
      })

      // Settlement: transfer reward minus service fee to receiver via user-profile
      // Service fee is deducted from the receiver's earnings
      const service_fee = task.service_fee || 0
      const receiverEarnings = Math.round((task.reward - service_fee) * 100) / 100

      await db.collection('user-profile').where({ user_id: task.receiver_id }).update({
        balance: dbCmd.inc(receiverEarnings),
        task_completed_count: dbCmd.inc(1),
        credit_score: dbCmd.inc(2),
        updated_at: Date.now()
      })

      // Create transaction record
      const receiverProfileRes = await db.collection('user-profile').where({ user_id: task.receiver_id }).limit(1).get()
      const receiverProfile = receiverProfileRes.data?.[0] || {}
      await db.collection('transactions').add({
        user_id: task.receiver_id,
        type: 'income',
        amount: receiverEarnings,
        balance_after: receiverProfile.balance || 0,
        related_id: task._id,
        related_type: 'task',
        description: `完成任务"${task.title}"获得报酬（自动确认，已扣除平台服务费 ¥${service_fee}）`,
        status: 'completed',
        created_at: Date.now()
      })

      // Notify both parties
      const notifications = [
        {
          user_id: task.publisher_id,
          title: '任务自动确认完成',
          content: `任务"${task.title}"已超时自动确认完成`,
          type: 'task_confirmed',
          related_id: task._id,
          related_type: 'task',
          is_read: false,
          created_at: Date.now()
        },
        {
          user_id: task.receiver_id,
          title: '任务报酬到账',
          content: `任务"${task.title}"已自动确认完成，报酬 ¥${receiverEarnings}（已扣除服务费 ¥${service_fee}）已到账`,
          type: 'task_confirmed',
          related_id: task._id,
          related_type: 'task',
          is_read: false,
          created_at: Date.now()
        }
      ]

      for (const notification of notifications) {
        await db.collection('messages').add(notification)
      }

      successCount++
    } catch (err) {
      console.error(`Auto-confirm task ${task._id} failed:`, err)
      failCount++
    }
  }

  return {
    total: tasks.length,
    success: successCount,
    failed: failCount
  }
}
