
<template>
  <AdminLayout activeKey="task">
    <view class="page-header">
      <text class="page-title">任务管理</text>
      <view class="header-actions">
        <button class="export-btn" @tap="exportData">导出数据</button>
      </view>
    </view>

    <DataTable
      :columns="columns"
      :data="taskList"
      :total="total"
      :currentPage="page"
      :pageSize="pageSize"
      :loading="loading"
      searchPlaceholder="搜索任务标题"
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
          <picker :range="categoryOptions" range-key="label" @change="onCategoryFilter">
            <button class="filter-btn">类型筛选</button>
          </picker>
        </view>
      </template>

      <template #cell-title="{ row }">
        <text class="task-title-text" @tap="viewDetail(row)">{{ row.title }}</text>
      </template>

      <template #cell-status="{ row }">
        <text class="status-tag" :style="{ color: getStatusColor(row.status), backgroundColor: getStatusColor(row.status) + '15' }">
          {{ getStatusLabel(row.status) }}
        </text>
      </template>

      <template #cell-reward="{ row }">
        <text class="reward-text">¥{{ (row.reward || 0).toFixed(2) }}</text>
      </template>

      <template #cell-create_date="{ row }">
        <text class="cell-text">{{ formatDateTime(row.create_date) }}</text>
      </template>

      <template #actions="{ row }">
        <text class="action-link" @tap="viewDetail(row)">详情</text>
        <text class="action-link danger" @tap="forceCancel(row)" v-if="row.status !== 'completed' && row.status !== 'cancelled'">强制取消</text>
      </template>
    </DataTable>

    <!-- Task detail modal -->
    <DetailModal :visible="showDetail" :title="'任务详情'" @close="showDetail = false">
      <view class="detail-section" v-if="currentTask">
        <view class="detail-row">
          <text class="detail-label">任务ID</text>
          <text class="detail-value">{{ currentTask._id }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">标题</text>
          <text class="detail-value">{{ currentTask.title }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">描述</text>
          <text class="detail-value">{{ currentTask.description || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">类型</text>
          <text class="detail-value">{{ currentTask.category || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">报酬</text>
          <text class="detail-value text-warning">¥{{ (currentTask.reward || 0).toFixed(2) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">状态</text>
          <text class="detail-value" :style="{ color: getStatusColor(currentTask.status) }">
            {{ getStatusLabel(currentTask.status) }}
          </text>
        </view>
        <view class="detail-row">
          <text class="detail-label">发布者</text>
          <text class="detail-value">{{ currentTask.publisher_name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">接单者</text>
          <text class="detail-value">{{ currentTask.taker_name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">所属小区</text>
          <text class="detail-value">{{ currentTask.community_name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">发布时间</text>
          <text class="detail-value">{{ formatDateTime(currentTask.create_date) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">截止时间</text>
          <text class="detail-value">{{ formatDateTime(currentTask.deadline) }}</text>
        </view>
        <view class="detail-row" v-if="currentTask.address">
          <text class="detail-label">地点</text>
          <text class="detail-value">{{ currentTask.address }}</text>
        </view>

        <!-- Task images -->
        <view class="detail-images" v-if="currentTask.images && currentTask.images.length">
          <text class="detail-label">任务图片</text>
          <view class="images-grid">
            <image
              v-for="(img, idx) in currentTask.images"
              :key="idx"
              :src="img"
              class="task-image"
              mode="aspectFill"
              @tap="previewImage(img)"
            />
          </view>
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
import { adminCallCloud, formatDateTime, getTaskStatusLabel, getTaskStatusColor } from '@/utils/admin'

const columns = [
  { key: 'title', title: '任务标题' },
  { key: 'category', title: '类型', width: '90px' },
  { key: 'reward', title: '报酬', width: '90px' },
  { key: 'status', title: '状态', width: '80px' },
  { key: 'publisher_name', title: '发布者', width: '100px' },
  { key: 'create_date', title: '发布时间', width: '160px' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待接单', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '待确认', value: 'waiting_confirm' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '申诉中', value: 'disputed' }
]

const categoryOptions = [
  { label: '全部', value: '' },
  { label: '跑腿代取', value: '跑腿代取' },
  { label: '家政清洁', value: '家政清洁' },
  { label: '维修安装', value: '维修安装' },
  { label: '代驾出行', value: '代驾出行' },
  { label: '宠物照看', value: '宠物照看' },
  { label: '其他', value: '其他' }
]

const taskList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const keyword = ref('')
const filters = reactive<Record<string, any>>({})
const activeFilters = ref<any[]>([])

const showDetail = ref(false)
const currentTask = ref<any>(null)

const getStatusLabel = getTaskStatusLabel
const getStatusColor = getTaskStatusColor

async function loadTasks() {
  loading.value = true
  try {
    const res = await adminCallCloud('admin-task', 'getTasks', {
      page: page.value,
      pageSize,
      keyword: keyword.value,
      ...filters
    })
    taskList.value = res?.list || []
    total.value = res?.total || 0
  } catch (e) {
    console.error('Load tasks failed:', e)
  } finally {
    loading.value = false
  }
}

function onSearch(kw: string) {
  keyword.value = kw
  page.value = 1
  loadTasks()
}

function onReset() {
  keyword.value = ''
  Object.keys(filters).forEach(k => delete filters[k])
  activeFilters.value = []
  page.value = 1
  loadTasks()
}

function onPageChange(p: number) {
  page.value = p
  loadTasks()
}

function onStatusFilter(e: any) {
  const opt = statusOptions[e.detail.value]
  if (opt.value) {
    filters.status = opt.value
    // Update or add filter tag
    activeFilters.value = activeFilters.value.filter(f => f.key !== 'status')
    activeFilters.value.push({ key: 'status', label: '状态', value: opt.label })
  } else {
    delete filters.status
    activeFilters.value = activeFilters.value.filter(f => f.key !== 'status')
  }
  page.value = 1
  loadTasks()
}

function onCategoryFilter(e: any) {
  const opt = categoryOptions[e.detail.value]
  if (opt.value) {
    filters.category = opt.value
    activeFilters.value = activeFilters.value.filter(f => f.key !== 'category')
    activeFilters.value.push({ key: 'category', label: '类型', value: opt.label })
  } else {
    delete filters.category
    activeFilters.value = activeFilters.value.filter(f => f.key !== 'category')
  }
  page.value = 1
  loadTasks()
}

function removeFilter(key: string) {
  delete filters[key]
  activeFilters.value = activeFilters.value.filter(f => f.key !== key)
  page.value = 1
  loadTasks()
}

function clearFilters() {
  Object.keys(filters).forEach(k => delete filters[k])
  activeFilters.value = []
  page.value = 1
  loadTasks()
}

async function viewDetail(task: any) {
  currentTask.value = task
  showDetail.value = true
  try {
    const res = await adminCallCloud('admin-task', 'getTaskDetail', { taskId: task._id })
    if (res) {
      currentTask.value = { ...task, ...res }
    }
  } catch (e) {
    console.error('Load task detail failed:', e)
  }
}

async function forceCancel(task: any) {
  uni.showModal({
    title: '强制取消任务',
    content: `确定要强制取消任务「${task.title}」吗？如果已支付将自动退款。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-task', 'forceCancel', { taskId: task._id })
          uni.showToast({ title: '取消成功', icon: 'success' })
          loadTasks()
        } catch (e) {
          console.error('Force cancel failed:', e)
        }
      }
    }
  })
}

function previewImage(url: string) {
  uni.previewImage({
    current: url,
    urls: currentTask.value?.images || [url]
  })
}

function exportData() {
  uni.showToast({ title: '导出功能开发中', icon: 'none' })
}

onMounted(() => {
  loadTasks()
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
  display: flex;
  gap: 8px;

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

.task-title-text {
  font-size: 13px;
  color: #409EFF;
  cursor: pointer;
  &:hover { text-decoration: underline; }
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.reward-text {
  font-size: 13px;
  color: #E6A23C;
  font-weight: 500;
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
      width: 80px;
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

  .detail-images {
    margin-top: 16px;

    .detail-label {
      display: block;
      font-size: 13px;
      color: #909399;
      margin-bottom: 8px;
    }

    .images-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .task-image {
        width: 100px;
        height: 100px;
        border-radius: 6px;
        cursor: pointer;
      }
    }
  }
}
</style>
