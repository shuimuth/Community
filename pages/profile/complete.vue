<template>
  <view class="complete-page">
    <!-- Hero Header -->
    <view class="hero">
      <view class="hero__bg"></view>
      <view class="hero__content animate-fade-in-up">
        <text class="hero__emoji">👋</text>
        <text class="hero__title">欢迎加入</text>
        <text class="hero__subtitle">完善信息后即可开始使用社区任务平台</text>
      </view>
      <!-- Step indicator -->
      <view class="hero__steps animate-fade-in-up" style="animation-delay: 0.1s">
        <view class="step step--active">
          <view class="step__dot">1</view>
          <text class="step__label">完善资料</text>
        </view>
        <view class="step__line step__line--pending"></view>
        <view class="step step--pending">
          <view class="step__dot">2</view>
          <text class="step__label">选择小区</text>
        </view>
      </view>
    </view>

    <!-- Form Card -->
    <view class="form-card animate-fade-in-up" style="animation-delay: 0.15s">
      <uni-forms ref="formRef" :modelValue="formData" :rules="formRules" label-width="80px">
        <!-- Real name -->
        <view class="form-group">
          <view class="form-group__header">
            <text class="form-group__icon">👤</text>
            <text class="form-group__label">真实姓名</text>
            <text class="form-group__required">*</text>
          </view>
          <uni-forms-item name="real_name">
            <uni-easyinput
              v-model="formData.real_name"
              placeholder="请输入真实姓名"
              :maxlength="20"
              trim="both"
              :inputBorder="false"
              class="custom-input"
            />
          </uni-forms-item>
        </view>

        <!-- Phone number -->
        <view class="form-group">
          <view class="form-group__header">
            <text class="form-group__icon">📱</text>
            <text class="form-group__label">手机号码</text>
            <text class="form-group__required">*</text>
          </view>
          <uni-forms-item name="mobile">
            <view class="phone-row">
              <uni-easyinput
                v-model="formData.mobile"
                placeholder="请输入11位手机号码"
                type="number"
                :maxlength="11"
                :inputBorder="false"
                class="custom-input"
              />
              <!-- #ifdef MP-WEIXIN -->
              <button
                class="wx-phone-btn"
                open-type="getPhoneNumber"
                @getphonenumber="onGetPhoneNumber"
              >
                <text class="wx-phone-btn__icon">💬</text>
                <text class="wx-phone-btn__text">微信获取</text>
              </button>
              <!-- #endif -->
            </view>
          </uni-forms-item>
        </view>

        <!-- Gender -->
        <view class="form-group">
          <view class="form-group__header">
            <text class="form-group__icon">⚡</text>
            <text class="form-group__label">性别</text>
            <text class="form-group__required">*</text>
          </view>
          <uni-forms-item name="gender">
            <view class="gender-chips">
              <view
                v-for="option in genderOptions"
                :key="option.value"
                class="gender-chip"
                :class="{ 'gender-chip--active': formData.gender === option.value }"
                @tap="formData.gender = option.value"
              >
                <text class="gender-chip__emoji">{{ option.emoji }}</text>
                <text class="gender-chip__text">{{ option.text }}</text>
              </view>
            </view>
          </uni-forms-item>
        </view>
      </uni-forms>
    </view>

    <!-- Submit Section -->
    <view class="submit-section animate-fade-in-up" style="animation-delay: 0.2s">
      <view
        class="submit-btn"
        :class="{ 'submit-btn--loading': submitting }"
        @tap="handleSubmit"
      >
        <view v-if="submitting" class="submit-btn__spinner"></view>
        <text class="submit-btn__text">{{ submitting ? '提交中...' : '完成注册' }}</text>
      </view>
      <text class="privacy-tip">
        提交即表示同意
        <text class="privacy-tip__link">《用户服务协议》</text>
        和
        <text class="privacy-tip__link">《隐私政策》</text>
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '@/store/user'
import { isValidPhone, showToast } from '@/utils/common'

