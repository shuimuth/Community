<template>
  <view class="withdraw-page">
    <!-- Balance header with gradient -->
    <view class="balance-header">
      <view class="balance-header__bg"></view>
      <view class="balance-header__content">
        <view class="balance-header__icon">💰</view>
        <text class="balance-header__label">可提现余额（元）</text>
        <text class="balance-header__amount">{{ formatAmount(availableBalance) }}</text>
      </view>
    </view>

    <!-- Withdraw form -->
    <view class="form-section">
      <!-- Amount input card -->
      <view class="form-card card-base animate-slide-up">
        <view class="form-card__header">
          <text class="form-card__title">提现金额</text>
          <text class="form-card__action" @tap="withdrawAll">全部提现</text>
        </view>
        <view class="amount-input-area">
          <text class="amount-input-area__symbol">¥</text>
          <input
            class="amount-input-area__input"
            type="digit"
            v-model="amount"
            placeholder="0.00"
            placeholder-class="amount-placeholder"
            @input="onAmountInput"
          />
        </view>
        <view class="amount-input-area__tip">
          <text class="amount-input-area__tip-text">最低提现金额 ¥{{ minWithdraw }} 元</text>
        </view>
      </view>

      <!-- Withdraw method card -->
      <view class="form-card card-base animate-slide-up" style="animation-delay: 0.05s">
        <view class="form-card__header">
          <text class="form-card__title">提现方式</text>
        </view>
        <view
          class="method-option pressable"
          :class="{ 'method-option--active': withdrawMethod === 'wechat' }"
          @tap="withdrawMethod = 'wechat'"
        >
          <view class="method-option__icon">
            <text class="method-option__icon-emoji">💬</text>
          </view>
          <view class="method-option__info">
            <text class="method-option__name">微信零钱</text>
            <text class="method-option__desc">提现至微信钱包</text>
          </view>
          <view class="method-option__check" v-if="withdrawMethod === 'wechat'">
            <text class="method-option__check-icon">✓</text>
          </view>
        </view>
      </view>

      <!-- Verify warning -->
      <view v-if="!isVerified" class="verify-banner animate-slide-up" style="animation-delay: 0.1s">
        <view class="verify-banner__icon">⚠️</view>
        <view class="verify-banner__content">
          <text class="verify-banner__text">提现前需先完成实名认证</text>
          <text class="verify-banner__desc">认证后即可申请提现</text>
        </view>
        <view class="verify-banner__action pressable" @tap="goVerify">
          <text class="verify-banner__action-text">去认证</text>
          <text class="verify-banner__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- Notice section -->
    <view class="notice-section animate-slide-up" style="animation-delay: 0.15s">
      <view class="notice-section__header">
        <text class="notice-section__icon">📋</text>
        <text class="notice-section__title">提现说明</text>
      </view>
      <view class="notice-section__list">
        <text class="notice-section__item">提现申请提交后，预计1-3个工作日内到账</text>
        <text class="notice-section__item">提现金额将通过微信零钱发放</text>
        <text class="notice-section__item">最低提现金额为 {{ minWithdraw }} 元</text>
        <text class="notice-section__item">提现申请需经平台审核通过后处理</text>
      </view>
    </view>

    <!-- Submit button -->
    <view class="submit-section">
      <button
        class="submit-btn"
        :class="{ 'submit-btn--disabled': !canSubmit }"
        :disabled="!canSubmit || submitting"
        @tap="handleSubmit"
      >
        <text class="submit-btn__text">{{ submitting ? '提交中...' : '申请提现' }}</text>
      </button>
      <text class="submit-section__hint" v-if="amount && canSubmit">
        将提现 ¥{{ parseFloat(amount).toFixed(2) }} 到微信零钱
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { callCloudObject } from '@/utils/request'
import { showConfirm } from '@/utils/common'
import { PLATFORM } from '@/utils/constants'

