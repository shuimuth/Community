
<template>
  <AdminLayout activeKey="community">
    <view class="page-header">
      <text class="page-title">小区管理</text>
      <button class="add-btn" @tap="showAddForm">+ 添加小区</button>
    </view>

    <DataTable
      :columns="columns"
      :data="communityList"
      :total="total"
      :currentPage="page"
      :pageSize="pageSize"
      :loading="loading"
      searchPlaceholder="搜索小区名称"
      @search="onSearch"
      @reset="onReset"
      @page-change="onPageChange"
    >
      <template #cell-status="{ row }">
        <text class="status-tag" :class="{ active: row.status === 1, inactive: row.status !== 1 }">
          {{ row.status === 1 ? '启用' : '禁用' }}
        </text>
      </template>

      <template #cell-user_count="{ row }">
        <text>{{ row.user_count || 0 }}人</text>
      </template>

      <template #cell-create_date="{ row }">
        <text>{{ formatDateTime(row.create_date) }}</text>
      </template>

      <template #actions="{ row }">
        <text class="action-link" @tap="editCommunity(row)">编辑</text>
        <text class="action-link danger" @tap="deleteCommunity(row)">删除</text>
      </template>
    </DataTable>

    <!-- Add/Edit modal -->
    <DetailModal :visible="showForm" :title="isEdit ? '编辑小区' : '添加小区'" @close="closeForm">
      <view class="form-section">
        <view class="form-item">
          <text class="form-label">小区名称 <text class="required">*</text></text>
          <input class="form-input" v-model="formData.name" placeholder="请输入小区名称" maxlength="50" />
        </view>
        <view class="form-item">
          <text class="form-label">所在区域 <text class="required">*</text></text>
          <input class="form-input" v-model="formData.region" placeholder="如：XX市XX区" maxlength="50" />
        </view>
        <view class="form-item">
          <text class="form-label">详细地址 <text class="required">*</text></text>
          <input class="form-input" v-model="formData.address" placeholder="请输入详细地址" maxlength="100" />
        </view>
        <view class="form-item">
          <text class="form-label">经度</text>
          <input class="form-input" type="digit" v-model="formData.longitude" placeholder="经度（可选）" />
        </view>
        <view class="form-item">
          <text class="form-label">纬度</text>
          <input class="form-input" type="digit" v-model="formData.latitude" placeholder="纬度（可选）" />
        </view>
        <view class="form-item">
          <text class="form-label">状态</text>
          <view class="radio-group">
            <view class="radio-item" :class="{ active: formData.status === 1 }" @tap="formData.status = 1">
              <view class="radio-dot"></view>
              <text>启用</text>
            </view>
            <view class="radio-item" :class="{ active: formData.status === 0 }" @tap="formData.status = 0">
              <view class="radio-dot"></view>
              <text>禁用</text>
            </view>
          </view>
        </view>
      </view>

      <template #footer>
        <button class="cancel-btn" @tap="closeForm">取消</button>
        <button class="submit-btn" :disabled="submitting" @tap="submitForm">
          {{ submitting ? '提交中...' : '确定' }}
        </button>
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
  { key: 'name', title: '小区名称' },
  { key: 'region', title: '所在区域', width: '120px' },
  { key: 'address', title: '详细地址' },
  { key: 'user_count', title: '用户数', width: '80px' },
  { key: 'status', title: '状态', width: '70px' },
  { key: 'create_date', title: '创建时间', width: '160px' }
]

const communityList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const keyword = ref('')

const showForm = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const editId = ref('')
const formData = reactive({
  name: '',
  region: '',
  address: '',
  longitude: '',
  latitude: '',
  status: 1
})

async function loadCommunities() {
  loading.value = true
  try {
    const res = await adminCallCloud('admin-community', 'getCommunities', {
      page: page.value, pageSize, keyword: keyword.value
    })
    communityList.value = res?.list || []
    total.value = res?.total || 0
  } catch (e) { console.error('Load communities failed:', e) }
  finally { loading.value = false }
}

