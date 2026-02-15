<!-- 数据库初始化工具页面 -->
<template>
  <view class="container">
    <view class="header">
      <text class="title">数据库初始化工具</text>
    </view>

    <view class="card">
      <text class="card-title">社区数据</text>

      <view class="stats" v-if="stats">
        <view class="stat-item">
          <text class="stat-label">总社区数</text>
          <text class="stat-value">{{ stats.total }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">活跃社区</text>
          <text class="stat-value">{{ stats.active }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">总用户数</text>
          <text class="stat-value">{{ stats.totalUsers }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">总任务数</text>
          <text class="stat-value">{{ stats.totalTasks }}</text>
        </view>
      </view>

      <view class="buttons">
        <button
          type="primary"
          @click="initCommunities"
          :loading="loading"
          :disabled="loading"
        >
          初始化社区数据（10条）
        </button>

        <button
          @click="refreshStats"
          :loading="loading"
          :disabled="loading"
        >
          刷新统计
        </button>

        <button
          type="warn"
          @click="confirmClear"
          :loading="loading"
          :disabled="loading"
        >
          清空所有社区数据
        </button>
      </view>
    </view>

    <view class="card" v-if="communities.length > 0">
      <text class="card-title">社区列表</text>
      <view class="community-list">
        <view
          class="community-item"
          v-for="(item, index) in communities"
          :key="item._id"
        >
          <text class="community-name">{{ index + 1 }}. {{ item.name }}</text>
          <text class="community-info">{{ item.region }} · {{ item.address }}</text>
          <text class="community-stats">
            用户: {{ item.user_count }} · 任务: {{ item.task_count }}
          </text>
        </view>
      </view>
    </view>

    <view class="tips">
      <text class="tip-title">使用说明：</text>
      <text class="tip-text">1. 点击"初始化社区数据"可添加10条虚拟社区数据</text>
      <text class="tip-text">2. 点击"刷新统计"可查看当前数据库统计信息</text>
      <text class="tip-text">3. 点击"清空所有社区数据"会删除所有社区（谨慎使用）</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(false)
const stats = ref<any>(null)
const communities = ref<any[]>([])

// 初始化社区数据
const initCommunities = async () => {
  loading.value = true
  try {
    const initData = uniCloud.importObject('init-data')
    const result = await initData.initCommunities()

    uni.showToast({
      title: result.message || '初始化成功',
      icon: 'success',
      duration: 2000
    })

    // 刷新统计和列表
    await refreshStats()
    await loadCommunities()
  } catch (error: any) {
    console.error('初始化失败:', error)
    uni.showToast({
      title: error.message || '初始化失败',
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

// 刷新统计
const refreshStats = async () => {
  loading.value = true
  try {
    const initData = uniCloud.importObject('init-data')
    const result = await initData.getCommunitiesStats()
    stats.value = result
  } catch (error: any) {
    console.error('获取统计失败:', error)
    uni.showToast({
      title: error.message || '获取统计失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 加载社区列表
const loadCommunities = async () => {
  try {
    const db = uniCloud.database()
    const result = await db.collection('communities')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    communities.value = result.data || []
  } catch (error: any) {
    console.error('加载社区列表失败:', error)
  }
}

// 确认清空
const confirmClear = () => {
  uni.showModal({
    title: '警告',
    content: '确定要清空所有社区数据吗？此操作不可恢复！',
    confirmText: '确定清空',
    cancelText: '取消',
    confirmColor: '#FF0000',
    success: (res) => {
      if (res.confirm) {
        clearCommunities()
      }
    }
  })
}

// 清空社区数据
const clearCommunities = async () => {
  loading.value = true
  try {
    const initData = uniCloud.importObject('init-data')
    const result = await initData.clearCommunities()

    uni.showToast({
      title: result.message || '清空成功',
      icon: 'success'
    })

    // 刷新统计和列表
    stats.value = null
    communities.value = []
    await refreshStats()
  } catch (error: any) {
    console.error('清空失败:', error)
    uni.showToast({
      title: error.message || '清空失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshStats()
  loadCommunities()
})
</script>

<style scoped>
.container {
  padding: 32rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  margin-bottom: 32rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}

.card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.card-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  display: block;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 32rpx;
}

.stat-item {
  width: 50%;
  margin-bottom: 24rpx;
}

.stat-label {
  font-size: 28rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #07c160;
  display: block;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

button {
  border-radius: 12rpx;
  font-size: 32rpx;
  height: 88rpx;
}

.community-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.community-item {
  padding: 24rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
}

.community-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.community-info {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.community-stats {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.tips {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.tip-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.tip-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
  margin-bottom: 12rpx;
}
</style>
