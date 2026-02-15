
'use strict'
/**
 * Scheduled cleanup function
 * Runs periodically to clean up:
 * - Expired idempotency keys
 * - Old admin logs (>90 days)
 * - Expired tasks (auto-cancel tasks past deadline)
 */
const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event, context) => {
  console.log('Running scheduled cleanup...', new Date().toISOString())
  const results = {}

  // 1. Clean expired idempotency keys
  try {
    const now = Date.now()
    const idempotencyRes = await db.collection('system_config')
      .where({
        config_key: dbCmd.regex({ regex: '^idempotency:', options: '' }),
        'config_value.expiry': dbCmd.lt(now)
      })
      .limit(100)
      .get()

    if (idempotencyRes.data?.length > 0) {
      const ids = idempotencyRes.data.map(item => item._id)
      for (const id of ids) {
        await db.collection('system_config').doc(id).remove()
      }
      results.idempotencyCleared = ids.length
    } else {
      results.idempotencyCleared = 0
    }
  } catch (e) {
    console.error('Clean idempotency keys failed:', e)
    results.idempotencyError = e.message
  }

  // 2. Clean old admin logs (>90 days)
  try {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
    const oldLogsRes = await db.collection('admin_logs')
      .where({ create_date: dbCmd.lt(ninetyDaysAgo) })
      .limit(200)
      .get()

    if (oldLogsRes.data?.length > 0) {
      const ids = oldLogsRes.data.map(item => item._id)
      for (const id of ids) {
        await db.collection('admin_logs').doc(id).remove()
      }
      results.logsCleared = ids.length
    } else {
      results.logsCleared = 0
    }
  } catch (e) {
    console.error('Clean old logs failed:', e)
    results.logsError = e.message
  }

  // 3. Auto-cancel expired pending tasks (past deadline)
  try {
    const now = Date.now()
    const expiredTasks = await db.collection('tasks')
      .where({
        status: 'pending',
        deadline: dbCmd.lt(now)
      })
      .limit(50)
      .get()

    if (expiredTasks.data?.length > 0) {
      for (const task of expiredTasks.data) {
        await db.collection('tasks').doc(task._id).update({
          status: 'cancelled',
          cancel_reason: '任务已过截止时间，系统自动取消',
          update_date: now
        })

        // Refund publisher if reward was frozen
        if (task.publisher_id && task.reward) {
          await db.collection('user-profile').where({ user_id: task.publisher_id }).update({
            balance: dbCmd.inc(task.reward),
            updated_at: Date.now()
          })
          await db.collection('transactions').add({
            user_id: task.publisher_id,
            type: 'refund',
            amount: task.reward,
            description: `任务「${task.title}」已过期自动取消，退款`,
            related_id: task._id,
            create_date: now
          })
        }
      }
      results.tasksExpired = expiredTasks.data.length
    } else {
      results.tasksExpired = 0
    }
  } catch (e) {
    console.error('Auto-cancel expired tasks failed:', e)
    results.tasksError = e.message
  }

  // 4. Clean old messages (>30 days, already read)
  try {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const oldMsgsRes = await db.collection('messages')
      .where({
        is_read: true,
        create_date: dbCmd.lt(thirtyDaysAgo)
      })
      .limit(200)
      .get()

    if (oldMsgsRes.data?.length > 0) {
      const ids = oldMsgsRes.data.map(item => item._id)
      for (const id of ids) {
        await db.collection('messages').doc(id).remove()
      }
      results.messagesCleared = ids.length
    } else {
      results.messagesCleared = 0
    }
  } catch (e) {
    console.error('Clean old messages failed:', e)
    results.messagesError = e.message
  }

  console.log('Cleanup results:', results)
  return results
}
