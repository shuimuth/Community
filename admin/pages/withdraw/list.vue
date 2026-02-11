
<template>
  <AdminLayout activeKey="withdraw">
    <view class="page-header">
      <text class="page-title">提现审核</text>
    </view>

    <DataTable
      :columns="columns"
      :data="withdrawList"
      :total="total"
      :currentPage="page"
      :pageSize="pageSize"
      :loading="loading"
      searchPlaceholder="搜索用户昵称"
      :activeFilters="activeFilters"
      @search="onSearch"
      @reset="onReset"
      @page-change="onPageChange"
      @remove-filter="removeFilter"
      @clear-filters="clearFilters"
    >
      <template #toolbar-actions>
        <picker :range="statusOptions" range-key="label" @change="onStatusFilter">
          <button class="filter-btn">状态筛选</button>
        </picker>
      </template>

      <template #cell-amount="{ row }">
        <text class="amount-text">¥{{ (row.amount || 0).toFixed(2) }}</text>
      </template>

      <template #cell-status="{ row }">
        <text class="status-tag" :class="row.status">{{ getWithdrawStatusLabel(row.status) }}</text>
      </template>

      <template #cell-create_date="{ row }">
        <text>{{ formatDateTime(row.create_date) }}</text>
      </template>

      <template #actions="{ row }">
        <text class="action-link" @tap="viewDetail(row)">详情</text>
        <text class="action-link success" @tap="approveWithdraw(row)" v-if="row.status === 'pending'">通过</text>
        <text class="action-link danger" @tap="rejectWithdraw(row)" v-if="row.status === 'pending'">拒绝</text>
      </template>
    </DataTable>

    <!-- Withdraw detail modal -->
    <DetailModal :visible="showDetail" :title="'提现详情'" @close="showDetail = false">
      <view class="detail-section" v-if="currentWithdraw">
        <view class="detail-row">
          <text class="detail-label">提现ID</text>
          <text class="detail-value">{{ currentWithdraw._id }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">用户</text>
          <text class="detail-value">{{ currentWithdraw.user_name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">提现金额</text>
          <text class="detail-value text-warning">¥{{ (currentWithdraw.amount || 0).toFixed(2) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">提现方式</text>
          <text class="detail-value">{{ currentWithdraw.method || '微信零钱' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">申请时间</text>
          <text class="detail-value">{{ formatDateTime(currentWithdraw.create_date) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">状态</text>
          <text class="detail-value" :class="'status-' + currentWithdraw.status">{{ getWithdrawStatusLabel(currentWithdraw.status) }}</text>
        </view>
        <view class="detail-row" v-if="currentWithdraw.real_name">
          <text class="detail-label">实名姓名</text>
          <text class="detail-value">{{ currentWithdraw.real_name }}</text>
        </view>
        <view class="detail-row" v-if="currentWithdraw.handle_date">
          <text class="detail-label">处理时间</text>
          <text class="detail-value">{{ formatDateTime(currentWithdraw.handle_date) }}</text>
        </view>
        <view class="detail-row" v-if="currentWithdraw.reject_reason">
          <text class="detail-label">拒绝原因</text>
          <text class="detail-value text-danger">{{ currentWithdraw.reject_reason }}</text>
        </view>
      </view>

      <template #footer v-if="currentWithdraw?.status === 'pending'">
        <button class="reject-btn" @tap="rejectWithdraw(currentWithdraw)">拒绝</button>
        <button class="approve-btn" @tap="approveWithdraw(currentWithdraw)">通过并打款</button>
      </template>
    </DetailModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import DataTable from '@/components/DataTable.vue'
import DetailModal from '@/components/DetailModal.vue'
import { adminCallCloud, formatDateTime, getWithdrawStatusLabel } from '@/utils/admin'

const columns = [
  { key: 'user_name', title: '用户', width: '100px' },
  { key: 'amount', title: '金额', width: '100px' },
  { key: 'method', title: '方式', width: '90px' },
  { key: 'status', title: '状态', width: '80px' },
  { key: 'create_date', title: '申请时间', width: '160px' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已打款', value: 'paid' }
]

const withdrawList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const keyword = ref('')
const filters = reactive<Record<string, any>>({})
const activeFilters = ref<any[]>([])
const showDetail = ref(false)
const currentWithdraw = ref<any>(null)

async function loadWithdrawals() {
  loading.value = true
  try {
    const res = await adminCallCloud('admin-withdraw', 'getWithdrawals', {
      page: page.value, pageSize, keyword: keyword.value, ...filters
    })
    withdrawList.value = res?.list || []
    total.value = res?.total || 0
  } catch (e) { console.error('Load withdrawals failed:', e) }
  finally { loading.value = false }
}

function onSearch(kw: string) { keyword.value = kw; page.value = 1; loadWithdrawals() }
function onReset() { keyword.value = ''; Object.keys(filters).forEach(k => delete filters[k]); activeFilters.value = []; page.value = 1; loadWithdrawals() }
function onPageChange(p: number) { page.value = p; loadWithdrawals() }
function onStatusFilter(e: any) {
  const opt = statusOptions[e.detail.value]
  if (opt.value) { filters.status = opt.value; activeFilters.value = [{ key: 'status', label: '状态', value: opt.label }] }
  else { delete filters.status; activeFilters.value = [] }
  page.value = 1; loadWithdrawals()
}
function removeFilter(key: string) { delete filters[key]; activeFilters.value = activeFilters.value.filter(f => f.key !== key); page.value = 1; loadWithdrawals() }
function clearFilters() { Object.keys(filters).forEach(k => delete filters[k]); activeFilters.value = []; page.value = 1; loadWithdrawals() }

function viewDetail(row: any) { currentWithdraw.value = row; showDetail.value = true }

async function approveWithdraw(row: any) {
  uni.showModal({
    title: '确认通过', content: `确定通过该笔提现申请（¥${(row.amount || 0).toFixed(2)}）并打款吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-withdraw', 'approveWithdraw', { withdrawId: row._id })
          uni.showToast({ title: '审核通过', icon: 'success' })
          showDetail.value = false; loadWithdrawals()
        } catch (e) { console.error('Approve failed:', e) }
      }
    }
  })
}

async function rejectWithdraw(row: any) {
  uni.showModal({
    title: '拒绝提现', editable: true, placeholderText: '请输入拒绝原因',
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-withdraw', 'rejectWithdraw', { withdrawId: row._id, reason: res.content || '审核不通过' })
          uni.showToast({ title: '已拒绝', icon: 'success' })
          showDetail.value = false; loadWithdrawals()
        } catch (e) { console.error('Reject failed:', e) }
      }
    }
  })
}

onMounted(() => { loadWithdrawals() })
</script>

<style lang="scss" scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  .page-title { font-size: 18px; font-weight: 600; color: #333; }
}
.filter-btn { height: 34px; line-height: 34px; padding: 0 14px; font-size: 13px; background-color: #fff; border: 1px solid #DCDFE6; border-radius: 4px; color: #606266; &::after { border: none; } }
.amount-text { font-size: 13px; color: #E6A23C; font-weight: 500; }
.status-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px;
  &.pending { color: #E6A23C; background-color: #fdf6ec; }
  &.approved, &.paid { color: #67C23A; background-color: #f0f9ff; }
  &.rejected { color: #F56C6C; background-color: #fef0f0; }
  &.failed { color: #909399; background-color: #f4f4f5; }
}
.action-link { font-size: 12px; color: #409EFF; cursor: pointer; padding: 2px 6px; &.success { color: #67C23A; } &.danger { color: #F56C6C; } &:hover { text-decoration: underline; } }
.detail-section {
  .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5;
    .detail-label { width: 80px; font-size: 13px; color: #909399; flex-shrink: 0; }
    .detail-value { flex: 1; font-size: 13px; color: #333; }
  }
}
.reject-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #fff; color: #F56C6C; font-size: 13px; border: 1px solid #F56C6C; border-radius: 4px; &::after { border: none; } }
.approve-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #67C23A; color: #fff; font-size: 13px; border: none; border-radius: 4px; &::after { border: none; } }
.text-warning { color: #E6A23C; }
.text-danger { color: #F56C6C; }
.status-pending { color: #E6A23C; }
.status-approved, .status-paid { color: #67C23A; }
.status-rejected { color: #F56C6C; }
</style>
