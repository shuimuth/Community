<template>
  <view class="publish-page">
    <!-- Custom header with gradient -->
    <PageHeader
      mode="gradient"
      :show-back="false"
      :border-bottom="false"
    >
      <template #center>
        <view class="publish-header-content">
          <text class="publish-header-title">发布任务</text>
        </view>
      </template>
    </PageHeader>

    <!-- Hero subtitle banner -->
    <view class="publish-hero">
      <view class="publish-hero__bg"></view>
      <view class="publish-hero__content">
        <text class="publish-hero__subtitle">发布任务，让邻居帮您搞定 ✨</text>
      </view>
    </view>

    <!-- Login prompt -->
    <view v-if="!userStore.isLogin" class="publish-login anim-fade-in-up">
      <view class="publish-login__icon-wrap">
        <text class="publish-login__icon">👤</text>
      </view>
      <text class="publish-login__title">请先登录</text>
      <text class="publish-login__desc">登录后即可发布任务，让邻居帮您搞定</text>
      <view class="btn-primary btn-block publish-login__btn" @tap="goLogin">
        <text>去登录</text>
      </view>
    </view>

    <!-- Main form -->
    <view v-else class="publish-form">
      <view class="publish-form__body">
        <uni-forms ref="formRef" :modelValue="formData" :rules="formRules" label-position="top">

          <!-- Step 1: Task type -->
          <view class="form-card anim-fade-in-up">
            <view class="form-card__step">
              <view class="form-card__step-dot">1</view>
              <text class="form-card__step-label">选择类型</text>
            </view>
            <uni-forms-item label="" name="task_type" required>
              <view class="type-grid">
                <view
                  v-for="item in taskTypeOptions"
                  :key="item.name"
                  class="type-item"
                  :class="{ 'type-item--active': formData.task_type === item.name }"
                  @tap="selectType(item.name)"
                >
                  <view class="type-item__icon-wrap">
                    <text class="type-item__icon">{{ item.icon }}</text>
                  </view>
                  <text class="type-item__name">{{ item.name }}</text>
                  <view v-if="formData.task_type === item.name" class="type-item__check">✓</view>
                </view>
              </view>
              <uni-easyinput
                v-if="formData.task_type === '其他'"
                v-model="formData.custom_type"
                placeholder="请输入自定义类型名称"
                :maxlength="10"
                class="custom-type-input"
              />
            </uni-forms-item>
          </view>

          <!-- Step 2: Task info -->
          <view class="form-card anim-fade-in-up anim-delay-1">
            <view class="form-card__step">
              <view class="form-card__step-dot">2</view>
              <text class="form-card__step-label">任务信息</text>
            </view>

            <uni-forms-item label="任务标题" name="title" required>
              <uni-easyinput
                v-model="formData.title"
                placeholder="简要描述您的任务（2-50字）"
                :maxlength="50"
                trim="both"
              />
            </uni-forms-item>

            <uni-forms-item label="任务详情" name="description" required>
              <uni-easyinput
                type="textarea"
                v-model="formData.description"
                placeholder="详细描述任务内容、要求、注意事项（10-500字）"
                :maxlength="500"
                autoHeight
                :rows="4"
              />
              <view class="char-counter">
                <text class="char-counter__text" :class="{ 'char-counter__text--warn': formData.description.length > 450 }">
                  {{ formData.description.length }}/500
                </text>
              </view>
            </uni-forms-item>

            <uni-forms-item label="图片补充" name="images">
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

          <!-- Step 3: Location & time -->
          <view class="form-card anim-fade-in-up anim-delay-2">
            <view class="form-card__step">
              <view class="form-card__step-dot">3</view>
              <text class="form-card__step-label">地点与时间</text>
            </view>

            <uni-forms-item label="所在小区" name="community_id" required>
              <view v-if="communityOptions.length > 0">
                <picker
                  :range="communityOptions"
                  range-key="name"
                  :value="communityIndex"
                  @change="onCommunityChange"
                >
                  <view class="select-box" :class="{ 'select-box--placeholder': !formData.community_id }">
                    <text class="select-box__text">{{ formData.community_name || '请选择任务所在小区' }}</text>
                    <text class="select-box__arrow">›</text>
                  </view>
                </picker>
              </view>
              <view v-else class="no-community" @tap="goSelectCommunity">
                <view class="no-community__left">
                  <text class="no-community__icon">🏘️</text>
                  <text class="no-community__text">您还未加入任何小区</text>
                </view>
                <text class="no-community__link">去加入 ›</text>
              </view>
            </uni-forms-item>

            <uni-forms-item label="详细地址" name="address">
              <uni-easyinput
                v-model="formData.address"
                placeholder="门牌号、楼栋等详细地址（选填）"
                :maxlength="100"
              />
            </uni-forms-item>

            <uni-forms-item label="期望完成时间" name="expected_time">
              <uni-datetime-picker
                type="datetime"
                v-model="formData.expected_time"
                :start="minDate"
                :clear-icon="true"
              />
            </uni-forms-item>
          </view>

          <!-- Step 4: Reward -->
          <view class="form-card anim-fade-in-up anim-delay-3">
            <view class="form-card__step">
              <view class="form-card__step-dot form-card__step-dot--highlight">4</view>
              <text class="form-card__step-label">设置报酬</text>
            </view>

            <uni-forms-item label="" name="reward" required>
              <view class="reward-input-wrap">
                <text class="reward-input__symbol">¥</text>
                <uni-easyinput
                  v-model="formData.reward"
                  type="number"
                  placeholder="5-1000元"
                  :inputBorder="false"
                  class="reward-input__field"
                />
              </view>

              <!-- Fee breakdown -->
              <view v-if="formData.reward > 0" class="fee-card">
                <view class="fee-card__row">
                  <text class="fee-card__label">任务报酬</text>
                  <text class="fee-card__value">¥{{ Number(formData.reward).toFixed(2) }}</text>
                </view>
                <view class="fee-card__row">
                  <text class="fee-card__label">平台服务费 ({{ (serviceFeeRate * 100).toFixed(0) }}%)</text>
                  <text class="fee-card__value">¥{{ serviceFee }}</text>
                </view>
                <view class="fee-card__divider"></view>
                <view class="fee-card__row fee-card__row--total">
                  <text class="fee-card__label fee-card__label--total">合计支付</text>
                  <view class="fee-card__total">
                    <text class="fee-card__total-symbol">¥</text>
                    <text class="fee-card__total-value">{{ totalAmount }}</text>
                  </view>
                </view>
              </view>
            </uni-forms-item>
          </view>

        </uni-forms>
      </view>

      <!-- Bottom spacer (reserve space for fixed bottom bar + tabBar) -->
      <view class="bottom-bar-spacer"></view>
    </view>

    <!-- Bottom action bar -->
    <view class="bottom-bar publish-actions safe-area-bottom">
      <view
        class="btn-primary publish-actions__submit"
        :class="{ 'btn-disabled': submitting }"
        @tap="handleSubmit"
      >
        <text v-if="submitting">提交中...</text>
        <text v-else>发布任务 ¥{{ totalAmount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { showToast, calcServiceFee, uploadImage, generateId } from '@/utils/common'

const userStore = useUserStore()
const formRef = ref()
const submitting = ref(false)
const imageFiles = ref<any[]>([])
const uploadedImages = ref<string[]>([])
const statusBarHeight = ref(0)

const taskTypeOptions = [
  { name: '取快递', icon: '📦' },
  { name: '接送小孩', icon: '👶' },
  { name: '陪诊', icon: '🏥' },
  { name: '陪读', icon: '📚' },
  { name: '代扔垃圾', icon: '🗑️' },
  { name: '宠物喂养', icon: '🐾' },
  { name: '其他', icon: '💡' }
]

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
  // Get status bar height
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0

  if (userStore.isLogin) {
    await loadConfig()

    // Auto select community if user only has one
    if (communityOptions.value.length === 1 && !formData.community_id) {
      const c = communityOptions.value[0]
      formData.community_id = c._id
      formData.community_name = c.name
      communityIndex.value = 0
    }
  }
})

