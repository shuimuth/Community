
<template>
  <AdminLayout activeKey="user">
    <!-- Search & Filter -->
    <view class="page-header">
      <text class="page-title">用户管理</text>
      <view class="header-actions">
        <button class="export-btn" @tap="exportData">导出数据</button>
      </view>
    </view>

    <DataTable
      :columns="columns"
      :data="userList"
      :total="total"
      :currentPage="page"
      :pageSize="pageSize"
      :loading="loading"
      searchPlaceholder="搜索用户昵称/手机号"
      :activeFilters="activeFilters"
      @search="onSearch"
      @reset="onReset"
      @page-change="onPageChange"
      @remove-filter="removeFilter"
      @clear-filters="clearFilters"
    >
      <template #toolbar-actions>
        <view class="filter-group">
          <picker :range="statusOptions" range-key="label" @change="onStatusFilter">
            <button class="filter-btn">状态筛选</button>
          </picker>
        </view>
      </template>

      <template #cell-avatar="{ row }">
        <image v-if="row.avatar" :src="row.avatar" class="user-avatar" mode="aspectFill" />
        <view v-else class="avatar-placeholder">{{ (row.nickname || '?')[0] }}</view>
      </template>

      <template #cell-status="{ row }">
        <text
          class="status-tag"
          :class="{ active: row.status === 0, disabled: row.status !== 0 }"
        >{{ row.status === 0 ? '正常' : '已禁用' }}</text>
      </template>

      <template #cell-credit_score="{ row }">
        <text :style="{ color: getCreditColor(row.credit_score) }">
          {{ row.credit_score || 100 }}
        </text>
      </template>

      <template #cell-register_date="{ row }">
        <text class="cell-text">{{ formatDateTime(row.register_date) }}</text>
      </template>

      <template #actions="{ row }">
        <text class="action-link" @tap="viewDetail(row)">详情</text>
        <text
          class="action-link"
          :class="{ danger: row.status === 0 }"
          @tap="toggleUserStatus(row)"
        >{{ row.status === 0 ? '禁用' : '启用' }}</text>
      </template>
    </DataTable>

    <!-- User detail modal -->
    <DetailModal :visible="showDetail" :title="'用户详情 - ' + (currentUser?.nickname || '')" @close="showDetail = false">
      <view class="detail-section" v-if="currentUser">
        <view class="detail-row">
          <text class="detail-label">用户ID</text>
          <text class="detail-value">{{ currentUser._id }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">昵称</text>
          <text class="detail-value">{{ currentUser.nickname || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">手机号</text>
          <text class="detail-value">{{ currentUser.mobile || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">信用分</text>
          <text class="detail-value" :style="{ color: getCreditColor(currentUser.credit_score) }">
            {{ currentUser.credit_score || 100 }}
          </text>
        </view>
        <view class="detail-row">
          <text class="detail-label">账户余额</text>
          <text class="detail-value">¥{{ (currentUser.balance || 0).toFixed(2) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">实名认证</text>
          <text class="detail-value">{{ currentUser.verified ? '已认证' : '未认证' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">注册时间</text>
          <text class="detail-value">{{ formatDateTime(currentUser.register_date) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">所属小区</text>
          <text class="detail-value">{{ currentUser.community_name || '-' }}</text>
        </view>

        <view class="detail-subtitle mt-20">任务统计</view>
        <view class="detail-row">
          <text class="detail-label">发布任务数</text>
          <text class="detail-value">{{ userStats.publishedTasks || 0 }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">接单数</text>
          <text class="detail-value">{{ userStats.takenTasks || 0 }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">完成数</text>
          <text class="detail-value">{{ userStats.completedTasks || 0 }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">平均评分</text>
          <text class="detail-value">{{ userStats.avgRating || '-' }}</text>
        </view>
      </view>
    </DetailModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import DataTable from '@/components/DataTable.vue'
import DetailModal from '@/components/DetailModal.vue'
import { adminCallCloud, formatDateTime } from '@/utils/admin'

const columns = [
  { key: 'avatar', title: '头像', width: '60px' },
  { key: 'nickname', title: '昵称' },
  { key: 'mobile', title: '手机号', width: '120px' },
  { key: 'credit_score', title: '信用分', width: '80px' },
  { key: 'status', title: '状态', width: '80px' },
  { key: 'register_date', title: '注册时间', width: '160px' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: '0' },
  { label: '已禁用', value: '1' }
]

const userList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const keyword = ref('')
const filters = reactive<Record<string, any>>({})
const activeFilters = ref<any[]>([])

const showDetail = ref(false)
const currentUser = ref<any>(null)
const userStats = reactive({ publishedTasks: 0, takenTasks: 0, completedTasks: 0, avgRating: '' })

function getCreditColor(score: number): string {
  const s = score || 100
  if (s >= 80) return '#67C23A'
  if (s >= 60) return '#E6A23C'
  return '#F56C6C'
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminCallCloud('admin-user', 'getUsers', {
      page: page.value,
      pageSize,
      keyword: keyword.value,
      ...filters
    })
    userList.value = res?.list || []
    total.value = res?.total || 0
  } catch (e) {
    console.error('Load users failed:', e)
  } finally {
    loading.value = false
  }
}

function onSearch(kw: string) {
  keyword.value = kw
  page.value = 1
  loadUsers()
}

function onReset() {
  keyword.value = ''
  Object.keys(filters).forEach(k => delete filters[k])
  activeFilters.value = []
  page.value = 1
  loadUsers()
}

function onPageChange(p: number) {
  page.value = p
  loadUsers()
}

function onStatusFilter(e: any) {
  const idx = e.detail.value
  const opt = statusOptions[idx]
  if (opt.value) {
    filters.status = parseInt(opt.value)
    activeFilters.value = [{ key: 'status', label: '状态', value: opt.label }]
  } else {
    delete filters.status
    activeFilters.value = []
  }
  page.value = 1
  loadUsers()
}

function removeFilter(key: string) {
  delete filters[key]
  activeFilters.value = activeFilters.value.filter(f => f.key !== key)
  page.value = 1
  loadUsers()
}

function clearFilters() {
  Object.keys(filters).forEach(k => delete filters[k])
  activeFilters.value = []
  page.value = 1
  loadUsers()
}

async function viewDetail(user: any) {
  currentUser.value = user
  showDetail.value = true
  try {
    const res = await adminCallCloud('admin-user', 'getUserDetail', { userId: user._id })
    if (res) {
      currentUser.value = { ...user, ...res.user }
      Object.assign(userStats, res.stats || {})
    }
  } catch (e) {
    console.error('Load user detail failed:', e)
  }
}

async function toggleUserStatus(user: any) {
  const action = user.status === 0 ? '禁用' : '启用'
  uni.showModal({
    title: `确认${action}`,
    content: `确定要${action}用户「${user.nickname || user._id}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-user', 'toggleUserStatus', {
            userId: user._id,
            status: user.status === 0 ? 1 : 0
          })
          uni.showToast({ title: `${action}成功`, icon: 'success' })
          loadUsers()
        } catch (e) {
          console.error('Toggle user status failed:', e)
        }
      }
    }
  })
}

function exportData() {
  uni.showToast({ title: '导出功能开发中', icon: 'none' })
}

onMounted(() => {
  loadUsers()
})
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .export-btn {
    height: 34px;
    line-height: 34px;
    padding: 0 16px;
    background-color: #67C23A;
    color: #fff;
    font-size: 13px;
    border: none;
    border-radius: 4px;
    &::after { border: none; }
  }
}

.filter-group {
  .filter-btn {
    height: 34px;
    line-height: 34px;
    padding: 0 14px;
    font-size: 13px;
    background-color: #fff;
    border: 1px solid #DCDFE6;
    border-radius: 4px;
    color: #606266;
    &::after { border: none; }
  }
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #409EFF;
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;

  &.active {
    background-color: #f0f9ff;
    color: #67C23A;
  }
  &.disabled {
    background-color: #fef0f0;
    color: #F56C6C;
  }
}

.action-link {
  font-size: 12px;
  color: #409EFF;
  cursor: pointer;
  padding: 2px 6px;

  &.danger { color: #F56C6C; }
  &:hover { text-decoration: underline; }
}

.detail-section {
  .detail-row {
    display: flex;
    padding: 10px 0;
    border-bottom: 1px solid #f5f5f5;

    .detail-label {
      width: 100px;
      font-size: 13px;
      color: #909399;
      flex-shrink: 0;
    }

    .detail-value {
      flex: 1;
      font-size: 13px;
      color: #333;
    }
  }

  .detail-subtitle {
    font-size: 15px;
    font-weight: 600;
    color: #333;
    padding-bottom: 8px;
    border-bottom: 2px solid #409EFF;
    margin-bottom: 4px;
  }
}
</style>
