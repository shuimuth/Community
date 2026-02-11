<template>
  <view class="publish-page">
    <!-- Progress indicator -->
    <view class="publish-progress">
      <view class="publish-progress__bar">
        <view class="publish-progress__fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <text class="publish-progress__text">已填写 {{ filledCount }}/{{ totalFields }} 项</text>
    </view>

    <!-- Scrollable form content -->
    <scroll-view scroll-y class="publish-body">
      <uni-forms ref="formRef" :modelValue="formData" :rules="formRules" label-position="top">

        <!-- Section 1: Task type -->
        <view class="form-card anim-fade-up" style="animation-delay: 0s">
          <view class="form-card__header">
            <text class="form-card__icon">📋</text>
            <text class="form-card__title">任务类型</text>
            <text class="form-card__required">*</text>
          </view>
          <uni-forms-item name="task_type" :label="''" class="form-card__item">
            <view class="type-chips">
              <view
                v-for="item in taskTypes"
                :key="item"
                class="type-chip pressable"
                :class="{ 'type-chip--active': formData.task_type === item }"
                @tap="selectType(item)"
              >
                <text class="type-chip__label">{{ item }}</text>
              </view>
            </view>
            <view v-if="formData.task_type === '其他'" class="custom-type-input anim-fade-in">
              <uni-easyinput
                v-model="formData.custom_type"
                placeholder="请输入自定义类型名称"
                :maxlength="10"
              />
            </view>
          </uni-forms-item>
        </view>

        <!-- Section 2: Basic info -->
        <view class="form-card anim-fade-up" style="animation-delay: 0.05s">
          <view class="form-card__header">
            <text class="form-card__icon">✏️</text>
            <text class="form-card__title">基本信息</text>
            <text class="form-card__required">*</text>
          </view>

          <uni-forms-item label="任务标题" name="title" required class="form-card__item">
            <uni-easyinput
              v-model="formData.title"
              placeholder="简要描述您的任务（2-50字）"
              :maxlength="50"
              trim="both"
            />
          </uni-forms-item>

          <uni-forms-item label="任务详情" name="description" required class="form-card__item">
            <uni-easyinput
              type="textarea"
              v-model="formData.description"
              placeholder="详细描述任务内容、要求、注意事项（10-500字）"
              :maxlength="500"
              autoHeight
              :rows="4"
            />
            <view class="char-counter">
              <view class="char-counter__bar">
                <view
                  class="char-counter__fill"
                  :style="{ width: (formData.description.length / 500 * 100) + '%' }"
                  :class="{ 'char-counter__fill--warn': formData.description.length > 400 }"
                ></view>
              </view>
              <text class="char-counter__text">{{ formData.description.length }}/500</text>
            </view>
          </uni-forms-item>
        </view>

        <!-- Section 3: Location -->
        <view class="form-card anim-fade-up" style="animation-delay: 0.1s">
          <view class="form-card__header">
            <text class="form-card__icon">📍</text>
            <text class="form-card__title">任务地点</text>
            <text class="form-card__required">*</text>
          </view>

          <uni-forms-item label="所在小区" name="community_id" required class="form-card__item">
            <picker
              :range="communityOptions"
              range-key="name"
              :value="communityIndex"
              @change="onCommunityChange"
            >
              <view class="select-box pressable" :class="{ 'select-box--empty': !formData.community_id }">
                <text class="select-box__text">{{ formData.community_name || '请选择任务所在小区' }}</text>
                <text class="select-box__arrow">›</text>
              </view>
            </picker>
          </uni-forms-item>

          <uni-forms-item label="详细地址" name="address" class="form-card__item">
            <uni-easyinput
              v-model="formData.address"
              placeholder="门牌号、楼栋等详细地址（选填）"
              :maxlength="100"
            />
          </uni-forms-item>
        </view>

        <!-- Section 4: Time & Reward -->
        <view class="form-card anim-fade-up" style="animation-delay: 0.15s">
          <view class="form-card__header">
            <text class="form-card__icon">💰</text>
            <text class="form-card__title">时间与报酬</text>
            <text class="form-card__required">*</text>
          </view>

          <uni-forms-item label="期望完成时间" name="expected_time" class="form-card__item">
            <uni-datetime-picker
              type="datetime"
              v-model="formData.expected_time"
              :start="minDate"
              :clear-icon="true"
            />
          </uni-forms-item>

          <uni-forms-item label="任务报酬" name="reward" required class="form-card__item">
            <view class="reward-box">
              <text class="reward-box__symbol">¥</text>
              <uni-easyinput
                v-model="formData.reward"
                type="number"
                placeholder="5-1000"
                :inputBorder="false"
                class="reward-box__input"
              />
              <text class="reward-box__unit">元</text>
            </view>
          </uni-forms-item>

          <!-- Fee breakdown panel -->
          <view v-if="formData.reward > 0" class="fee-panel anim-fade-in">
            <view class="fee-panel__row">
              <text class="fee-panel__label">任务报酬</text>
              <text class="fee-panel__value">¥{{ Number(formData.reward).toFixed(2) }}</text>
            </view>
            <view class="fee-panel__row">
              <text class="fee-panel__label">服务费 ({{ (serviceFeeRate * 100).toFixed(0) }}%)</text>
              <text class="fee-panel__value">¥{{ serviceFee }}</text>
            </view>
            <view class="fee-panel__divider"></view>
            <view class="fee-panel__row fee-panel__row--total">
              <text class="fee-panel__label">合计支付</text>
              <text class="fee-panel__total">¥{{ totalAmount }}</text>
            </view>
          </view>
        </view>

        <!-- Section 5: Images -->
        <view class="form-card anim-fade-up" style="animation-delay: 0.2s">
          <view class="form-card__header">
            <text class="form-card__icon">📸</text>
            <text class="form-card__title">图片补充</text>
            <text class="form-card__badge">选填</text>
          </view>
          <uni-forms-item name="images" :label="''" class="form-card__item">
            <uni-file-picker
              v-model="imageFiles"
              fileMediatype="image"
              mode="grid"
              :limit="6"
              :sizeType="['compressed']"
              @select="onImageSelect"
              @delete="onImageDelete"
            />
            <text class="form-tip">最多6张图片，用于补充说明任务内容</text>
          </uni-forms-item>
        </view>

      </uni-forms>

      <!-- Bottom spacing for action bar -->
      <view class="publish-body__spacer"></view>
    </scroll-view>

    <!-- Bottom action bar -->
    <view class="action-bar safe-area-bottom">
      <view class="action-bar__inner">
        <button class="action-bar__draft pressable" @tap="handleSaveDraft">
          <text class="action-bar__draft-icon">💾</text>
          <text class="action-bar__draft-text">存草稿</text>
        </button>
        <button
          class="action-bar__submit pressable"
          :class="{ 'action-bar__submit--loading': submitting }"
          :loading="submitting"
          @tap="handleSubmit"
        >
          {{ submitting ? '提交中...' : `发布任务 ¥${totalAmount}` }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'
import { showToast, calcServiceFee, uploadImage, generateId } from '@/utils/common'

const userStore = useUserStore()
const appStore = useAppStore()
const formRef = ref()
const submitting = ref(false)
const imageFiles = ref<any[]>([])
const uploadedImages = ref<string[]>([])
const draftId = ref('')

const taskTypes = ref<string[]>(['取快递', '接送小孩', '陪诊', '陪读', '代扔垃圾', '宠物喂养', '其他'])
const serviceFeeRate = ref(0.1)
const communityIndex = ref(-1)

const communityOptions = computed(() => userStore.communities)

const minDate = Date.now()

const formData = reactive({
  task_type: '',
  custom_type: '',
  title: '',
  description: '',
  community_id: '',
  community_name: '',
  address: '',
  reward: '' as any,
  expected_time: '',
  images: [] as string[]
})

const serviceFee = computed(() => {
  const r = Number(formData.reward) || 0
  return calcServiceFee(r, serviceFeeRate.value).toFixed(2)
})

const totalAmount = computed(() => {
  const r = Number(formData.reward) || 0
  const fee = Number(serviceFee.value)
  return (r + fee).toFixed(2)
})

// Progress indicator — tracks how many required fields are filled
const totalFields = 5 // task_type, title, description, community_id, reward
const filledCount = computed(() => {
  let count = 0
  if (formData.task_type) count++
  if (formData.title && formData.title.length >= 2) count++
  if (formData.description && formData.description.length >= 10) count++
  if (formData.community_id) count++
  if (Number(formData.reward) >= 5) count++
  return count
})
const progressPercent = computed(() => {
  return Math.round((filledCount.value / totalFields) * 100)
})

const formRules = {
  task_type: { rules: [{ required: true, errorMessage: '请选择任务类型' }] },
  title: {
    rules: [
      { required: true, errorMessage: '请输入任务标题' },
      { minLength: 2, maxLength: 50, errorMessage: '标题长度为2-50个字符' }
    ]
  },
  description: {
    rules: [
      { required: true, errorMessage: '请输入任务详情' },
      { minLength: 10, maxLength: 500, errorMessage: '描述长度为10-500个字符' }
    ]
  },
  community_id: { rules: [{ required: true, errorMessage: '请选择所在小区' }] },
  reward: {
    rules: [
      { required: true, errorMessage: '请输入任务报酬' },
      {
        validateFunction: (rule: any, value: any, data: any, callback: Function) => {
          const v = Number(value)
          if (!v || v < 5 || v > 1000) {
            callback('报酬范围为5-1000元')
          }
          return true
        }
      }
    ]
  }
}

onMounted(async () => {
  await loadConfig()
  await loadDraft()
})

async function loadConfig() {
  try {
    const taskService = uniCloud.importObject('task-service')
    const config = await taskService.getTaskConfig()
    if (config) {
      taskTypes.value = config.task_types || taskTypes.value
      serviceFeeRate.value = config.service_fee_rate || 0.1
    }
  } catch (e) {
    console.error('Load config error:', e)
  }
}

async function loadDraft() {
  try {
    const taskService = uniCloud.importObject('task-service')
    const draft = await taskService.getDraft()
    if (draft) {
      draftId.value = draft._id
      formData.task_type = draft.task_type || ''
      formData.custom_type = draft.custom_type || ''
      formData.title = draft.title || ''
      formData.description = draft.description || ''
      formData.community_id = draft.community_id || ''
      formData.community_name = draft.community_name || ''
      formData.address = draft.address || ''
      formData.reward = draft.reward || ''
      formData.expected_time = draft.expected_time || ''
      uploadedImages.value = draft.images || []

      // Set community picker index
      const idx = communityOptions.value.findIndex(c => c._id === draft.community_id)
      if (idx >= 0) communityIndex.value = idx

      uni.showToast({ title: '已恢复草稿', icon: 'none' })
    }
  } catch (e) {
    console.error('Load draft error:', e)
  }
}

function selectType(type: string) {
  formData.task_type = type
  if (type !== '其他') formData.custom_type = ''
}

function onCommunityChange(e: any) {
  const idx = e.detail.value
  communityIndex.value = idx
  const community = communityOptions.value[idx]
  if (community) {
    formData.community_id = community._id
    formData.community_name = community.name
  }
}

function onImageSelect(e: any) {
  // Images will be uploaded on submit
}

function onImageDelete(e: any) {
  // Handle deletion
}

async function uploadAllImages(): Promise<string[]> {
  const files = imageFiles.value
  if (!files || files.length === 0) return uploadedImages.value

  const results: string[] = [...uploadedImages.value]
  for (const file of files) {
    if (file.url && !file.url.startsWith('cloud://') && !file.url.startsWith('https://')) {
      try {
        const cloudPath = `task-images/${generateId()}${file.extname || '.jpg'}`
        const fileID = await uploadImage(file.url, cloudPath)
        results.push(fileID)
      } catch (err) {
        console.error('Upload image error:', err)
      }
    }
  }
  return results
}

async function handleSaveDraft() {
  try {
    uni.showLoading({ title: '保存中...' })
    const images = await uploadAllImages()
    const taskService = uniCloud.importObject('task-service')
    const res = await taskService.saveDraft({
      draft_id: draftId.value || undefined,
      ...formData,
      reward: Number(formData.reward) || 0,
      images
    })
    draftId.value = res.draft_id
    showToast('草稿已保存', 'success')
  } catch (err: any) {
    showToast(err.message || '保存失败')
  } finally {
    uni.hideLoading()
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return
  }

  if (submitting.value) return
  submitting.value = true

  try {
    uni.showLoading({ title: '发布中...' })

    // Upload images first
    const images = await uploadAllImages()

    const taskService = uniCloud.importObject('task-service')
    const res = await taskService.createTask({
      ...formData,
      reward: Number(formData.reward),
      expected_time: formData.expected_time ? new Date(formData.expected_time).getTime() : null,
      images
    })

    // Delete draft if exists
    if (draftId.value) {
      try {
        await taskService.deleteDraft({ draft_id: draftId.value })
      } catch (e) {}
    }

    showToast('任务发布成功！', 'success')

    setTimeout(() => {
      uni.redirectTo({
        url: `/pages/task/detail?id=${res.task_id}`
      })
    }, 1000)
  } catch (err: any) {
    console.error('Publish task error:', err)
    showToast(err.message || '发布失败，请稍后重试')
  } finally {
    submitting.value = false
    uni.hideLoading()
  }
}
</script>

<style
<style lang="scss" scoped>
.publish-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* ── Progress indicator ── */
.publish-progress {
  background-color: $uni-bg-color;
  padding: $uni-spacing-sm $uni-spacing-base;
  display: flex;
  align-items: center;
  gap: $uni-spacing-md;
  box-shadow: 0 1px 0 $uni-border-color-light;

  &__bar {
    flex: 1;
    height: 4px;
    background-color: $uni-bg-color-grey;
    border-radius: $uni-border-radius-pill;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    background: $brand-gradient;
    border-radius: $uni-border-radius-pill;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-grey;
    flex-shrink: 0;
  }
}

/* ── Scrollable body ── */
.publish-body {
  flex: 1;
  padding: $uni-spacing-md $uni-spacing-base;

  &__spacer {
    height: 100px;
  }
}

/* ── Form card sections ── */
.form-card {
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-lg;
  box-shadow: $uni-shadow-card;
  padding: $uni-spacing-base;
  margin-bottom: $uni-spacing-md;

  &__header {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    margin-bottom: $uni-spacing-md;
    padding-bottom: $uni-spacing-sm;
    border-bottom: 1px solid $uni-border-color-light;
  }

  &__icon {
    font-size: 18px;
    line-height: 1;
  }

  &__title {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    flex: 1;
  }

  &__required {
    font-size: $uni-font-size-sm;
    color: $uni-color-error;
    font-weight: $uni-font-weight-semibold;
  }

  &__badge {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-grey;
    background-color: $uni-bg-color-tag;
    padding: 2px $uni-spacing-sm;
    border-radius: $uni-border-radius-pill;
  }

  &__item {
    margin-bottom: 0;
  }
}

/* ── Type selection chips ── */
.type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $uni-spacing-sm;
}

