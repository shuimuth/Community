
<template>
  <AdminLayout activeKey="task">
    <view class="page-header">
      <view class="back-link" @tap="goBack">
        <uni-icons type="back" size="16" color="#409EFF"></uni-icons>
        <text class="back-text">返回任务列表</text>
      </view>
      <text class="page-title">任务详情</text>
    </view>

    <view class="detail-container" v-if="task">
      <!-- Task info card -->
      <view class="task-card">
        <view class="task-header">
          <text class="task-title">{{ task.title }}</text>
          <text class="status-tag" :style="{ color: getStatusColor(task.status), backgroundColor: getStatusColor(task.status) + '15' }">
            {{ getStatusLabel(task.status) }}
          </text>
        </view>
        <text class="task-desc">{{ task.description || '暂无描述' }}</text>
        <view class="task-meta">
          <text class="reward">¥{{ (task.reward || 0).toFixed(2) }}</text>
          <text class="category">{{ task.category || '-' }}</text>
        </view>
      </view>

      <!-- Basic info -->
      <view class="info-card">
        <text class="card-title">任务信息</text>
        <view class="info-row"><text class="label">任务ID</text><text class="value">{{ task._id }}</text></view>
        <view class="info-row"><text class="label">发布者</text><text class="value">{{ task.publisher_name || '-' }}</text></view>
        <view class="info-row"><text class="label">接单者</text><text class="value">{{ task.taker_name || '-' }}</text></view>
        <view class="info-row"><text class="label">所属小区</text><text class="value">{{ task.community_name || '-' }}</text></view>
        <view class="info-row"><text class="label">发布时间</text><text class="value">{{ formatDateTime(task.create_date) }}</text></view>
        <view class="info-row"><text class="label">截止时间</text><text class="value">{{ formatDateTime(task.deadline) }}</text></view>
        <view class="info-row" v-if="task.address"><text class="label">地点</text><text class="value">{{ task.address }}</text></view>
      </view>

      <!-- Task images -->
      <view class="info-card" v-if="task.images && task.images.length">
        <text class="card-title">任务图片</text>
        <view class="images-grid">
          <image v-for="(img, idx) in task.images" :key="idx" :src="img" class="task-image" mode="aspectFill" @tap="previewImage(img)" />
        </view>
      </view>

      <!-- Admin actions -->
      <view class="actions-card" v-if="task.status !== 'completed' && task.status !== 'cancelled'">
        <button class="cancel-btn" @tap="forceCancel">强制取消任务</button>
      </view>
    </view>

    <view class="loading-state" v-else>
      <text>{{ loading ? '加载中...' : '任务不存在' }}</text>
    </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { adminCallCloud, formatDateTime, getTaskStatusLabel, getTaskStatusColor } from '@/utils/admin'

const task = ref<any>(null)
const loading = ref(true)
const getStatusLabel = getTaskStatusLabel
const getStatusColor = getTaskStatusColor

function goBack() { uni.redirectTo({ url: '/pages/task/list' }) }

function previewImage(url: string) {
  uni.previewImage({ current: url, urls: task.value?.images || [url] })
}

async function forceCancel() {
  uni.showModal({
    title: '强制取消任务',
    content: `确定要强制取消此任务吗？如已支付将自动退款。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-task', 'forceCancel', { taskId: task.value._id })
          uni.showToast({ title: '取消成功', icon: 'success' })
          loadDetail()
        } catch (e) { console.error('Force cancel failed:', e) }
      }
    }
  })
}

async function loadDetail() {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const taskId = currentPage?.$page?.options?.id || currentPage?.options?.id
  if (!taskId) { loading.value = false; return }

  try {
    const res = await adminCallCloud('admin-task', 'getTaskDetail', { taskId })
    if (res) task.value = res
  } catch (e) { console.error('Load task detail failed:', e) }
  finally { loading.value = false }
}

onMounted(() => { loadDetail() })
</script>

<style lang="scss" scoped>
.page-header { margin-bottom: 16px;
  .back-link { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; cursor: pointer;
    .back-text { font-size: 13px; color: #409EFF; }
  }
  .page-title { font-size: 18px; font-weight: 600; color: #333; }
}
.task-card { background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px;
  .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
    .task-title { font-size: 18px; font-weight: 600; color: #333; flex: 1; }
    .status-tag { padding: 4px 12px; border-radius: 4px; font-size: 13px; flex-shrink: 0; margin-left: 12px; }
  }
  .task-desc { display: block; font-size: 14px; color: #606266; line-height: 1.6; margin-bottom: 12px; }
  .task-meta { display: flex; gap: 16px;
    .reward { font-size: 22px; font-weight: 700; color: #E6A23C; }
    .category { font-size: 13px; color: #909399; padding: 4px 10px; background-color: #f0f2f5; border-radius: 4px; align-self: center; }
  }
}
.info-card { background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px;
  .card-title { display: block; font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #ebeef5; }
  .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5; &:last-child { border-bottom: none; }
    .label { width: 80px; font-size: 13px; color: #909399; flex-shrink: 0; }
    .value { flex: 1; font-size: 13px; color: #333; }
  }
  .images-grid { display: flex; flex-wrap: wrap; gap: 10px;
    .task-image { width: 120px; height: 120px; border-radius: 6px; cursor: pointer; }
  }
}
.actions-card { background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center;
  .cancel-btn { height: 40px; line-height: 40px; padding: 0 32px; background-color: #F56C6C; color: #fff; font-size: 14px; border: none; border-radius: 6px; display: inline-block; &::after { border: none; } }
}
.loading-state { text-align: center; padding: 60px 0; color: #C0C4CC; font-size: 14px; }
</style>
