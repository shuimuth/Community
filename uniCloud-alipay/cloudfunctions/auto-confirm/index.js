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

      // Settlement: transfer reward to receiver
      await db.collection('uni-id-users').doc(task.receiver_id).update({
        balance: dbCmd.inc(task.reward),
        task_completed_count: dbCmd.inc(1),
        credit_score: dbCmd.inc(2)
      })

      // Create transaction record
      const receiverUser = await db.collection('uni-id-users').doc(task.receiver_id).get()
      await db.collection('transactions').add({
        user_id: task.receiver_id,
        type: 'income',
        amount: task.reward,
        balance_after: receiverUser.data?.[0]?.balance || 0,
        related_id: task._id,
        related_type: 'task',
        description: `完成任务"${task.title}"获得报酬（自动确认）`,
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
          content: `任务"${task.title}"已自动确认完成，报酬 ¥${task.reward} 已到账`,
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