function onSearch(kw: string) { keyword.value = kw; page.value = 1; loadCommunities() }
function onReset() { keyword.value = ''; page.value = 1; loadCommunities() }
function onPageChange(p: number) { page.value = p; loadCommunities() }

function showAddForm() {
  isEdit.value = false
  editId.value = ''
  formData.name = ''
  formData.region = ''
  formData.address = ''
  formData.longitude = ''
  formData.latitude = ''
  formData.status = 1
  showForm.value = true
}

function editCommunity(row: any) {
  isEdit.value = true
  editId.value = row._id
  formData.name = row.name || ''
  formData.region = row.region || ''
  formData.address = row.address || ''
  formData.longitude = row.location?.coordinates?.[0]?.toString() || ''
  formData.latitude = row.location?.coordinates?.[1]?.toString() || ''
  formData.status = row.status ?? 1
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

async function submitForm() {
  if (!formData.name.trim()) { uni.showToast({ title: '请输入小区名称', icon: 'none' }); return }
  if (!formData.region.trim()) { uni.showToast({ title: '请输入所在区域', icon: 'none' }); return }
  if (!formData.address.trim()) { uni.showToast({ title: '请输入详细地址', icon: 'none' }); return }

  submitting.value = true
  try {
    const params: any = {
      name: formData.name.trim(),
      region: formData.region.trim(),
      address: formData.address.trim(),
      status: formData.status
    }
    if (formData.longitude && formData.latitude) {
      params.location = {
        type: 'Point',
        coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)]
      }
    }

    if (isEdit.value) {
      await adminCallCloud('admin-community', 'updateCommunity', { communityId: editId.value, ...params })
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await adminCallCloud('admin-community', 'addCommunity', params)
      uni.showToast({ title: '添加成功', icon: 'success' })
    }
    closeForm()
    loadCommunities()
  } catch (e) { console.error('Submit community failed:', e) }
  finally { submitting.value = false }
}

async function deleteCommunity(row: any) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除小区「${row.name}」吗？删除前请确认该小区下无关联用户和任务数据。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminCallCloud('admin-community', 'deleteCommunity', { communityId: row._id })
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadCommunities()
        } catch (e) { console.error('Delete community failed:', e) }
      }
    }
  })
}

onMounted(() => { loadCommunities() })
</script>

<style lang="scss" scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  .page-title { font-size: 18px; font-weight: 600; color: #333; }
  .add-btn { height: 34px; line-height: 34px; padding: 0 16px; background-color: #409EFF; color: #fff; font-size: 13px; border: none; border-radius: 4px; &::after { border: none; } }
}
.status-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px;
  &.active { color: #67C23A; background-color: #f0f9ff; }
  &.inactive { color: #909399; background-color: #f4f4f5; }
}
.action-link { font-size: 12px; color: #409EFF; cursor: pointer; padding: 2px 6px; &.danger { color: #F56C6C; } &:hover { text-decoration: underline; } }
.form-section {
  .form-item { margin-bottom: 16px;
    .form-label { display: block; font-size: 13px; color: #606266; margin-bottom: 6px; .required { color: #F56C6C; } }
    .form-input { width: 100%; height: 38px; padding: 0 12px; border: 1px solid #DCDFE6; border-radius: 4px; font-size: 13px; background-color: #f9f9f9; }
    .radio-group { display: flex; gap: 20px;
      .radio-item { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #606266;
        .radio-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #DCDFE6; position: relative; }
        &.active { color: #409EFF;
          .radio-dot { border-color: #409EFF; &::after { content: ''; position: absolute; top: 3px; left: 3px; width: 6px; height: 6px; border-radius: 50%; background-color: #409EFF; } }
        }
      }
    }
  }
}
.cancel-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #f5f7fa; color: #606266; font-size: 13px; border: 1px solid #DCDFE6; border-radius: 4px; &::after { border: none; } }
.submit-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #409EFF; color: #fff; font-size: 13px; border: none; border-radius: 4px; &[disabled] { opacity: 0.6; } &::after { border: none; } }
</style>
