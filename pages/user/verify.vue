<template>
  <view class="verify-page">
    <!-- Loading state -->
    <view v-if="loading" class="loading-state">
      <text class="loading-state__text">加载中...</text>
    </view>

    <!-- ═══ Approved State (auth_status === 2) ═══ -->
    <view v-else-if="authStatus === 2" class="verified-state fade-in">
      <view class="verified-hero">
        <view class="verified-hero__bg"></view>
        <view class="verified-hero__icon">
          <text class="verified-hero__check">✓</text>
        </view>
        <text class="verified-hero__title">实名认证已完成</text>
        <text class="verified-hero__subtitle">您的身份已通过验证，信用分 +10</text>
      </view>

      <view class="verified-card card-base slide-up">
        <view class="verified-card__header">
          <text class="verified-card__badge">🛡️</text>
          <text class="verified-card__label">认证信息</text>
        </view>
        <view class="verified-card__body">
          <view class="info-row">
            <text class="info-row__label">真实姓名</text>
            <text class="info-row__value">{{ maskName(verifyInfo.real_name) }}</text>
          </view>
          <view class="info-row">
            <text class="info-row__label">身份证号</text>
            <text class="info-row__value">{{ maskIdCard(verifyInfo.identity) }}</text>
          </view>
          <view class="info-row info-row--last">
            <text class="info-row__label">认证时间</text>
            <text class="info-row__value">{{ formatDate(verifyInfo.auth_date) }}</text>
          </view>
        </view>
      </view>

      <view class="security-note slide-up">
        <text class="security-note__icon">🔒</text>
        <text class="security-note__text">您的信息已加密存储，受平台隐私政策保护</text>
      </view>
    </view>

    <!-- ═══ Pending Review State (auth_status === 1) ═══ -->
    <view v-else-if="authStatus === 1" class="pending-state fade-in">
      <view class="pending-hero">
        <view class="pending-hero__icon">
          <text class="pending-hero__clock">⏳</text>
        </view>
        <text class="pending-hero__title">认证审核中</text>
        <text class="pending-hero__subtitle">您的认证资料已提交，预计1-3个工作日完成审核</text>
      </view>

      <view class="pending-card card-base slide-up">
        <view class="pending-card__header">
          <text class="pending-card__badge">📋</text>
          <text class="pending-card__label">已提交信息</text>
        </view>
        <view class="pending-card__body">
          <view class="info-row">
            <text class="info-row__label">真实姓名</text>
            <text class="info-row__value">{{ maskName(verifyInfo.real_name) }}</text>
          </view>
          <view class="info-row info-row--last">
            <text class="info-row__label">身份证号</text>
            <text class="info-row__value">{{ maskIdCard(verifyInfo.identity) }}</text>
          </view>
        </view>
      </view>

      <view class="pending-note slide-up">
        <text class="pending-note__icon">💡</text>
        <text class="pending-note__text">审核期间请保持手机畅通，如有问题将通过消息通知您</text>
      </view>
    </view>

    <!-- ═══ Rejected State (auth_status === 3) ═══ -->
    <view v-else-if="authStatus === 3" class="rejected-state fade-in">
      <view class="rejected-hero">
        <view class="rejected-hero__icon">
          <text class="rejected-hero__mark">✕</text>
        </view>
        <text class="rejected-hero__title">认证未通过</text>
        <text class="rejected-hero__subtitle">请检查信息后重新提交认证</text>
      </view>

      <!-- Show the form again for re-submission -->
      <view class="form-content">
        <view class="form-card card-base slide-up">
          <!-- Name field -->
          <view class="form-field">
            <view class="form-field__header">
              <text class="form-field__label">真实姓名</text>
              <text class="form-field__required">*</text>
            </view>
            <view class="form-field__input-wrap" :class="{ 'form-field__input-wrap--focus': focusField === 'name' }">
              <text class="form-field__prefix">👤</text>
              <input class="form-field__input" v-model="formData.real_name" placeholder="请输入身份证上的姓名"
                maxlength="20" @focus="focusField = 'name'" @blur="focusField = ''" />
            </view>
          </view>

          <!-- ID card number field -->
          <view class="form-field">
            <view class="form-field__header">
              <text class="form-field__label">身份证号</text>
              <text class="form-field__required">*</text>
            </view>
            <view class="form-field__input-wrap" :class="{ 'form-field__input-wrap--focus': focusField === 'idcard' }">
              <text class="form-field__prefix">🪪</text>
              <input class="form-field__input" v-model="formData.identity" placeholder="请输入18位身份证号码"
                maxlength="18" @focus="focusField = 'idcard'" @blur="focusField = ''" />
            </view>
            <text v-if="formData.identity && !isValidIdCard(formData.identity)" class="form-field__error">
              请输入正确的18位身份证号
            </text>
          </view>

          <!-- ID card photos -->
          <view class="form-field">
            <view class="form-field__header">
              <text class="form-field__label">证件照片</text>
              <text class="form-field__required">*</text>
            </view>
            <view class="photo-upload-group">
              <view class="photo-upload-item" @tap="chooseImage('id_card_front')">
                <image v-if="formData.id_card_front" :src="formData.id_card_front" class="photo-upload-item__img" mode="aspectFill" />
                <view v-else class="photo-upload-item__placeholder">
                  <text class="photo-upload-item__icon">📷</text>
                  <text class="photo-upload-item__text">身份证正面</text>
                </view>
              </view>
              <view class="photo-upload-item" @tap="chooseImage('id_card_back')">
                <image v-if="formData.id_card_back" :src="formData.id_card_back" class="photo-upload-item__img" mode="aspectFill" />
                <view v-else class="photo-upload-item__placeholder">
                  <text class="photo-upload-item__icon">�</text>
                  <text class="photo-upload-item__text">身份证反面</text>
                </view>
              </view>
            </view>
          </view>

          <!-- Hand-held photo (optional) -->
          <view class="form-field">
            <view class="form-field__header">
              <text class="form-field__label">手持身份证照片</text>
              <text class="form-field__optional">(选填)</text>
            </view>
            <view class="photo-upload-group">
              <view class="photo-upload-item photo-upload-item--wide" @tap="chooseImage('in_hand')">
                <image v-if="formData.in_hand" :src="formData.in_hand" class="photo-upload-item__img" mode="aspectFill" />
                <view v-else class="photo-upload-item__placeholder">
                  <text class="photo-upload-item__icon">🤳</text>
                  <text class="photo-upload-item__text">手持身份证正面拍照</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- Agreement -->
        <view class="agreement slide-up" @tap="agreed = !agreed">
          <view class="agreement__checkbox" :class="{ 'agreement__checkbox--checked': agreed }">
            <text v-if="agreed" class="agreement__check-icon">✓</text>
          </view>
          <text class="agreement__text">
            我已阅读并同意
            <text class="agreement__link">《实名认证服务协议》</text>
            ，授权平台进行身份验证
          </text>
        </view>

        <!-- Submit button -->
        <view class="submit-section">
          <button class="submit-btn" :class="{ 'submit-btn--disabled': !canSubmit }"
            :disabled="!canSubmit || submitting" @tap="handleSubmit">
            <text class="submit-btn__text">{{ submitting ? '提交中...' : '重新提交认证' }}</text>
          </button>
        </view>
      </view>
    </view>

    <!-- ═══ Not Verified Form (auth_status === 0 or undefined) ═══ -->
    <view v-else class="form-state">
      <!-- Form hero -->
      <view class="form-hero">
        <view class="form-hero__icon-wrap">
          <text class="form-hero__icon">🛡️</text>
        </view>
        <text class="form-hero__title">实名认证</text>
        <text class="form-hero__desc">完成实名认证可提升信用分，解锁更多功能</text>
      </view>

      <!-- Step indicator -->
      <view class="steps">
        <view class="steps__item steps__item--active">
          <view class="steps__dot">1</view>
          <text class="steps__label">填写信息</text>
        </view>
        <view class="steps__line"></view>
        <view class="steps__item">
          <view class="steps__dot">2</view>
          <text class="steps__label">上传证件</text>
        </view>
        <view class="steps__line"></view>
        <view class="steps__item">
          <view class="steps__dot">3</view>
          <text class="steps__label">等待审核</text>
        </view>
      </view>

      <!-- Form card -->
      <view class="form-card card-base slide-up">
        <!-- Name field -->
        <view class="form-field">
          <view class="form-field__header">
            <text class="form-field__label">真实姓名</text>
            <text class="form-field__required">*</text>
          </view>
          <view class="form-field__input-wrap" :class="{ 'form-field__input-wrap--focus': focusField === 'name' }">
            <text class="form-field__prefix">👤</text>
            <input class="form-field__input" v-model="formData.real_name" placeholder="请输入身份证上的姓名"
              maxlength="20" @focus="focusField = 'name'" @blur="focusField = ''" />
          </view>
        </view>

        <!-- ID card number field -->
        <view class="form-field">
          <view class="form-field__header">
            <text class="form-field__label">身份证号</text>
            <text class="form-field__required">*</text>
          </view>
          <view class="form-field__input-wrap" :class="{ 'form-field__input-wrap--focus': focusField === 'idcard' }">
            <text class="form-field__prefix">🪪</text>
            <input class="form-field__input" v-model="formData.identity" placeholder="请输入18位身份证号码"
              maxlength="18" @focus="focusField = 'idcard'" @blur="focusField = ''" />
          </view>
          <text v-if="formData.identity && !isValidIdCard(formData.identity)" class="form-field__error">
            请输入正确的18位身份证号
          </text>
        </view>

        <!-- Mobile field -->
        <view class="form-field">
          <view class="form-field__header">
            <text class="form-field__label">手机号</text>
          </view>
          <view class="form-field__input-wrap form-field__input-wrap--disabled">
            <text class="form-field__prefix">📱</text>
            <input class="form-field__input" v-model="formData.mobile" placeholder="请输入手机号"
              type="number" maxlength="11" disabled />
            <view v-if="formData.mobile" class="form-field__badge">
              <text class="form-field__badge-text">已绑定</text>
            </view>
          </view>
        </view>

        <!-- ID card photos -->
        <view class="form-field">
          <view class="form-field__header">
            <text class="form-field__label">证件照片</text>
            <text class="form-field__required">*</text>
          </view>
          <view class="photo-upload-group">
            <view class="photo-upload-item" @tap="chooseImage('id_card_front')">
              <image v-if="formData.id_card_front" :src="formData.id_card_front" class="photo-upload-item__img" mode="aspectFill" />
              <view v-else class="photo-upload-item__placeholder">
                <text class="photo-upload-item__icon">📷</text>
                <text class="photo-upload-item__text">身份证正面</text>
              </view>
            </view>
            <view class="photo-upload-item" @tap="chooseImage('id_card_back')">
              <image v-if="formData.id_card_back" :src="formData.id_card_back" class="photo-upload-item__img" mode="aspectFill" />
              <view v-else class="photo-upload-item__placeholder">
                <text class="photo-upload-item__icon">📷</text>
                <text class="photo-upload-item__text">身份证反面</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Hand-held photo (optional) -->
        <view class="form-field">
          <view class="form-field__header">
            <text class="form-field__label">手持身份证照片</text>
            <text class="form-field__optional">(选填)</text>
          </view>
          <view class="photo-upload-group">
            <view class="photo-upload-item photo-upload-item--wide" @tap="chooseImage('in_hand')">
              <image v-if="formData.in_hand" :src="formData.in_hand" class="photo-upload-item__img" mode="aspectFill" />
              <view v-else class="photo-upload-item__placeholder">
                <text class="photo-upload-item__icon">🤳</text>
                <text class="photo-upload-item__text">手持身份证正面拍照</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Agreement -->
      <view class="agreement slide-up" @tap="agreed = !agreed">
        <view class="agreement__checkbox" :class="{ 'agreement__checkbox--checked': agreed }">
          <text v-if="agreed" class="agreement__check-icon">✓</text>
        </view>
        <text class="agreement__text">
          我已阅读并同意
          <text class="agreement__link">《实名认证服务协议》</text>
          ，授权平台进行身份验证
        </text>
      </view>

      <!-- Tips card -->
      <view class="tips-card slide-up">
        <view class="tips-card__header">
          <text class="tips-card__icon">💡</text>
          <text class="tips-card__title">温馨提示</text>
        </view>
        <view class="tips-card__body">
          <view class="tips-card__item">
            <text class="tips-card__dot"></text>
            <text class="tips-card__text">实名信息仅用于身份验证，我们将严格保护您的隐私</text>
          </view>
          <view class="tips-card__item">
            <text class="tips-card__dot"></text>
            <text class="tips-card__text">完成认证后信用分 +10，解锁提现等高级功能</text>
          </view>
          <view class="tips-card__item">
            <text class="tips-card__dot"></text>
            <text class="tips-card__text">请上传清晰的证件照片，确保信息完整可辨</text>
          </view>
          <view class="tips-card__item">
            <text class="tips-card__dot"></text>
            <text class="tips-card__text">认证提交后将进入人工审核，预计1-3个工作日</text>
          </view>
        </view>
      </view>

      <!-- Submit button -->
      <view class="submit-section">
        <button class="submit-btn" :class="{ 'submit-btn--disabled': !canSubmit }"
          :disabled="!canSubmit || submitting" @tap="handleSubmit">
          <text class="submit-btn__text">{{ submitting ? '提交中...' : '提交认证' }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { callCloudObject } from '@/utils/request'

const userStore = useUserStore()

// Auth status: 0=not verified, 1=pending, 2=approved, 3=rejected
const authStatus = ref(0)
const loading = ref(true)
const submitting = ref(false)
const agreed = ref(false)
const focusField = ref('')

const formData = reactive({
  real_name: '',
  identity: '',
  mobile: '',
  id_card_front: '',
  id_card_back: '',
  in_hand: ''
})

const verifyInfo = reactive({
  real_name: '',
  identity: '',
  auth_date: 0
})

const canSubmit = computed(() => {
  return (
    agreed.value &&
    formData.real_name.length >= 2 &&
    isValidIdCard(formData.identity) &&
    formData.id_card_front &&
    formData.id_card_back &&
    !submitting.value
  )
})

onLoad(() => {
  loadVerifyStatus()
})

async function loadVerifyStatus() {
  loading.value = true
  try {
    const result = await callCloudObject('user-center', 'getVerifyStatus')
    if (result) {
      authStatus.value = result.auth_status ?? 0

      if (result.auth_status === 2 || result.auth_status === 1) {
        // Approved or pending - show info
        verifyInfo.real_name = result.real_name || ''
        verifyInfo.identity = result.identity || ''
        verifyInfo.auth_date = result.auth_date || 0
      }

      if (result.auth_status === 3) {
        // Rejected - pre-fill form for re-submission
        formData.real_name = result.real_name || ''
        formData.identity = result.identity || ''
      }

      if (result.auth_status === 0) {
        // Not verified - pre-fill from user info
        formData.real_name = userStore.userInfo?.real_name || ''
        formData.mobile = result.mobile || userStore.userInfo?.mobile || ''
      }
    }
  } catch (e) {
    console.error('Load verify status error:', e)
  } finally {
    loading.value = false
  }
}

function isValidIdCard(idCard: string): boolean {
  if (!idCard || idCard.length !== 18) return false
  const reg = /^\d{17}[\dXx]$/
  return reg.test(idCard)
}

/**
 * Choose and upload image for ID card photos
 */
async function chooseImage(field: 'id_card_front' | 'id_card_back' | 'in_hand') {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      try {
        uni.showLoading({ title: '上传中...', mask: true })
        const cloudPath = `verify/${userStore.userId}_${field}_${Date.now()}`
        const uploadRes = await uniCloud.uploadFile({
          filePath,
          cloudPath,
          fileType: 'image'
        })
        if (uploadRes.fileID) {
          formData[field] = uploadRes.fileID
        }
      } catch (e) {
        console.error('Upload image error:', e)
        uni.showToast({ title: '图片上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

async function handleSubmit() {
  if (!canSubmit.value) return

  // Validate name
  if (formData.real_name.length < 2 || formData.real_name.length > 20) {
    uni.showToast({ title: '请输入正确的姓名', icon: 'none' })
    return
  }

  // Validate ID card
  if (!isValidIdCard(formData.identity)) {
    uni.showToast({ title: '请输入正确的18位身份证号', icon: 'none' })
    return
  }

  // Validate photos
  if (!formData.id_card_front || !formData.id_card_back) {
    uni.showToast({ title: '请上传身份证正反面照片', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    uni.showLoading({ title: '提交中...' })
    const result = await callCloudObject('user-center', 'submitVerification', {
      real_name: formData.real_name,
      identity: formData.identity,
      id_card_front: formData.id_card_front,
      id_card_back: formData.id_card_back,
      in_hand: formData.in_hand || ''
    })

    if (result?.success) {
      uni.showToast({ title: '提交成功，等待审核', icon: 'success' })
      authStatus.value = 1
      verifyInfo.real_name = formData.real_name
      verifyInfo.identity = formData.identity

      // Update store
      if (userStore.userInfo) {
        userStore.userInfo.realname_auth = {
          type: 0,
          auth_status: 1,
          real_name: formData.real_name,
          identity: formData.identity,
          id_card_front: formData.id_card_front,
          id_card_back: formData.id_card_back,
          in_hand: formData.in_hand
        }
      }
    }
  } catch (e: any) {
    console.error('Submit verify error:', e)
  } finally {
    submitting.value = false
    uni.hideLoading()
  }
}

function maskName(name: string): string {
  if (!name) return ''
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(name.length - 1)
}

function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard || ''
  return idCard.substring(0, 4) + '**********' + idCard.substring(idCard.length - 4)
}

function formatDate(timestamp: number): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
</script>

<style lang="scss" scoped>
.verify-page {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
}

// ═══════════════════════════════════════
// Loading State
// ═══════════════════════════════════════

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;

  &__text {
    font-size: $uni-font-size-base;
    color: $uni-text-color-placeholder;
  }
}

// ═══════════════════════════════════════
// Verified State (Approved)
// ═══════════════════════════════════════

.verified-state {
  padding-bottom: $uni-spacing-xl;
}

.verified-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px $uni-spacing-lg 36px;
  overflow: hidden;

  &__bg {
    position: absolute;
    top: -60%;
    left: -20%;
    right: -20%;
    height: 200%;
    background: $brand-gradient;
    border-radius: 0 0 50% 50%;
    opacity: 0.08;
  }

  &__icon {
    width: 80px;
    height: 80px;
    border-radius: $uni-border-radius-circle;
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $uni-spacing-md;
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
  }

  &__check {
    font-size: 36px;
    color: #fff;
    font-weight: $uni-font-weight-bold;
  }

  &__title {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-xs;
  }

  &__subtitle {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
  }
}

.verified-card {
  margin: 0 $uni-spacing-lg;

  &__header {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    padding-bottom: $uni-spacing-md;
    border-bottom: 1rpx solid $uni-border-color-light;
    margin-bottom: $uni-spacing-xs;
  }

  &__badge {
    font-size: 20px;
    line-height: 1;
  }

  &__label {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__body {
    padding-top: $uni-spacing-xs;
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $uni-spacing-md 0;
  border-bottom: 1rpx solid $uni-border-color-light;

  &--last {
    border-bottom: none;
  }

  &__label {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
  }

  &__value {
    font-size: $uni-font-size-sm;
    color: $uni-text-color;
    font-weight: $uni-font-weight-medium;
    font-family: 'SF Mono', 'Menlo', monospace;
    letter-spacing: 0.5px;
  }
}

.security-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-xs;
  margin: $uni-spacing-lg $uni-spacing-lg 0;
  padding: $uni-spacing-md;
  background-color: rgba(76, 175, 80, 0.06);
  border-radius: $uni-border-radius-lg;

  &__icon {
    font-size: 14px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
  }
}

// ═══════════════════════════════════════
// Pending Review State
// ═══════════════════════════════════════

.pending-state {
  padding-bottom: $uni-spacing-xl;
}

.pending-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px $uni-spacing-lg 36px;

  &__icon {
    width: 80px;
    height: 80px;
    border-radius: $uni-border-radius-circle;
    background: linear-gradient(135deg, #FF9800, #FFB74D);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $uni-spacing-md;
    box-shadow: 0 8px 24px rgba(255, 152, 0, 0.3);
  }

  &__clock {
    font-size: 36px;
    line-height: 1;
  }

  &__title {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-xs;
  }

  &__subtitle {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    text-align: center;
    line-height: 1.6;
  }
}

.pending-card {
  margin: 0 $uni-spacing-lg;

  &__header {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    padding-bottom: $uni-spacing-md;
    border-bottom: 1rpx solid $uni-border-color-light;
    margin-bottom: $uni-spacing-xs;
  }

  &__badge {
    font-size: 20px;
    line-height: 1;
  }

  &__label {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__body {
    padding-top: $uni-spacing-xs;
  }
}

.pending-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-xs;
  margin: $uni-spacing-lg $uni-spacing-lg 0;
  padding: $uni-spacing-md;
  background-color: rgba(255, 152, 0, 0.06);
  border-radius: $uni-border-radius-lg;

  &__icon {
    font-size: 14px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
  }
}

// ═══════════════════════════════════════
// Rejected State
// ═══════════════════════════════════════

.rejected-state {
  padding-bottom: calc(env(safe-area-inset-bottom) + 100px);
}

.rejected-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px $uni-spacing-lg 24px;

  &__icon {
    width: 72px;
    height: 72px;
    border-radius: $uni-border-radius-circle;
    background: linear-gradient(135deg, #F44336, #EF5350);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $uni-spacing-md;
    box-shadow: 0 8px 24px rgba(244, 67, 54, 0.3);
  }

  &__mark {
    font-size: 32px;
    color: #fff;
    font-weight: $uni-font-weight-bold;
  }

  &__title {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-xs;
  }

  &__subtitle {
    font-size: $uni-font-size-sm;
    color: $uni-color-error;
  }
}

.form-content {
  padding-bottom: env(safe-area-inset-bottom);
}

// ═══════════════════════════════════════
// Form State
// ═══════════════════════════════════════

.form-state {
  padding-bottom: calc(env(safe-area-inset-bottom) + 100px);
}

.form-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px $uni-spacing-lg 24px;

  &__icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: $uni-border-radius-circle;
    background: $brand-gradient-light;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $uni-spacing-md;
  }

  &__icon {
    font-size: 32px;
    line-height: 1;
  }

  &__title {
    font-size: $uni-font-size-xxl;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-xs;
  }

  &__desc {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
  }
}

// ── Step Indicator ──
.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $uni-spacing-sm $uni-spacing-xl $uni-spacing-lg;
  gap: 0;

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $uni-spacing-xs;

    &--active .steps__dot {
      background: $uni-color-primary;
      color: #fff;
      box-shadow: 0 2px 8px rgba($uni-color-primary, 0.3);
    }

    &--active .steps__label {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-medium;
    }
  }

  &__dot {
    width: 28px;
    height: 28px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-bg-color-hover;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
    font-weight: $uni-font-weight-semibold;
    transition: $uni-transition-normal;
  }

  &__label {
    font-size: 11px;
    color: $uni-text-color-placeholder;
    white-space: nowrap;
  }

  &__line {
    width: 36px;
    height: 2px;
    background-color: $uni-border-color-light;
    margin: 0 $uni-spacing-xs;
    margin-bottom: 20px;
    border-radius: 1px;

    &--active {
      background: $uni-color-primary;
    }
  }
}

// ── Form Card ──
.form-card {
  margin: 0 $uni-spacing-lg;
}

.form-field {
  padding: $uni-spacing-md 0;

  & + & {
    border-top: 1rpx solid $uni-border-color-light;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-bottom: $uni-spacing-sm;
  }

  &__label {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
  }

  &__required {
    font-size: $uni-font-size-sm;
    color: $uni-color-error;
  }

  &__optional {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
    margin-left: 4px;
  }

  &__input-wrap {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    padding: $uni-spacing-sm $uni-spacing-md;
    background-color: $uni-bg-color-input;
    border-radius: $uni-border-radius-base;
    border: 2rpx solid transparent;
    transition: $uni-transition-fast;

    &--focus {
      border-color: $uni-color-primary;
      background-color: rgba($uni-color-primary, 0.04);
    }

    &--disabled {
      opacity: 0.7;
    }
  }

  &__prefix {
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    font-size: $uni-font-size-base;
    color: $uni-text-color;
    min-height: 24px;
  }

  &__badge {
    padding: 2px $uni-spacing-sm;
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    border-radius: $uni-border-radius-pill;
  }

  &__badge-text {
    font-size: 10px;
    color: #fff;
    font-weight: $uni-font-weight-medium;
  }

  &__error {
    display: block;
    font-size: $uni-font-size-xs;
    color: $uni-color-error;
    margin-top: $uni-spacing-xs;
    padding-left: $uni-spacing-xs;
  }
}

// ── Photo Upload ──
.photo-upload-group {
  display: flex;
  gap: $uni-spacing-md;
  flex-wrap: wrap;
}

.photo-upload-item {
  width: calc(50% - #{$uni-spacing-md} / 2);
  aspect-ratio: 1.6 / 1;
  border-radius: $uni-border-radius-lg;
  overflow: hidden;
  border: 2rpx dashed $uni-border-color;
  background-color: $uni-bg-color-input;
  transition: $uni-transition-fast;

  &--wide {
    width: 100%;
    aspect-ratio: 2.4 / 1;
  }

  &__img {
    width: 100%;
    height: 100%;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $uni-spacing-xs;
  }

  &__icon {
    font-size: 28px;
    line-height: 1;
    opacity: 0.6;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }

  &:active {
    border-color: $uni-color-primary;
    background-color: rgba($uni-color-primary, 0.04);
  }
}

// ── Agreement ──
.agreement {
  display: flex;
  align-items: flex-start;
  gap: $uni-spacing-sm;
  padding: $uni-spacing-lg $uni-spacing-lg $uni-spacing-sm;

  &__checkbox {
    width: 20px;
    height: 20px;
    border: 2rpx solid $uni-border-color;
    border-radius: $uni-border-radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    transition: $uni-transition-fast;

    &--checked {
      background: $uni-color-primary;
      border-color: $uni-color-primary;
    }
  }

  &__check-icon {
    font-size: 12px;
    color: #fff;
    font-weight: $uni-font-weight-bold;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
    line-height: 1.6;
  }

  &__link {
    color: $uni-color-primary;
    font-weight: $uni-font-weight-medium;
  }
}

// ── Tips Card ──
.tips-card {
  margin: $uni-spacing-md $uni-spacing-lg 0;
  padding: $uni-spacing-md;
  background-color: $uni-bg-color-warm;
  border-radius: $uni-border-radius-lg;

  &__header {
    display: flex;
    align-items: center;
    gap: $uni-spacing-xs;
    margin-bottom: $uni-spacing-sm;
  }

  &__icon {
    font-size: 14px;
    line-height: 1;
  }

  &__title {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: $uni-spacing-xs;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: $uni-spacing-sm;
  }

  &__dot {
    width: 4px;
    height: 4px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-color-primary;
    flex-shrink: 0;
    margin-top: 7px;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
    line-height: 1.6;
  }
}

// ── Submit Button ──
.submit-section {
  padding: $uni-spacing-xl $uni-spacing-lg;
}

.submit-btn {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $brand-gradient;
  border-radius: $uni-border-radius-pill;
  border: none;
  box-shadow: $uni-shadow-primary;
  transition: $uni-transition-normal;

  &::after {
    border: none;
  }

  &__text {
    font-size: $uni-font-size-lg;
    color: #fff;
    font-weight: $uni-font-weight-semibold;
    letter-spacing: 1px;
  }

  &--disabled {
    opacity: 0.5;
    box-shadow: none;
  }

  &:active:not(.submit-btn--disabled) {
    transform: scale(0.98);
    opacity: 0.9;
  }
}
</style>
