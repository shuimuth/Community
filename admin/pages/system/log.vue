
<template>
  <AdminLayout activeKey="log">
    <view class="page-header">
      <text class="page-title">操作日志</text>
      <button class="export-btn" @tap="exportLogs">导出日志</button>
    </view>

    <DataTable
      :columns="columns"
      :data="logList"
      :total="total"
      :currentPage="page"
      :pageSize="pageSize"
      :loading="loading"
      searchPlaceholder="搜索操作描述/操作人"
      :activeFilters="activeFilters"
      @search="onSearch"
      @reset="onReset"
      @page-change="onPageChange"
      @remove-filter="removeFilter"
      @clear-filters="clearFilters"
      :showActions="true"
    >
      <template #toolbar-actions>
        <picker :range="moduleOptions" range-key="label" @change="onModuleFilter">
          <button class="filter-btn">模块筛选</button>
        </picker>
        <picker :range="typeOptions" range-key="label" @change="onTypeFilter">
          <button class="filter-btn">类型筛选</button>
        </picker>
      </template>

      <template #cell-type="{ row }">
        <text class="type-tag" :class="row.type">{{ getTypeLabel(row.type) }}</text>
      </template>

      <template #cell-module="{ row }">
        <text class="module-tag">{{ row.module || '-' }}</text>
      </template>

      <template #cell-create_date="{ row }">
        <text>{{ formatDateTime(row.create_date) }}</text>
      </template>

      <template #actions="{ row }">
        <text class="action-link" @tap="viewDetail(row)">详情</text>
      </template>
    </DataTable>

    <!-- Log detail modal -->
    <DetailModal :visible="showDetail" :title="'日志详情'" @close="showDetail = false">
      <view class="detail-section" v-if="currentLog">
        <view class="detail-row">
          <text class="detail-label">日志ID</text>
          <text class="detail-value">{{ currentLog._id }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">操作人</text>
          <text class="detail-value">{{ currentLog.operator_name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">操作类型</text>
          <text class="detail-value">{{ getTypeLabel(currentLog.type) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">操作模块</text>
          <text class="detail-value">{{ currentLog.module || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">操作描述</text>
          <text class="detail-value">{{ currentLog.description || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">目标ID</text>
          <text class="detail-value">{{ currentLog.target_id || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">IP地址</text>
          <text class="detail-value">{{ currentLog.ip || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">操作时间</text>
          <text class="detail-value">{{ formatDateTime(currentLog.create_date) }}</text>
        </view>
        <view class="detail-row" v-if="currentLog.detail">
          <text class="detail-label">详细信息</text>
          <text class="detail-value detail-json">{{ JSON.stringify(currentLog.detail, null, 2) }}</text>
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
  { key: 'operator_name', title: '操作人', width: '100px' },
  { key: 'type', title: '类型', width: '80px' },
  { key: 'module', title: '模块', width: '90px' },
  { key: 'description', title: '描述' },
  { key: 'create_date', title: '操作时间', width: '160px' }
]

const moduleOptions = [
  { label: '全部', value: '' },
  { label: '用户管理', value: 'user' },
  { label: '任务管理', value: 'task' },
  { label: '申诉管理', value: 'dispute' },
  { label: '提现管理', value: 'withdraw' },
  { label: '小区管理', value: 'community' },
  { label: '系统配置', value: 'config' }
]

const typeOptions = [
  { label: '全部', value: '' },
  { label: '新增', value: 'create' },
  { label: '修改', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '审核', value: 'audit' },
  { label: '登录', value: 'login' }
]

const logList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const keyword = ref('')
const filters = reactive<Record<string, any>>({})
const activeFilters = ref<any[]>([])
const showDetail = ref(false)
const currentLog = ref<any>(null)

function getTypeLabel(type: string): string {
  const map: Record<string, string> = { create: '新增', update: '修改', delete: '删除', audit: '审核', login: '登录' }
  return map[type] || type || '-'
}

async function loadLogs() {
  loading.value = true
  try {
    const res = await adminCallCloud('admin-log', 'getLogs', {
      page: page.value, pageSize, keyword: keyword.value, ...filters
    })
    logList.value = res?.list || []
    total.value = res?.total || 0
  } catch (e) { console.error('Load logs failed:', e) }
  finally { loading.value = false }
}

function onSearch(kw: string) { keyword.value = kw; page.value = 1; loadLogs() }
function onReset() { keyword.value = ''; Object.keys(filters).forEach(k => delete filters[k]); activeFilters.value = []; page.value = 1; loadLogs() }
function onPageChange(p: number) { page.value = p; loadLogs() }

function onModuleFilter(e: any) {
  const opt = moduleOptions[e.detail.value]
  if (opt.value) { filters.module = opt.value; activeFilters.value = activeFilters.value.filter(f => f.key !== 'module'); activeFilters.value.push({ key: 'module', label: '模块', value: opt.label }) }
  else { delete filters.module; activeFilters.value = activeFilters.value.filter(f => f.key !== 'module') }
  page.value = 1; loadLogs()
}

function onTypeFilter(e: any) {
  const opt = typeOptions[e.detail.value]
  if (opt.value) { filters.type = opt.value; activeFilters.value = activeFilters.value.filter(f => f.key !== 'type'); activeFilters.value.push({ key: 'type', label: '类型', value: opt.label }) }
  else { delete filters.type; activeFilters.value = activeFilters.value.filter(f => f.key !== 'type') }
  page.value = 1; loadLogs()
}

function removeFilter(key: string) { delete filters[key]; activeFilters.value = activeFilters.value.filter(f => f.key !== key); page.value = 1; loadLogs() }
function clearFilters() { Object.keys(filters).forEach(k => delete filters[k]); activeFilters.value = []; page.value = 1; loadLogs() }

function viewDetail(row: any) { currentLog.value = row; showDetail.value = true }

function exportLogs() { uni.showToast({ title: '导出功能开发中', icon: 'none' }) }

onMounted(() => { loadLogs() })
</script>

<style lang="scss" scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  .page-title { font-size: 18px; font-weight: 600; color: #333; }
  .export-btn { height: 34px; line-height: 34px; padding: 0 16px; background-color: #67C23A; color: #fff; font-size: 13px; border: none; border-radius: 4px; &::after { border: none; } }
}
.filter-btn { height: 34px; line-height: 34px; padding: 0 14px; font-size: 13px; background-color: #fff; border: 1px solid #DCDFE6; border-radius: 4px; color: #606266; &::after { border: none; } }
.type-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px;
  &.create { color: #409EFF; background-color: #ecf5ff; }
  &.update { color: #E6A23C; background-color: #fdf6ec; }
  &.delete { color: #F56C6C; background-color: #fef0f0; }
  &.audit { color: #9B59B6; background-color: #f4ecfc; }
  &.login { color: #67C23A; background-color: #f0f9ff; }
}
.module-tag { font-size: 12px; color: #606266; }
.action-link { font-size: 12px; color: #409EFF; cursor: pointer; padding: 2px 6px; &:hover { text-decoration: underline; } }
.detail-section {
  .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5;
    .detail-label { width: 80px; font-size: 13px; color: #909399; flex-shrink: 0; }
    .detail-value { flex: 1; font-size: 13px; color: #333;
      &.detail-json { white-space: pre-wrap; font-family: monospace; font-size: 12px; background-color: #f5f7fa; padding: 8px; border-radius: 4px; }
    }
  }
}
</style>