.type-chip {
  padding: $uni-spacing-sm $uni-spacing-base;
  background-color: $uni-bg-color-grey;
  border-radius: $uni-border-radius-pill;
  border: 1.5px solid transparent;
  transition: $uni-transition-fast;

  &__label {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    white-space: nowrap;
  }

  &--active {
    background-color: $uni-color-primary-pale;
    border-color: $uni-color-primary;

    .type-chip__label {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-semibold;
    }
  }

  &:active {
    transform: scale(0.95);
  }
}

.custom-type-input {
  margin-top: $uni-spacing-sm;
}

/* ── Select box (picker trigger) ── */
.select-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $uni-spacing-md $uni-spacing-base;
  background-color: $uni-bg-color-input;
  border-radius: $uni-border-radius-base;
  border: 1.5px solid transparent;
  transition: $uni-transition-fast;

  &__text {
    font-size: $uni-font-size-base;
    color: $uni-text-color;
    flex: 1;
  }

  &--empty .select-box__text {
    color: $uni-text-color-placeholder;
  }

  &__arrow {
    font-size: 20px;
    color: $uni-text-color-grey;
    font-weight: $uni-font-weight-medium;
  }

  &:active {
    border-color: $uni-color-primary-lighter;
    background-color: $uni-color-primary-pale;
  }
}