onShow(() => {
  // Refresh communities when page is shown (user might have just joined a community)
  if (userStore.isLogin && communityOptions.value.length > 0 && !formData.community_id) {
    if (communityOptions.value.length === 1) {
      const c = communityOptions.value[0]
      formData.community_id = c._id
      formData.community_name = c.name
      communityIndex.value = 0
    }
  }
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

function goLogin() {
  uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withpwd' })
}

function goSelectCommunity() {
  uni.navigateTo({ url: '/pages/community/select' })
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

    showToast('任务发布成功！', 'success')

    // Reset form after successful publish
    resetForm()

    setTimeout(() => {
      uni.navigateTo({
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

function resetForm() {
  formData.task_type = ''
  formData.custom_type = ''
  formData.title = ''
  formData.description = ''
  formData.community_id = ''
  formData.community_name = ''
  formData.address = ''
  formData.reward = ''
  formData.expected_time = ''
  formData.images = []
  imageFiles.value = []
  uploadedImages.value = []
  communityIndex.value = -1

  // Auto select community if only one
  if (communityOptions.value.length === 1) {
    const c = communityOptions.value[0]
    formData.community_id = c._id
    formData.community_name = c.name
    communityIndex.value = 0
  }
}
</script>

<style lang="scss" scoped>
.publish-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* ── Hero subtitle banner ──────────────────────────────────── */
.publish-hero {
  position: relative;
  margin-top: -1px;
  overflow: hidden;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: $brand-gradient;
    border-radius: 0 0 $uni-border-radius-xl $uni-border-radius-xl;
  }

  &__content {
    position: relative;
    padding: $uni-spacing-sm $uni-spacing-xl $uni-spacing-lg;
  }

  &__subtitle {
    font-size: $uni-font-size-sm;
    color: rgba(255, 255, 255, 0.85);
    letter-spacing: 0.5px;
  }
}

/* ── Header title override ─────────────────────────────────── */
.publish-header-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.publish-header-title {
  font-size: $uni-font-size-xl;
  font-weight: $uni-font-weight-bold;
  color: $uni-text-color-inverse;
}

/* ── Login prompt ──────────────────────────────────────────── */
.publish-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px $uni-spacing-xl;
  margin: $uni-spacing-base;
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-lg;
  box-shadow: $uni-shadow-card;

  &__icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: $uni-border-radius-circle;
    background: linear-gradient(135deg, $uni-color-primary-pale, $uni-bg-color-grey);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $uni-spacing-lg;
  }

  &__icon {
    font-size: 36px;
  }

  &__title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-xs;
  }

  &__desc {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    margin-bottom: $uni-spacing-xl;
  }

  &__btn {
    width: 200px;
  }
}

/* ── Form body ─────────────────────────────────────────────── */
.publish-form__body {
  padding: 0 $uni-spacing-base;
}

/* ── Form card (step card) ─────────────────────────────────── */
.form-card {
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-base;
  margin-bottom: $uni-spacing-md;
  box-shadow: $uni-shadow-card;

  &__step {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    margin-bottom: $uni-spacing-base;
    padding-bottom: $uni-spacing-md;
    border-bottom: 1px solid $uni-border-color-light;
  }

  &__step-dot {
    width: 24px;
    height: 24px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-bg-color-tag;
    color: $uni-text-color-secondary;
    font-size: $uni-font-size-xs;
    font-weight: $uni-font-weight-bold;
    display: flex;
    align-items: center;
    justify-content: center;

    &--highlight {
      background: $brand-gradient;
      color: $uni-text-color-inverse;
    }
  }

  &__step-label {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }
}

/* ── Type grid ─────────────────────────────────────────────── */
.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $uni-spacing-sm;
}

.type-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $uni-spacing-xs;
  width: calc(25% - 6px);
  padding: $uni-spacing-md $uni-spacing-xs;
  background-color: $uni-bg-color-grey;
  border-radius: $uni-border-radius-base;
  border: 1.5px solid transparent;
  transition: $uni-transition-fast;

  &:active {
    transform: scale(0.95);
  }

  &__icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-bg-color;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $uni-shadow-sm;
  }

  &__icon {
    font-size: 20px;
  }

  &__name {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
    font-weight: $uni-font-weight-medium;
    text-align: center;
  }

  &__check {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    border-radius: $uni-border-radius-circle;
    background: $brand-gradient;
    color: $uni-text-color-inverse;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scaleIn $uni-animation-duration-fast cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  &--active {
    background-color: $uni-color-primary-pale;
    border-color: $uni-color-primary;

    .type-item__icon-wrap {
      background-color: $uni-color-primary-pale;
      box-shadow: 0 2px 8px rgba(255, 122, 69, 0.15);
    }

    .type-item__name {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-semibold;
    }
  }
}

.custom-type-input {
  margin-top: $uni-spacing-sm;
}

/* ── Character counter ─────────────────────────────────────── */
.char-counter {
  display: flex;
  justify-content: flex-end;
  margin-top: $uni-spacing-xs;

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-disable;

    &--warn {
      color: $uni-color-warning;
    }
  }
}

