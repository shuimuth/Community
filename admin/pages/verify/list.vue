<template>
  <AdminLayout activeKey="verify">
    <view class="page-header">
      <text class="page-title">实名审核</text>
      <view class="page-stats" v-if="pendingCount > 0">
        <text class="pending-badge">{{ pendingCount }} 条待审核</text>
      </view>
    </view>

    <DataTable
      :columns="columns"
      :data="verifyList"
      :total="total"
      :currentPage="page"
      :pageSize="pageSize"
      :loading="loading"
      searchPlaceholder="搜索姓名/身份证/昵称"
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

      <template #cell-auth_status="{ row }">
        <text class="status-tag" :class="getStatusClass(row.auth_status)">{{ getAuthStatusLabel(row.auth_status) }}</text>
      </template>

      <template #cell-identity="{ row }">
        <text class="identity-text">{{ maskIdCard(row.identity) }}</text>
      </template>

      <template #cell-register_date="{ row }">
        <text>{{ formatDateTime(row.register_date) }}</text>
      </template>

      <template #actions="{ row }">
        <text class="action-link" @tap="viewDetail(row)">详情</text>
        <text class="action-link success" @tap="handleApprove(row)" v-if="row.auth_status === 1">通过</text>
        <text class="action-link danger" @tap="handleReject(row)" v-if="row.auth_status === 1">拒绝</text>
      </template>
    </DataTable>

    <!-- Verify detail modal -->
    <DetailModal :visible="showDetail" :title="'实名认证详情'" @close="showDetail = false">
      <view class="detail-section" v-if="currentItem">
        <view class="detail-row">
          <text class="detail-label">用户ID</text>
          <text class="detail-value">{{ currentItem._id }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">用户昵称</text>
          <text class="detail-value">{{ currentItem.nickname }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">真实姓名</text>
          <text class="detail-value detail-value--highlight">{{ currentItem.real_name }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">身份证号</text>
          <text class="detail-value detail-value--mono">{{ currentItem.identity }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">手机号</text>
          <text class="detail-value">{{ currentItem.mobile }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">认证状态</text>
          <text class="detail-value" :class="'status-text-' + currentItem.auth_status">{{ getAuthStatusLabel(currentItem.auth_status) }}</text>
        </view>
        <view class="detail-row" v-if="currentItem.auth_date">
          <text class="detail-label">认证时间</text>
          <text class="detail-value">{{ formatDateTime(currentItem.auth_date) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">注册时间</text>
          <text class="detail-value">{{ formatDateTime(currentItem.register_date) }}</text>
        </view>

        <!-- ID card photos section -->
        <view class="photos-section">
          <text class="photos-title">证件照片</text>
          <view class="photos-grid">
            <view class="photo-item" v-if="currentItem.id_card_front">
              <text class="photo-label">身份证正面</text>
              <image
                class="photo-img"
                :src="currentItem.id_card_front"
                mode="aspectFit"
                @tap="previewImage(currentItem.id_card_front)"
              />
            </view>
            <view class="photo-item" v-if="currentItem.id_card_back">
              <text class="photo-label">身份证反面</text>
              <image
                class="photo-img"
                :src="currentItem.id_card_back"
                mode="aspectFit"
                @tap="previewImage(currentItem.id_card_back)"
              />
            </view>
            <view class="photo-item photo-item--wide" v-if="currentItem.in_hand">
              <text class="photo-label">手持身份证</text>
              <image
                class="photo-img"
                :src="currentItem.in_hand"
                mode="aspectFit"
                @tap="previewImage(currentItem.in_hand)"
              />
            </view>
            <view class="photo-empty" v-if="!currentItem.id_card_front && !currentItem.id_card_back && !currentItem.in_hand">
              <text class="photo-empty-text">未上传证件照片</text>
            </view>
          </view>
        </view>
      </view>

      <template #footer v-if="currentItem?.auth_status === 1">
        <button class="reject-btn" @tap="handleReject(currentItem)">拒绝</button>
        <button class="approve-btn" @tap="handleApprove(currentItem)">通过认证</button>
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
  { key: 'nickname', title: '用户昵称', width: '90px' },
  { key: 'real_name', title: '真实姓名', width: '80px' },
  { key: 'identity', title: '身份证号', width: '160px' },
  { key: 'mobile', title: '手机号', width: '120px' },
  { key: 'auth_status', title: '状态', width: '80px' },
  { key: 'register_date', title: '注册时间', width: '160px' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审核', value: 1 },
  { label: '已通过', value: 2 },
  { label: '已拒绝', value: 3 }
]

const verifyList = ref<any[]>([])
const total = ref(0)
const pendingCount = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const keyword = ref('')
const filters = reactive<Record<string, any>>({})
const activeFilters = ref<any[]>([])
const showDetail = ref(false)
const currentItem = ref<any>(null)

/**
 * Get auth status label text
 */
function getAuthStatusLabel(status: number): string {
  const map: Record<number, string> = {
    0: '未认证',
    1: '待审核',
    2: '已通过',
    3: '已拒绝'
  }
  return map[status] || '未知'
}

/**
 * Get status CSS class
 */
function getStatusClass(status: number): string {
  const map: Record<number, string> = {
    0: 'not-verified',
    1: 'pending',
    2: 'approved',
    3: 'rejected'
  }
  return map[status] || ''
}

/**
 * Mask ID card number for display in list
 */
function maskIdCard(idCard: string): string {
  if (!idCard || idCard === '-' || idCard.length < 8) return idCard || '-'
  return idCard.substring(0, 4) + '**********' + idCard.substring(idCard.length - 4)
}

/**
 * Load verifications list from cloud
 */
async function loadVerifications() {
  loading.value = true
  try {
    const res = await adminCallCloud('admin-verify', 'getVerifications', {
      page: page.value, pageSize, keyword: keyword.value, ...filters
    })
    verifyList.value = res?.list || []
    total.value = res?.total || 0
  } catch (e) {
    console.error('Load verifications failed:', e)
  } finally {
    loading.value = false
  }
}

/**
 * Load pending count for badge
 */
async function loadPendingCount() {
  try {
    const res = await adminCallCloud('admin-verify', 'getVerifications', {
      page: 1, pageSize: 1, status: 1
    })
    pendingCount.value = res?.total || 0
  } catch (e) {
    console.error('Load pending count failed:', e)
  }
}

function onSearch(kw: string) {
  keyword.value = kw
  page.value = 1
  loadVerifications()
}

function onReset() {
  keyword.value = ''
  Object.keys(filters).forEach(k => delete filters[k])
  activeFilters.value = []
  page.value = 1
  loadVerifications()
}

function onPageChange(p: number) {
  page.value = p
  loadVerifications()
}

function onStatusFilter(e: any) {
  const opt = statusOptions[e.detail.value]
  if (opt.value !== '') {
    filters.status = opt.value
    activeFilters.value = [{ key: 'status', label: '状态', value: opt.label }]
  } else {
    delete filters.status
    activeFilters.value = []
  }
  page.value = 1
  loadVerifications()
}

function removeFilter(key: string) {
  delete filters[key]
  activeFilters.value = activeFilters.value.filter(f => f.key !== key)
  page.value = 1
  loadVerifications()
}

function clearFilters() {
  Object.keys(filters).forEach(k => delete filters[k])
  activeFilters.value = []
  page.value = 1
  loadVerifications()
}

function viewDetail(row: any) {
  currentItem.value = row
  showDetail.value = true
}

/**
 * Preview image in full screen
 */
function previewImage(url: string) {
  if (!url) return
  const urls = []
  if (currentItem.value?.id_card_front) urls.push(currentItem.value.id_card_front)
  if (currentItem.value?.id_card_back) urls.push(currentItem.value.id_card_back)
  if (currentItem.value?.in_hand) urls.push(currentItem.value.in_hand)
  uni.previewImage({ current: url, urls: urls.length > 0 ? urls : [url] })
}

/**
 * Approve verification
 */
async function handleApprove(row: any) {
  uni.showModal({
    title: '确认通过',
    content: `确定通过用户「${row.real_name}」的实名认证吗？通过后将增加信用分 +10。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-verify', 'approveVerification', { userId: row._id })
          uni.showToast({ title: '已通过认证', icon: 'success' })
          showDetail.value = false
          loadVerifications()
          loadPendingCount()
        } catch (e) {
          console.error('Approve failed:', e)
        }
      }
    }
  })
}

/**
 * Reject verification
 */
async function handleReject(row: any) {
  uni.showModal({
    title: '拒绝认证',
    editable: true,
    placeholderText: '请输入拒绝原因（如：照片模糊、信息不匹配等）',
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-verify', 'rejectVerification', {
            userId: row._id,
            reason: res.content || '审核不通过'
          })
          uni.showToast({ title: '已拒绝', icon: 'success' })
          showDetail.value = false
          loadVerifications()
          loadPendingCount()
        } catch (e) {
          console.error('Reject failed:', e)
        }
      }
    }
  })
}

onMounted(() => {
  loadVerifications()
  loadPendingCount()
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

  .page-stats {
    display: flex;
    align-items: center;
  }

  .pending-badge {
    display: inline-block;
    padding: 3px 10px;
    background-color: #FDF6EC;
    color: #E6A23C;
    font-size: 12px;
    font-weight: 500;
    border-radius: 10px;
    border: 1px solid #FAECD8;
  }
}

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

.identity-text {
  font-size: 12px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  color: #606266;
  letter-spacing: 0.3px;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;

  &.not-verified { color: #909399; background-color: #f4f4f5; }
  &.pending { color: #E6A23C; background-color: #fdf6ec; }
  &.approved { color: #67C23A; background-color: #f0f9eb; }
  &.rejected { color: #F56C6C; background-color: #fef0f0; }
}

.action-link {
  font-size: 12px;
  color: #409EFF;
  cursor: pointer;
  padding: 2px 6px;
  &.success { color: #67C23A; }
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

      &--highlight {
        font-weight: 600;
        color: #303133;
      }
      &--mono {
        font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
        letter-spacing: 0.5px;
      }
    }
  }
}

/* Photo preview section */
.photos-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #EBEEF5;

  .photos-title {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
  }
}

.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.photo-item {
  width: calc(50% - 6px);

  &--wide {
    width: 100%;
  }

  .photo-label {
    display: block;
    font-size: 12px;
    color: #909399;
    margin-bottom: 6px;
  }

  .photo-img {
    width: 100%;
    height: 120px;
    border-radius: 6px;
    border: 1px solid #EBEEF5;
    background-color: #FAFAFA;
    cursor: pointer;

    &:hover {
      border-color: #409EFF;
    }
  }
}

.photo-empty {
  width: 100%;
  padding: 20px;
  text-align: center;
  background-color: #FAFAFA;
  border-radius: 6px;
  border: 1px dashed #DCDFE6;

  .photo-empty-text {
    font-size: 13px;
    color: #C0C4CC;
  }
}

/* Status text colors */
.status-text-1 { color: #E6A23C; }
.status-text-2 { color: #67C23A; }
.status-text-3 { color: #F56C6C; }

/* Action buttons in modal footer */
.reject-btn {
  height: 36px;
  line-height: 36px;
  padding: 0 20px;
  background-color: #fff;
  color: #F56C6C;
  font-size: 13px;
  border: 1px solid #F56C6C;
  border-radius: 4px;
  &::after { border: none; }
}

.approve-btn {
  height: 36px;
  line-height: 36px;
  padding: 0 20px;
  background-color: #67C23A;
  color: #fff;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  &::after { border: none; }
}
</style>