const userStore = useUserStore()
const formRef = ref()
const submitting = ref(false)

const formData = reactive({
  real_name: '',
  mobile: '',
  gender: 1
})

const genderOptions = [
  { text: '男', value: 1, emoji: '👦' },
  { text: '女', value: 2, emoji: '👧' },
  { text: '保密', value: 0, emoji: '🤫' }
]

const formRules = {
  real_name: {
    rules: [
      { required: true, errorMessage: '请输入真实姓名' },
      { minLength: 2, maxLength: 20, errorMessage: '姓名长度为2-20个字符' }
    ]
  },
  mobile: {
    rules: [
      { required: true, errorMessage: '请输入手机号码' },
      {
        validateFunction: (rule: any, value: string, data: any, callback: Function) => {
          if (!isValidPhone(value)) {
            callback('请输入正确的11位手机号码')
          }
          return true
        }
      }
    ]
  },
  gender: {
    rules: [
      { required: true, errorMessage: '请选择性别' }
    ]
  }
}

// WeChat get phone number
async function onGetPhoneNumber(e: any) {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    return
  }

  try {
    uni.showLoading({ title: '获取中...' })
    const uniIdCo = uniCloud.importObject('uni-id-co')
    const res = await uniIdCo.bindMobileByMpWeixin({
      code: e.detail.code
    })
    if (res && res.mobile) {
      formData.mobile = res.mobile
      showToast('手机号获取成功', 'success')
    }
  } catch (err: any) {
    console.error('Get phone error:', err)
    showToast('获取手机号失败，请手动输入')
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
    const userCenter = uniCloud.importObject('user-center')
    await userCenter.completeProfile({
      real_name: formData.real_name,
      mobile: formData.mobile,
      gender: formData.gender
    })

    // Update local store
    if (userStore.userInfo) {
      userStore.setUserInfo({
        ...userStore.userInfo,
        real_name: formData.real_name,
        mobile: formData.mobile,
        gender: formData.gender
      })
    }

    showToast('注册完成！', 'success')

    // Navigate to community selection
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/community/select'
      })
    }, 1000)
  } catch (err: any) {
    console.error('Submit profile error:', err)
    showToast(err.message || '提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.complete-page {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
  padding-bottom: env(safe-area-inset-bottom);
}

// ══════════════════════════════════════════
// Hero Header
// ══════════════════════════════════════════
.hero {
  position: relative;
  padding: 60px $uni-spacing-lg 36px;
  overflow: hidden;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: $brand-gradient;
    border-radius: 0 0 32px 32px;

    &::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -30%;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
    }

    &::before {
      content: '';
      position: absolute;
      bottom: -40%;
      left: -20%;
      width: 240px;
      height: 240px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    text-align: center;
    margin-bottom: $uni-spacing-lg;
  }

  &__emoji {
    font-size: 48px;
    display: block;
    margin-bottom: $uni-spacing-sm;
  }

  &__title {
    display: block;
    font-size: $uni-font-size-xxl;
    font-weight: $uni-font-weight-bold;
    color: #fff;
    margin-bottom: 6px;
  }

  &__subtitle {
    display: block;
    font-size: $uni-font-size-sm;
    color: rgba(255, 255, 255, 0.8);
  }

  // Step indicator
  &__steps {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
  }
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &__dot {
    width: 28px;
    height: 28px;
    border-radius: $uni-border-radius-circle;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-bold;
    transition: $uni-transition-fast;
  }

  &__label {
    font-size: 10px;
    white-space: nowrap;
  }

  &--active {
    .step__dot {
      background-color: #fff;
      color: $uni-color-primary;
    }
    .step__label {
      color: #fff;
      font-weight: $uni-font-weight-medium;
    }
  }

  &--pending {
    .step__dot {
      background-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 0.7);
    }
    .step__label {
      color: rgba(255, 255, 255, 0.6);
    }
  }

  &__line {
    width: 40px;
    height: 2px;
    margin: 0 $uni-spacing-sm;
    margin-bottom: 18px;
    border-radius: 2px;

    &--pending {
      background-color: rgba(255, 255, 255, 0.3);
    }
  }
}