.form-tip {
  display: block;
  font-size: $uni-font-size-xs;
  color: $uni-text-color-disable;
  margin-top: $uni-spacing-xs;
}

/* ── Select box (picker) ───────────────────────────────────── */
.select-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $uni-spacing-md;
  background-color: $uni-bg-color-input;
  border-radius: $uni-border-radius-base;
  border: 1.5px solid transparent;
  transition: $uni-transition-fast;

  &__text {
    font-size: $uni-font-size-base;
    color: $uni-text-color;
  }

  &__arrow {
    font-size: 18px;
    color: $uni-text-color-grey;
    font-weight: $uni-font-weight-medium;
  }

  &--placeholder {
    .select-box__text {
      color: $uni-text-color-placeholder;
    }
  }

  &:active {
    border-color: $uni-color-primary-light;
  }
}

/* ── No community prompt ───────────────────────────────────── */
.no-community {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $uni-spacing-md;
  background-color: $uni-color-primary-pale;
  border: 1px dashed $uni-color-primary-lighter;
  border-radius: $uni-border-radius-base;
  transition: $uni-transition-fast;

  &:active {
    background-color: $uni-color-primary-lighter;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }

  &__icon {
    font-size: 18px;
  }

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
  }

  &__link {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
    color: $uni-color-primary;
  }
}