/* ── Character counter with bar ── */
.char-counter {
  display: flex;
  align-items: center;
  gap: $uni-spacing-sm;
  margin-top: $uni-spacing-xs;

  &__bar {
    flex: 1;
    height: 2px;
    background-color: $uni-border-color-light;
    border-radius: $uni-border-radius-pill;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    background-color: $uni-color-primary;
    border-radius: $uni-border-radius-pill;
    transition: width 0.2s ease;

    &--warn {
      background-color: $uni-color-warning;
    }
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-disable;
    flex-shrink: 0;
  }
}

/* ── Reward input box ── */
.reward-box {
  display: flex;
  align-items: center;
  gap: $uni-spacing-xs;
  background-color: $uni-bg-color-input;
  border-radius: $uni-border-radius-base;
  padding: 0 $uni-spacing-md;
  border: 1.5px solid transparent;
  transition: $uni-transition-fast;

  &:focus-within {
    border-color: $uni-color-primary;
    background-color: $uni-bg-color;
  }

  &__symbol {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
  }

  &__input {
    flex: 1;
  }

  &__unit {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
  }
}

/* ── Fee breakdown panel ── */
.fee-panel {
  margin-top: $uni-spacing-md;
  padding: $uni-spacing-md;
  background-color: $uni-color-primary-pale;
  border-radius: $uni-border-radius-base;

  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $uni-spacing-xs 0;

    &--total {
      padding-top: $uni-spacing-sm;
    }
  }

  &__label {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
  }

  &__value {
    font-size: $uni-font-size-sm;
    color: $uni-text-color;
  }

  &__divider {
    height: 1px;
    background-color: $uni-color-primary-lighter;
    margin: $uni-spacing-xs 0;
  }

  &__total {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
  }
}

