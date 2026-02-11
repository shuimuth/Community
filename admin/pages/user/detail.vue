
<template>
  <AdminLayout activeKey="user">
    <view class="page-header">
      <view class="back-link" @tap="goBack">
        <uni-icons type="back" size="16" color="#409EFF"></uni-icons>
        <text class="back-text">返回用户列表</text>
      </view>
      <text class="page-title">用户详情</text>
    </view>

    <view class="detail-container" v-if="user">
      <!-- User profile card -->
      <view class="profile-card">
        <view class="profile-header">
          <image v-if="user.avatar" :src="user.avatar" class="user-avatar" mode="aspectFill" />
          <view v-else class="avatar-placeholder">{{ (user.nickname || '?')[0] }}</view>
          <view class="profile-info">
            <text class="user-name">{{ user.nickname || '未知用户' }}</text>
            <view class="user-tags">
              <text class="tag" :class="{ verified: user.verified }">{{ user.verified ? '已认证' : '未认证' }}</text>
              <text class="tag status" :class="{ active: user.status === 0 }">{{ user.status === 0 ? '正常' : '已禁用' }}</text>
            </view>
          </view>
          <view class="credit-badge" :style="{ backgroundColor: getCreditColor(user.credit_score) + '15', color: getCreditColor(user.credit_score) }">
            <text class="credit-score">{{ user.credit_score || 100 }}</text>
            <text class="credit-label">信用分</text>
          </view>
        </view>
      </view>

      <!-- Stats cards -->
      <view class="stats-row">
        <view class="mini-stat">
          <text class="stat-value">{{ stats.publishedTasks }}</text>
          <text class="stat-label">发布任务</text>
        </view>
        <view class="mini-stat">
          <text class="stat-value">{{ stats.takenTasks }}</text>
          <text class="stat-label">接单数</text>
        </view>
        <view class="mini-stat">
          <text class="stat-value">{{ stats.completedTasks }}</text>
          <text class="stat-label">完成数</text>
        </view>
        <view class="mini-stat">
          <text class="stat-value">{{ stats.avgRating }}</text>
          <text class="stat-label">平均评分</text>
        </view>
        <view class="mini-stat">
          <text class="stat-value">¥{{ (user.balance || 0).toFixed(2) }}</text>
          <text class="stat-label">余额</text>
        </view>
      </view>

      <!-- Basic info -->
      <view class="info-card">
        <text class="card-title">基本信息</text>
        <view class="info-row"><text class="label">用户ID</text><text class="value">{{ user._id }}</text></view>
        <view class="info-row"><text class="label">手机号</text><text class="value">{{ user.mobile || '-' }}</text></view>
        <view class="info-row"><text class="label">所属小区</text><text class="value">{{ user.community_name || '-' }}</text></view>
        <view class="info-row"><text class="label">注册时间</text><text class="value">{{ formatDateTime(user.register_date) }}</text></view>
        <view class="info-row" v-if="user.real_name"><text class="label">实名姓名</text><text class="value">{{ user.real_name }}</text></view>
      </view>
    </view>

    <view class="loading-state" v-else>
      <text>{{ loading ? '加载中...' : '用户不存在' }}</text>
    </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { adminCallCloud, formatDateTime } from '@/utils/admin'

const user = ref<any>(null)
const loading = ref(true)
const stats = reactive({ publishedTasks: 0, takenTasks: 0, completedTasks: 0, avgRating: '-' })

function getCreditColor(score: number): string {
  const s = score || 100
  if (s >= 80) return '#67C23A'
  if (s >= 60) return '#E6A23C'
  return '#F56C6C'
}

function goBack() { uni.redirectTo({ url: '/pages/user/list' }) }

async function loadDetail() {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const userId = currentPage?.$page?.options?.id || currentPage?.options?.id
  if (!userId) { loading.value = false; return }

  try {
    const res = await adminCallCloud('admin-user', 'getUserDetail', { userId })
    if (res) {
      user.value = res.user
      Object.assign(stats, res.stats || {})
    }
  } catch (e) { console.error('Load user detail failed:', e) }
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
.profile-card { background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px;
  .profile-header { display: flex; align-items: center; gap: 16px;
    .user-avatar { width: 64px; height: 64px; border-radius: 50%; }
    .avatar-placeholder { width: 64px; height: 64px; border-radius: 50%; background-color: #409EFF; color: #fff; font-size: 24px; display: flex; align-items: center; justify-content: center; }
    .profile-info { flex: 1;
      .user-name { display: block; font-size: 18px; font-weight: 600; color: #333; margin-bottom: 6px; }
      .user-tags { display: flex; gap: 8px;
        .tag { padding: 2px 8px; border-radius: 3px; font-size: 12px; background-color: #f4f4f5; color: #909399;
          &.verified { background-color: #f0f9ff; color: #67C23A; }
          &.active { background-color: #f0f9ff; color: #67C23A; }
        }
      }
    }
    .credit-badge { width: 80px; text-align: center; padding: 12px 8px; border-radius: 8px;
      .credit-score { display: block; font-size: 28px; font-weight: 700; }
      .credit-label { display: block; font-size: 11px; margin-top: 2px; }
    }
  }
}
.stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 16px;
  .mini-stat { background-color: #fff; border-radius: 8px; padding: 16px 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    .stat-value { display: block; font-size: 20px; font-weight: 700; color: #333; }
    .stat-label { display: block; font-size: 12px; color: #909399; margin-top: 4px; }
  }
}
.info-card { background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  .card-title { display: block; font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #ebeef5; }
  .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5;
    &:last-child { border-bottom: none; }
    .label { width: 90px; font-size: 13px; color: #909399; flex-shrink: 0; }
    .value { flex: 1; font-size: 13px; color: #333; }
  }
}
.loading-state { text-align: center; padding: 60px 0; color: #C0C4CC; font-size: 14px; }
</style>
