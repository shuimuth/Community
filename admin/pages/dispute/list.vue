
<template>
  <AdminLayout activeKey="dispute">
    <view class="page-header">
      <text class="page-title">申诉管理</text>
    </view>

    <DataTable
      :columns="columns"
      :data="disputeList"
      :total="total"
      :currentPage="page"
      :pageSize="pageSize"
      :loading="loading"
      searchPlaceholder="搜索任务标题/申诉人"
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

      <template #cell-status="{ row }">
        <text class="status-tag" :class="row.status">{{ getDisputeStatusLabel(row.status) }}</text>
      </template>

      <template #cell-create_date="{ row }">
        <text>{{ formatDateTime(row.create_date) }}</text>
      </template>

      <template #actions="{ row }">
        <text class="action-link" @tap="viewDetail(row)">详情</text>
        <text class="action-link primary" @tap="handleDispute(row)" v-if="row.status === 'pending'">处理</text>
      </template>
    </DataTable>

    <!-- Dispute detail & handle modal -->
    <DetailModal :visible="showDetail" :title="'申诉详情'" @close="closeModal">
      <view class="detail-section" v-if="currentDispute">
        <view class="detail-row">
          <text class="detail-label">申诉ID</text>
          <text class="detail-value">{{ currentDispute._id }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">关联任务</text>
          <text class="detail-value link" @tap="goTaskDetail(currentDispute.task_id)">{{ currentDispute.task_title || currentDispute.task_id }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">申诉人</text>
          <text class="detail-value">{{ currentDispute.complainant_name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">被申诉人</text>
          <text class="detail-value">{{ currentDispute.respondent_name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">申诉原因</text>
          <text class="detail-value">{{ currentDispute.reason || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">详细描述</text>
          <text class="detail-value">{{ currentDispute.description || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">申诉时间</text>
          <text class="detail-value">{{ formatDateTime(currentDispute.create_date) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">状态</text>
          <text class="detail-value" :class="'status-' + currentDispute.status">{{ getDisputeStatusLabel(currentDispute.status) }}</text>
        </view>

        <!-- Evidence images -->
        <view class="detail-images" v-if="currentDispute.evidence && currentDispute.evidence.length">
          <text class="detail-label">举证材料</text>
          <view class="images-grid">
            <image v-for="(img, idx) in currentDispute.evidence" :key="idx" :src="img" class="evidence-img" mode="aspectFill" @tap="previewImage(img)" />
          </view>
        </view>

        <!-- Handle form -->
        <view class="handle-form" v-if="isHandling">
          <view class="form-title">裁决处理</view>
          <view class="form-item">
            <text class="form-label">处理结果</text>
            <picker :range="resultOptions" range-key="label" @change="onResultChange">
              <view class="picker-value">{{ handleForm.resultLabel || '请选择处理结果' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">处理意见</text>
            <textarea class="form-textarea" v-model="handleForm.opinion" placeholder="请输入处理意见" maxlength="500" />
          </view>
          <view class="form-item" v-if="handleForm.result === 'refund'">
            <text class="form-label">退款金额</text>
            <input class="form-input" type="digit" v-model="handleForm.refundAmount" placeholder="请输入退款金额" />
          </view>
          <view class="form-actions">
            <button class="cancel-btn" @tap="isHandling = false">取消</button>
            <button class="submit-btn" :disabled="submitting" @tap="submitHandle">{{ submitting ? '提交中...' : '提交裁决' }}</button>
          </view>
        </view>

        <!-- Previous result -->
        <view class="handle-result" v-if="currentDispute.status !== 'pending' && currentDispute.handle_result">
          <view class="form-title">处理记录</view>
          <view class="detail-row">
            <text class="detail-label">处理结果</text>
            <text class="detail-value">{{ currentDispute.handle_result }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">处理意见</text>
            <text class="detail-value">{{ currentDispute.handle_opinion || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">处理人</text>
            <text class="detail-value">{{ currentDispute.handler_name || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">处理时间</text>
            <text class="detail-value">{{ formatDateTime(currentDispute.handle_date) }}</text>
          </view>
        </view>
      </view>

      <template #footer v-if="currentDispute?.status === 'pending' && !isHandling">
        <button class="handle-btn" @tap="isHandling = true">处理此申诉</button>
      </template>
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
  { key: 'task_title', title: '关联任务' },
  { key: 'complainant_name', title: '申诉人', width: '100px' },
  { key: 'reason', title: '申诉原因', width: '120px' },
  { key: 'status', title: '状态', width: '80px' },
  { key: 'create_date', title: '申诉时间', width: '160px' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '已处理', value: 'resolved' },
  { label: '已关闭', value: 'closed' }
]

const resultOptions = [
  { label: '支持申诉方（退款给申诉方）', value: 'refund' },
  { label: '支持被申诉方（驳回申诉）', value: 'reject' },
  { label: '双方各退一半', value: 'split' },
  { label: '关闭申诉（无需处理）', value: 'close' }
]

const disputeList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const keyword = ref('')
const filters = reactive<Record<string, any>>({})
const activeFilters = ref<any[]>([])

const showDetail = ref(false)
const currentDispute = ref<any>(null)
const isHandling = ref(false)
const submitting = ref(false)
const handleForm = reactive({
  result: '',
  resultLabel: '',
  opinion: '',
  refundAmount: ''
})

function getDisputeStatusLabel(status: string): string {
  const map: Record<string, string> = { pending: '待处理', resolved: '已处理', closed: '已关闭' }
  return map[status] || status
}

async function loadDisputes() {
  loading.value = true
  try {
    const res = await adminCallCloud('admin-dispute', 'getDisputes', {
      page: page.value, pageSize, keyword: keyword.value, ...filters
    })
    disputeList.value = res?.list || []
    total.value = res?.total || 0
  } catch (e) { console.error('Load disputes failed:', e) }
  finally { loading.value = false }
}

function onSearch(kw: string) { keyword.value = kw; page.value = 1; loadDisputes() }
function onReset() { keyword.value = ''; Object.keys(filters).forEach(k => delete filters[k]); activeFilters.value = []; page.value = 1; loadDisputes() }
function onPageChange(p: number) { page.value = p; loadDisputes() }

function onStatusFilter(e: any) {
  const opt = statusOptions[e.detail.value]
  if (opt.value) {
    filters.status = opt.value
    activeFilters.value = [{ key: 'status', label: '状态', value: opt.label }]
  } else {
    delete filters.status
    activeFilters.value = []
  }
  page.value = 1; loadDisputes()
}

function removeFilter(key: string) { delete filters[key]; activeFilters.value = activeFilters.value.filter(f => f.key !== key); page.value = 1; loadDisputes() }
function clearFilters() { Object.keys(filters).forEach(k => delete filters[k]); activeFilters.value = []; page.value = 1; loadDisputes() }

async function viewDetail(row: any) {
  currentDispute.value = row
  isHandling.value = false
  showDetail.value = true
  try {
    const res = await adminCallCloud('admin-dispute', 'getDisputeDetail', { disputeId: row._id })
    if (res) currentDispute.value = { ...row, ...res }
  } catch (e) { console.error('Load dispute detail failed:', e) }
}

function handleDispute(row: any) {
  viewDetail(row)
  setTimeout(() => { isHandling.value = true }, 300)
}

function closeModal() {
  showDetail.value = false
  isHandling.value = false
  handleForm.result = ''
  handleForm.resultLabel = ''
  handleForm.opinion = ''
  handleForm.refundAmount = ''
}

function onResultChange(e: any) {
  const opt = resultOptions[e.detail.value]
  handleForm.result = opt.value
  handleForm.resultLabel = opt.label
}

async function submitHandle() {
  if (!handleForm.result) { uni.showToast({ title: '请选择处理结果', icon: 'none' }); return }
  if (!handleForm.opinion) { uni.showToast({ title: '请输入处理意见', icon: 'none' }); return }

  submitting.value = true
  try {
    await adminCallCloud('admin-dispute', 'handleDispute', {
      disputeId: currentDispute.value._id,
      result: handleForm.result,
      opinion: handleForm.opinion,
      refundAmount: handleForm.result === 'refund' ? parseFloat(handleForm.refundAmount) || 0 : 0
    })
    uni.showToast({ title: '处理成功', icon: 'success' })
    closeModal()
    loadDisputes()
  } catch (e) { console.error('Handle dispute failed:', e) }
  finally { submitting.value = false }
}

function goTaskDetail(taskId: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${taskId}` })
}

function previewImage(url: string) {
  uni.previewImage({ current: url, urls: currentDispute.value?.evidence || [url] })
}

onMounted(() => { loadDisputes() })
</script>

<style lang="scss" scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  .page-title { font-size: 18px; font-weight: 600; color: #333; }
}
.filter-btn { height: 34px; line-height: 34px; padding: 0 14px; font-size: 13px; background-color: #fff; border: 1px solid #DCDFE6; border-radius: 4px; color: #606266; &::after { border: none; } }
.status-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px;
  &.pending { color: #E6A23C; background-color: #fdf6ec; }
  &.resolved { color: #67C23A; background-color: #f0f9ff; }
  &.closed { color: #909399; background-color: #f4f4f5; }
}
.action-link { font-size: 12px; color: #409EFF; cursor: pointer; padding: 2px 6px; &.primary { color: #E6A23C; } &:hover { text-decoration: underline; } }
.detail-section {
  .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5;
    .detail-label { width: 80px; font-size: 13px; color: #909399; flex-shrink: 0; }
    .detail-value { flex: 1; font-size: 13px; color: #333; &.link { color: #409EFF; cursor: pointer; } }
  }
  .detail-images { margin-top: 16px;
    .detail-label { display: block; font-size: 13px; color: #909399; margin-bottom: 8px; }
    .images-grid { display: flex; flex-wrap: wrap; gap: 8px;
      .evidence-img { width: 100px; height: 100px; border-radius: 6px; cursor: pointer; }
    }
  }
}
.handle-form { margin-top: 20px; padding-top: 16px; border-top: 2px solid #409EFF;
  .form-title { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 16px; }
  .form-item { margin-bottom: 14px;
    .form-label { display: block; font-size: 13px; color: #606266; margin-bottom: 6px; }
    .picker-value { height: 36px; line-height: 36px; padding: 0 12px; border: 1px solid #DCDFE6; border-radius: 4px; font-size: 13px; color: #333; background-color: #f9f9f9; }
    .form-textarea { width: 100%; min-height: 80px; padding: 10px 12px; border: 1px solid #DCDFE6; border-radius: 4px; font-size: 13px; }
    .form-input { height: 36px; padding: 0 12px; border: 1px solid #DCDFE6; border-radius: 4px; font-size: 13px; width: 200px; }
  }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px;
    .cancel-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #f5f7fa; color: #606266; font-size: 13px; border: 1px solid #DCDFE6; border-radius: 4px; &::after { border: none; } }
    .submit-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #409EFF; color: #fff; font-size: 13px; border: none; border-radius: 4px; &[disabled] { opacity: 0.6; } &::after { border: none; } }
  }
}
.handle-result { margin-top: 20px; padding-top: 16px; border-top: 1px solid #ebeef5;
  .form-title { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 12px; }
}
.handle-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #E6A23C; color: #fff; font-size: 13px; border: none; border-radius: 4px; &::after { border: none; } }
.status-pending { color: #E6A23C; }
.status-resolved { color: #67C23A; }
.status-closed { color: #909399; }
</style>