/* ── Form helper text ── */
.form-tip {
  display: block;
  font-size: $uni-font-size-xs;
  color: $uni-text-color-disable;
  margin-top: $uni-spacing-xs;
}

/* ── Bottom action bar ── */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: $uni-z-index-fixed;
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 0.5px solid $uni-border-color-light;

  &__inner {
    display: flex;
    align-items: center;
    gap: $uni-spacing-md;
    padding: $uni-spacing-md $uni-spacing-base;
  }

  &__draft {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 64px;
    height: 48px;
    background-color: transparent;
    border: none;
    padding: 0;
    line-height: 1;

    &::after {
      display: none;
    }
  }

  &__draft-icon {
    font-size: 18px;
    line-height: 1;
  }

  &__draft-text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-grey;
  }

  &__submit {
    flex: 1;
    height: 48px;
    line-height: 48px;
    background: $brand-gradient;
    color: $uni-text-color-inverse;
    border: none;
    border-radius: $uni-border-radius-xl;
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    letter-spacing: 0.5px;
    box-shadow: $uni-shadow-base;
    transition: $uni-transition-fast;

    &::after {
      display: none;
    }

    &:active {
      transform: scale(0.98);
      opacity: $uni-opacity-pressed;
    }

    &--loading {
      opacity: $uni-opacity-hover;
    }
  }
}

/* ── Animations ── */
.anim-fade-up {
  animation: fadeUp $uni-animation-duration-base ease-out both;
}

.anim-fade-in {
  animation: fadeIn $uni-animation-duration-fast ease-out both;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
