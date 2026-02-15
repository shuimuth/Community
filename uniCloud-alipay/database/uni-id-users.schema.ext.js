// uni-id-users schema trigger
// Auto-create user-profile record when a new user is created
const db = uniCloud.database()

module.exports = {
  trigger: {
    afterCreate: async function({ collection, addDataList }) {
      // When a new user is created in uni-id-users, auto-create a user-profile record
      for (const userData of addDataList) {
        const userId = userData._id
        if (!userId) continue

        try {
          // Check if profile already exists
          const existing = await db.collection('user-profile')
            .where({ user_id: userId })
            .limit(1)
            .get()

          if (existing.data && existing.data.length > 0) continue

          // Create default profile
          const now = Date.now()
          await db.collection('user-profile').add({
            user_id: userId,
            credit_score: 100,
            balance: 0,
            frozen_balance: 0,
            is_verified: false,
            points: 0,
            member_level: 0,
            is_merchant: false,
            task_published_count: 0,
            task_completed_count: 0,
            created_at: now,
            updated_at: now
          })
        } catch (e) {
          console.error('Failed to create user-profile for user:', userId, e)
        }
      }
    }
  }
}