// Cloud object: init-data
// Initialize database with sample data

const db = uniCloud.database()

module.exports = {
  /**
   * Initialize community data (10 sample communities)
   */
  async initCommunities() {
    const communities = [
      {
        name: '阳光花园',
        region: '朝阳区',
        address: '北京市朝阳区建国路88号',
        location: {
          type: 'Point',
          coordinates: [116.459654, 39.912289]
        },
        user_count: 235,
        task_count: 48,
        status: 1
      },
      {
        name: '绿城小区',
        region: '海淀区',
        address: '北京市海淀区中关村大街56号',
        location: {
          type: 'Point',
          coordinates: [116.326019, 39.977706]
        },
        user_count: 412,
        task_count: 86,
        status: 1
      },
      {
        name: '华府世家',
        region: '西城区',
        address: '北京市西城区金融街19号',
        location: {
          type: 'Point',
          coordinates: [116.364976, 39.914492]
        },
        user_count: 168,
        task_count: 35,
        status: 1
      },
      {
        name: '锦绣江南',
        region: '东城区',
        address: '北京市东城区王府井大街138号',
        location: {
          type: 'Point',
          coordinates: [116.416357, 39.917544]
        },
        user_count: 328,
        task_count: 72,
        status: 1
      },
      {
        name: '万科城市花园',
        region: '丰台区',
        address: '北京市丰台区南三环西路16号',
        location: {
          type: 'Point',
          coordinates: [116.353503, 39.854016]
        },
        user_count: 576,
        task_count: 124,
        status: 1
      },
      {
        name: '碧桂园翡翠湾',
        region: '石景山区',
        address: '北京市石景山区石景山路32号',
        location: {
          type: 'Point',
          coordinates: [116.222974, 39.905333]
        },
        user_count: 294,
        task_count: 58,
        status: 1
      },
      {
        name: '保利玫瑰湾',
        region: '通州区',
        address: '北京市通州区新华大街1号',
        location: {
          type: 'Point',
          coordinates: [116.658603, 39.902489]
        },
        user_count: 445,
        task_count: 95,
        status: 1
      },
      {
        name: '龙湖香醍溪岸',
        region: '昌平区',
        address: '北京市昌平区回龙观西大街88号',
        location: {
          type: 'Point',
          coordinates: [116.326887, 40.070877]
        },
        user_count: 312,
        task_count: 67,
        status: 1
      },
      {
        name: '中海国际社区',
        region: '大兴区',
        address: '北京市大兴区黄村镇兴华大街88号',
        location: {
          type: 'Point',
          coordinates: [116.341395, 39.726929]
        },
        user_count: 389,
        task_count: 81,
        status: 1
      },
      {
        name: '首开国风美唐',
        region: '朝阳区',
        address: '北京市朝阳区望京南湖东园119号',
        location: {
          type: 'Point',
          coordinates: [116.473214, 39.993372]
        },
        user_count: 267,
        task_count: 54,
        status: 1
      }
    ]

    try {
      // Check if communities already exist
      const existingCount = await db.collection('communities').count()

      if (existingCount.total > 0) {
        console.log(`Found ${existingCount.total} existing communities`)
        // Ask if user wants to clear existing data
        // For now, we'll just add to existing data
      }

      // Add timestamp for each community
      const timestamp = Date.now()
      const communitiesWithTimestamp = communities.map(item => ({
        ...item,
        created_at: timestamp,
        updated_at: timestamp
      }))

      // Batch insert
      const result = await db.collection('communities').add(communitiesWithTimestamp)

      return {
        success: true,
        message: `Successfully inserted ${communities.length} communities`,
        insertedCount: result.inserted || communities.length,
        ids: result.ids || []
      }
    } catch (error) {
      console.error('Error inserting communities:', error)
      throw {
        success: false,
        message: 'Failed to insert communities',
        error: error.message
      }
    }
  },

  /**
   * Clear all communities (use with caution!)
   */
  async clearCommunities() {
    try {
      const result = await db.collection('communities').where({}).remove()
      return {
        success: true,
        message: 'Successfully cleared all communities',
        deletedCount: result.deleted || 0
      }
    } catch (error) {
      console.error('Error clearing communities:', error)
      throw {
        success: false,
        message: 'Failed to clear communities',
        error: error.message
      }
    }
  },

  /**
   * Get statistics of communities
   */
  async getCommunitiesStats() {
    try {
      const countRes = await db.collection('communities').count()
      const communities = await db.collection('communities').get()

      const totalUsers = communities.data.reduce((sum, item) => sum + (item.user_count || 0), 0)
      const totalTasks = communities.data.reduce((sum, item) => sum + (item.task_count || 0), 0)
      const activeCount = communities.data.filter(item => item.status === 1).length

      return {
        total: countRes.total,
        active: activeCount,
        inactive: countRes.total - activeCount,
        totalUsers,
        totalTasks,
        avgUsersPerCommunity: countRes.total > 0 ? Math.round(totalUsers / countRes.total) : 0,
        avgTasksPerCommunity: countRes.total > 0 ? Math.round(totalTasks / countRes.total) : 0
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      throw {
        success: false,
        message: 'Failed to get statistics',
        error: error.message
      }
    }
  }
}