const userStore = useUserStore()
const amount = ref('')
const withdrawMethod = ref('wechat')
const submitting = ref(false)
const availableBalance = ref(0)
const isVerified = ref(false)
const minWithdraw = PLATFORM.MIN_WITHDRAW

onLoad(async () => {
  try {
    const info = await callCloudObject('user-center', 'getUserInfo')
    if (info) {
      availableBalance.value = info.balance || 0
      isVerified.value = !!info.is_verified
    }
  } catch (e) {
    console.error('Load user info error:', e)
  }
})

const canSubmit = computed(() => {
  const val = parseFloat(amount.value)
  return (
    !submitting.value &&
    isVerified.value &&
    val >= minWithdraw &&
    val <= availableBalance.value
  )
})

function onAmountInput(e: any) {
  let val = e.detail.value
  // Limit to 2 decimal places
  if (val.includes('.')) {
    const parts = val.split('.')
    if (parts[1] && parts[1].length > 2) {
      val = parts[0] + '.' + parts[1].substring(0, 2)
      amount.value = val
    }
  }
}

function withdrawAll() {
  amount.value = availableBalance.value.toFixed(2)
}

function goVerify() {
  uni.navigateTo({ url: '/pages/user/verify' })
}

function formatAmount(val: number): string {
  return (val || 0).toFixed(2)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  const val = parseFloat(amount.value)
  if (isNaN(val) || val < minWithdraw) {
    uni.showToast({ title: `最低提现金额为${minWithdraw}元`, icon: 'none' })
    return
  }
  if (val > availableBalance.value) {
    uni.showToast({ title: '提现金额不能超过可用余额', icon: 'none' })
    return
  }

  const confirmed = await showConfirm(`确认提现 ¥${val.toFixed(2)} 到微信零钱？`)
  if (!confirmed) return

  submitting.value = true
  try {
    uni.showLoading({ title: '提交中...' })
    await callCloudObject('finance-service', 'submitWithdraw', {
      amount: val,
      method: withdrawMethod.value
    })

    uni.showToast({ title: '提现申请已提交', icon: 'success' })
    // Update local balance
    availableBalance.value -= val
    userStore.updateBalance(availableBalance.value)
    amount.value = ''

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e: any) {
    console.error('Withdraw error:', e)
  } finally {
    submitting.value = false
    uni.hideLoading()
  }
}
</script>

<style lang="scss" scoped>
.withdraw-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: calc(env(safe-area-inset-bottom) + 120px);
}

// ── Balance Header ──
.balance-header {
  position: relative;
  overflow: hidden;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: $brand-gradient;

    &::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: -10%;
      right: -10%;
      height: 40px;
      background: $uni-bg-color-grey;
      border-radius: 50% 50% 0 0;
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px $uni-spacing-lg 44px;
  }

  &__icon {
    font-size: 32px;
    margin-bottom: $uni-spacing-sm;
    animation: floatY 3s ease-in-out infinite;
  }

  &__label {
    font-size: $uni-font-size-sm;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: $uni-spacing-xs;
  }

  &__amount {
    font-size: 40px;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color-inverse;
    letter-spacing: -0.5px;
  }
}

// ── Form Section ──
.form-section {
  padding: 0 $uni-spacing-lg;
  margin-top: -12px;
  position: relative;
  z-index: 2;
}

.form-card {
  padding: $uni-spacing-lg;
  margin-bottom: $uni-spacing-md;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $uni-spacing-md;
  }

  &__title {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__action {
    font-size: $uni-font-size-sm;
    color: $uni-color-primary;
    font-weight: $uni-font-weight-medium;
  }
}

// ── Amount Input ──
.amount-input-area {
  display: flex;
  align-items: baseline;
  padding: $uni-spacing-md 0;
  border-bottom: 2px solid $uni-border-color-light;
  transition: $uni-transition-normal;

  &:focus-within {
    border-bottom-color: $uni-color-primary;
  }

  &__symbol {
    font-size: 28px;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    margin-right: $uni-spacing-sm;
  }

  &__input {
    flex: 1;
    font-size: 36px;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    line-height: 1.2;
  }

  &__tip {
    margin-top: $uni-spacing-sm;
  }

  &__tip-text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-light;
  }
}