// ══════════════════════════════════════════
// Form Card
// ══════════════════════════════════════════
.form-card {
  margin: -16px $uni-spacing-md 0;
  position: relative;
  z-index: 2;
  background-color: #fff;
  border-radius: $uni-border-radius-xl;
  padding: $uni-spacing-lg $uni-spacing-md;
  box-shadow: $uni-shadow-md;
}

.form-group {
  margin-bottom: $uni-spacing-md;

  &:last-child {
    margin-bottom: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: $uni-spacing-sm;
  }

  &__icon {
    font-size: 16px;
    line-height: 1;
  }

  &__label {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__required {
    font-size: $uni-font-size-sm;
    color: $uni-color-error;
    margin-left: -2px;
  }
}

.custom-input {
  :deep(.uni-easyinput__content) {
    background-color: $uni-bg-color-page !important;
    border-radius: $uni-border-radius-lg !important;
    padding: 0 $uni-spacing-md !important;
    border: 2rpx solid transparent !important;
    transition: $uni-transition-fast;

    &:focus-within,
    &.is-focused {
      border-color: $uni-color-primary !important;
      background-color: rgba($uni-color-primary, 0.03) !important;
    }
  }

  :deep(.uni-easyinput__content-input) {
    font-size: $uni-font-size-base !important;
    height: 44px !important;
  }
}

// Phone row
.phone-row {
  display: flex;
  align-items: flex-start;
  gap: $uni-spacing-sm;
}

.wx-phone-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  height: 44px;
  background: rgba($uni-color-primary, 0.08);
  border: none;
  border-radius: $uni-border-radius-lg;
  transition: $uni-transition-fast;

  &::after {
    display: none;
  }

  &__icon {
    font-size: 14px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-color-primary;
    font-weight: $uni-font-weight-medium;
    white-space: nowrap;
  }

  &:active {
    opacity: $uni-opacity-active;
    transform: scale(0.96);
  }
}

// Gender chips
.gender-chips {
  display: flex;
  gap: $uni-spacing-sm;
}

.gender-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 0;
  border-radius: $uni-border-radius-lg;
  background-color: $uni-bg-color-page;
  border: 2rpx solid transparent;
  transition: $uni-transition-fast;

  &__emoji {
    font-size: 18px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-base;
    color: $uni-text-color-secondary;
    font-weight: $uni-font-weight-medium;
    transition: $uni-transition-fast;
  }

  &--active {
    background-color: rgba($uni-color-primary, 0.06);
    border-color: $uni-color-primary;

    .gender-chip__text {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-semibold;
    }
  }

  &:active {
    transform: scale(0.97);
  }
}

// ══════════════════════════════════════════
// Submit Section
// ══════════════════════════════════════════
.submit-section {
  padding: $uni-spacing-xl $uni-spacing-md;
  text-align: center;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-sm;
  width: 100%;
  height: 52px;
  background: $brand-gradient;
  border-radius: $uni-border-radius-pill;
  box-shadow: $uni-shadow-brand;
  transition: $uni-transition-fast;

  &__spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: $uni-border-radius-circle;
    animation: spin 0.8s linear infinite;
  }

  &__text {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: #fff;
  }

  &--loading {
    opacity: $uni-opacity-active;
  }

  &:active {
    transform: scale(0.98);
    opacity: $uni-opacity-active;
  }
}

.privacy-tip {
  display: block;
  margin-top: $uni-spacing-md;
  font-size: $uni-font-size-xs;
  color: $uni-text-color-placeholder;
  line-height: 1.6;

  &__link {
    color: $uni-color-primary;
  }
}

// ══════════════════════════════════════════
// Animations
// ══════════════════════════════════════════
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