/* ── Reward input ──────────────────────────────────────────── */
.reward-input-wrap {
  display: flex;
  align-items: center;
  padding: $uni-spacing-sm $uni-spacing-md;
  background-color: $uni-bg-color-input;
  border-radius: $uni-border-radius-base;
  border: 1.5px solid transparent;
  transition: $uni-transition-fast;

  &:focus-within {
    border-color: $uni-color-primary;
    background-color: $uni-bg-color;
  }
}

.reward-input {
  &__symbol {
    font-size: $uni-font-size-xxl;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
    font-family: 'DIN Alternate', $uni-font-family;
    margin-right: $uni-spacing-xs;
  }

  &__field {
    flex: 1;
  }
}

/* ── Fee breakdown card ────────────────────────────────────── */
.fee-card {
  margin-top: $uni-spacing-md;
  padding: $uni-spacing-base;
  background-color: $uni-bg-color-grey;
  border-radius: $uni-border-radius-base;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $uni-spacing-xs 0;

    &--total {
      padding-top: $uni-spacing-sm;
    }
  }

  &__label {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;

    &--total {
      font-size: $uni-font-size-base;
      font-weight: $uni-font-weight-semibold;
      color: $uni-text-color;
    }
  }

  &__value {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
  }

  &__divider {
    height: 1px;
    background-color: $uni-border-color-light;
    margin: $uni-spacing-xs 0;
  }

  &__total {
    display: flex;
    align-items: baseline;
  }

  &__total-symbol {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
    margin-right: 1px;
  }

  &__total-value {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
    font-family: 'DIN Alternate', $uni-font-family;
    line-height: 1;
  }
}

/* ── Bottom action bar (tabBar page: offset for tabBar height) ── */
.bottom-bar {
  bottom: 50px;
  padding-bottom: calc(#{$uni-spacing-md} + env(safe-area-inset-bottom));
}

.bottom-bar-spacer {
  height: calc(80px + 50px + env(safe-area-inset-bottom));
}

.publish-actions {
  &__submit {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