.amount-placeholder {
  color: $uni-text-color-placeholder;
  font-weight: $uni-font-weight-regular;
}

// ── Method Option ──
.method-option {
  display: flex;
  align-items: center;
  padding: $uni-spacing-md;
  border: 2rpx solid $uni-border-color-light;
  border-radius: $uni-border-radius-lg;
  transition: $uni-transition-normal;

  &--active {
    border-color: $uni-color-primary;
    background-color: rgba($uni-color-primary, 0.04);
  }

  &__icon {
    width: 44px;
    height: 44px;
    border-radius: $uni-border-radius-base;
    background: linear-gradient(135deg, #2DC100 0%, #07C160 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $uni-spacing-md;
  }

  &__icon-emoji {
    font-size: 22px;
    filter: brightness(0) invert(1);
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
  }

  &__desc {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-light;
  }

  &__check {
    width: 24px;
    height: 24px;
    border-radius: $uni-border-radius-circle;
    background: $brand-gradient;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scaleIn $uni-anim-duration-normal $uni-anim-timing-bounce;
  }

  &__check-icon {
    font-size: 14px;
    color: $uni-text-color-inverse;
    font-weight: $uni-font-weight-bold;
  }
}

// ── Verify Banner ──
.verify-banner {
  display: flex;
  align-items: center;
  padding: $uni-spacing-md $uni-spacing-lg;
  background: linear-gradient(135deg, rgba(255, 170, 13, 0.08) 0%, rgba(255, 122, 69, 0.06) 100%);
  border: 2rpx solid rgba(255, 170, 13, 0.2);
  border-radius: $uni-border-radius-lg;
  margin-bottom: $uni-spacing-md;

  &__icon {
    font-size: 20px;
    margin-right: $uni-spacing-sm;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__text {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-medium;
    color: #E8890C;
  }

  &__desc {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-light;
  }

  &__action {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: $uni-spacing-xs $uni-spacing-sm;
    background: rgba(255, 170, 13, 0.12);
    border-radius: $uni-border-radius-pill;
    flex-shrink: 0;
  }

  &__action-text {
    font-size: $uni-font-size-xs;
    font-weight: $uni-font-weight-medium;
    color: #E8890C;
  }

  &__arrow {
    font-size: 14px;
    color: #E8890C;
    font-weight: $uni-font-weight-bold;
  }
}

// ── Notice Section ──
.notice-section {
  margin: $uni-spacing-sm $uni-spacing-lg $uni-spacing-md;
  padding: $uni-spacing-md $uni-spacing-lg;
  background-color: rgba($uni-color-primary, 0.04);
  border-radius: $uni-border-radius-lg;

  &__header {
    display: flex;
    align-items: center;
    gap: $uni-spacing-xs;
    margin-bottom: $uni-spacing-sm;
  }

  &__icon {
    font-size: 14px;
  }

  &__title {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__item {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-light;
    line-height: 1.6;
    padding-left: 12px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 4px;
      height: 4px;
      border-radius: $uni-border-radius-circle;
      background-color: $uni-color-primary;
      opacity: 0.5;
    }
  }
}

// ── Submit Section ──
.submit-section {
  padding: $uni-spacing-lg;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $uni-spacing-sm;

  &__hint {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-light;
    animation: fadeIn $uni-anim-duration-normal ease;
  }
}

.submit-btn {
  width: 100%;
  height: 50px;
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

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  &--disabled {
    opacity: 0.5;
    box-shadow: none;
  }

  &__text {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color-inverse;
  }
}

// ── Float animation ──
@keyframes floatY {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

// ── Scale in animation ──
@keyframes scaleIn {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}
</style>
