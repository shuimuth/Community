<template>
  <view class="user-center">
    <!-- Gradient header area with user info -->
    <view class="header-bg">
      <view class="header-bg__statusbar" :style="{ height: statusBarHeight + 'px' }"></view>

      <!-- User profile card -->
      <view class="profile-card anim-fade-in" @tap="navigateToUserInfo">
        <view class="profile-card__avatar-wrap">
          <image
            class="profile-card__avatar"
            :src="userInfo?.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
            lazy-load
          />
          <view v-if="userInfo?.is_verified" class="profile-card__verified">✓</view>
        </view>
        <view class="profile-card__info">
          <view class="profile-card__name-row">
            <text class="profile-card__name">{{ userInfo?.nickname || '未登录' }}</text>
            <text class="profile-card__arrow">›</text>
          </view>
          <view v-if="userInfo" class="profile-card__credit">
            <view class="credit-badge" :class="`credit-badge--${creditLevel}`">
              <text class="credit-badge__score">{{ userInfo.credit_score || 100 }}</text>
              <text class="credit-badge__label">{{ creditLevelText }}</text>
            </view>
            <text class="profile-card__id">ID: {{ userInfo._id?.slice(-8) || '--' }}</text>
          </view>
        </view>
      </view>

      <!-- Balance card (glass effect) -->
      <view v-if="userInfo" class="balance-card anim-fade-in-up anim-delay-1">
        <view class="balance-card__item" @tap="navigateToBalance">
          <text class="balance-card__value">{{ formatBalance(userInfo.balance || 0) }}</text>
          <text class="balance-card__label">可用余额(元)</text>
        </view>
        <view class="balance-card__divider"></view>
        <view class="balance-card__item">
          <text class="balance-card__value balance-card__value--frozen">{{ formatBalance(userInfo.frozen_balance || 0) }}</text>
          <text class="balance-card__label">冻结金额(元)</text>
        </view>
        <view class="balance-card__action" @tap="navigateTo('/pages/user/withdraw')">
          <text class="balance-card__action-text">提现</text>
        </view>
      </view>
    </view>

    <!-- Quick stats grid -->
    <view v-if="userInfo" class="stats-grid anim-fade-in-up anim-delay-2">
      <view class="stats-grid__item" @tap="navigateTo('/pages/user/my-tasks?tab=published')">
        <text class="stats-grid__icon">📝</text>
        <text class="stats-grid__label">我发布的</text>
      </view>
      <view class="stats-grid__item" @tap="navigateTo('/pages/user/my-tasks?tab=accepted')">
        <text class="stats-grid__icon">🤝</text>
        <text class="stats-grid__label">我接单的</text>
      </view>
      <view class="stats-grid__item" @tap="navigateTo('/pages/user/my-tasks?tab=in_progress')">
        <text class="stats-grid__icon">⏳</text>
        <text class="stats-grid__label">进行中</text>
      </view>
      <view class="stats-grid__item" @tap="navigateTo('/pages/user/reviews')">
        <text class="stats-grid__icon">⭐</text>
        <text class="stats-grid__label">我的评价</text>
      </view>
    </view>

    <!-- Menu groups -->
    <view class="menu-section">
      <!-- Group 1: Task & Finance -->
      <view class="menu-group anim-fade-in-up anim-delay-3">
        <view class="menu-item pressable" @tap="navigateTo('/pages/user/my-tasks')">
          <view class="menu-item__icon" style="background: linear-gradient(135deg, #FF7A45, #FF9A6C);">
            <text class="menu-item__icon-emoji">📋</text>
          </view>
          <text class="menu-item__text">我的任务</text>
          <text class="menu-item__arrow">›</text>
        </view>
        <view class="menu-item pressable" @tap="navigateTo('/pages/community/manage')">
          <view class="menu-item__icon" style="background: linear-gradient(135deg, #36B37E, #79F2C0);">
            <text class="menu-item__icon-emoji">🏘️</text>
          </view>
          <text class="menu-item__text">我的小区</text>
          <text class="menu-item__arrow">›</text>
        </view>
        <view class="menu-item pressable" @tap="navigateToBalance">
          <view class="menu-item__icon" style="background: linear-gradient(135deg, #FFAB00, #FFE380);">
            <text class="menu-item__icon-emoji">💰</text>
          </view>
          <text class="menu-item__text">账户余额</text>
          <text class="menu-item__arrow">›</text>
        </view>
        <view class="menu-item pressable" @tap="navigateTo('/pages/user/transactions')">
          <view class="menu-item__icon" style="background: linear-gradient(135deg, #9B59B6, #C39BD3);">
            <text class="menu-item__icon-emoji">📊</text>
          </view>
          <text class="menu-item__text">交易记录</text>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- Group 2: Identity & Reviews -->
      <view class="menu-group anim-fade-in-up anim-delay-4">
        <view class="menu-item pressable" @tap="navigateTo('/pages/user/verify')">
          <view class="menu-item__icon" style="background: linear-gradient(135deg, #2684FF, #4C9AFF);">
            <text class="menu-item__icon-emoji">🛡️</text>
          </view>
          <text class="menu-item__text">实名认证</text>
          <view class="menu-item__badge" v-if="userInfo && userInfo.is_verified">
            <text class="menu-item__badge-text menu-item__badge-text--success">已认证</text>
          </view>
          <view class="menu-item__badge" v-else>
            <text class="menu-item__badge-text menu-item__badge-text--warning">未认证</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
        <view class="menu-item pressable" @tap="navigateTo('/pages/user/reviews')">
          <view class="menu-item__icon" style="background: linear-gradient(135deg, #FF5630, #FF8F73);">
            <text class="menu-item__icon-emoji">⭐</text>
          </view>
          <text class="menu-item__text">我的评价</text>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- Group 3: Other -->
      <view class="menu-group anim-fade-in-up anim-delay-5">
        <view class="menu-item menu-item--disabled">
          <view class="menu-item__icon menu-item__icon--disabled">
            <text class="menu-item__icon-emoji">🎁</text>
          </view>
          <text class="menu-item__text">积分商城</text>
          <view class="menu-item__badge">
            <text class="menu-item__badge-text menu-item__badge-text--info">即将上线</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
        <view class="menu-item pressable" @tap="navigateTo('/pages/user/settings')">
          <view class="menu-item__icon" style="background: linear-gradient(135deg, #8C8C9A, #B0B0BC);">
            <text class="menu-item__icon-emoji">⚙️</text>
          </view>
          <text class="menu-item__text">设置</text>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- Bottom safe area -->
    <view class="safe-area-bottom" style="height: 20px;"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { callCloudObject } from '@/utils/request'

const userStore = useUserStore()

const userInfo = computed(() => userStore.userInfo)

// Status bar height
const statusBarHeight = ref(20)

onMounted(() => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 20
  } catch (e) {
    statusBarHeight.value = 20
  }
})

// Refresh user info every time the page is shown
onShow(async () => {
  try {
    const info = await callCloudObject('user-center', 'getUserInfo')
    if (info) {
      userStore.setUserInfo(info)

      // Guide user to complete profile if incomplete
      if (!info.real_name || !info.mobile) {
        uni.showModal({
          title: '完善个人信息',
          content: '您的个人信息尚未完善，建议尽快完善以便正常使用所有功能',
          confirmText: '去完善',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({ url: '/pages/profile/complete' })
            }
          }
        })
        return
      }
    }
  } catch (e) {
    console.error('Refresh user info error:', e)
  }
})

const creditColor = computed(() => {
  const score = userInfo.value?.credit_score || 0
  if (score >= 90) return '#36B37E'
  if (score >= 70) return '#2684FF'
  if (score >= 60) return '#FFAB00'
  return '#FF5630'
})

const creditLevel = computed(() => {
  const score = userInfo.value?.credit_score || 0
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 60) return 'normal'
  return 'poor'
})

const creditLevelText = computed(() => userStore.creditLevelText)

function formatBalance(amount: number): string {
  return amount.toFixed(2)
}

function navigateToUserInfo() {
  uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo' })
}

function navigateToBalance() {
  uni.navigateTo({ url: '/pages/user/balance' })
}

function navigateTo(url: string) {
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.user-center {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* ── Header gradient background ──────────────────────────────── */
.header-bg {
  background: $brand-gradient;
  padding: 0 $uni-spacing-base $uni-spacing-lg;
  padding-bottom: $uni-spacing-xxl;
  border-radius: 0 0 $uni-border-radius-xl $uni-border-radius-xl;
  position: relative;

  &__statusbar {
    width: 100%;
  }
}

/* ── Profile card ────────────────────────────────────────────── */
.profile-card {
  display: flex;
  align-items: center;
  padding: $uni-spacing-lg 0;

  &__avatar-wrap {
    position: relative;
    margin-right: $uni-spacing-base;
    flex-shrink: 0;
  }

  &__avatar {
    width: 68px;
    height: 68px;
    border-radius: $uni-border-radius-circle;
    border: 3px solid rgba(255, 255, 255, 0.4);
  }

  &__verified {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-color-success;
    color: $uni-text-color-inverse;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.6);
    font-weight: $uni-font-weight-bold;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $uni-spacing-xs;
  }

  &__name {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color-inverse;
    line-height: $uni-line-height-tight;
  }

  &__arrow {
    font-size: 24px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: $uni-font-weight-medium;
  }

  &__credit {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }

  &__id {
    font-size: $uni-font-size-xs;
    color: rgba(255, 255, 255, 0.5);
  }
}

/* ── Credit badge ────────────────────────────────────────────── */
.credit-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: $uni-border-radius-pill;
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);

  &__score {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color-inverse;
    font-family: 'DIN Alternate', $uni-font-family;
  }

  &__label {
    font-size: $uni-font-size-xs;
    color: rgba(255, 255, 255, 0.8);
  }

  &--excellent { background-color: rgba(54, 179, 126, 0.3); }
  &--good { background-color: rgba(38, 132, 255, 0.3); }
  &--normal { background-color: rgba(255, 171, 0, 0.3); }
  &--poor { background-color: rgba(255, 86, 48, 0.3); }
}

/* ── Balance card (glass morphism) ───────────────────────────── */
.balance-card {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px);
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-base $uni-spacing-md;
  border: 1px solid rgba(255, 255, 255, 0.12);

  &__item {
    flex: 1;
    text-align: center;
  }

  &__value {
    display: block;
    font-size: 22px;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color-inverse;
    font-family: 'DIN Alternate', $uni-font-family;
    line-height: $uni-line-height-tight;
    margin-bottom: 2px;

    &--frozen {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.65);
    }
  }

  &__label {
    font-size: $uni-font-size-xs;
    color: rgba(255, 255, 255, 0.6);
  }

  &__divider {
    width: 1px;
    height: 32px;
    background-color: rgba(255, 255, 255, 0.2);
    margin: 0 $uni-spacing-sm;
  }

  &__action {
    padding: $uni-spacing-sm $uni-spacing-base;
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: $uni-border-radius-pill;
    margin-left: $uni-spacing-sm;
    flex-shrink: 0;
    transition: $uni-transition-fast;

    &:active {
      background-color: rgba(255, 255, 255, 0.35);
    }
  }

  &__action-text {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color-inverse;
  }
}

/* ── Quick stats grid ────────────────────────────────────────── */
.stats-grid {
  display: flex;
  margin: -$uni-spacing-base $uni-spacing-base 0;
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-lg;
  box-shadow: $uni-shadow-base;
  padding: $uni-spacing-base 0;
  position: relative;
  z-index: 2;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $uni-spacing-xs;
    transition: $uni-transition-fast;

    &:active {
      opacity: $uni-opacity-pressed;
      transform: scale(0.95);
    }
  }

  &__icon {
    font-size: 24px;
    line-height: 1;
  }

  &__label {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
    font-weight: $uni-font-weight-medium;
  }
}

/* ── Menu section ────────────────────────────────────────────── */
.menu-section {
  padding: $uni-spacing-base;
  padding-top: $uni-spacing-md;
}

.menu-group {
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-lg;
  margin-bottom: $uni-spacing-md;
  overflow: hidden;
  box-shadow: $uni-shadow-card;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: $uni-spacing-md $uni-spacing-base;
  position: relative;

  /* Separator line */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 60px;
    right: $uni-spacing-base;
    height: 1px;
    background-color: $uni-border-color-light;
  }

  &:last-child::after {
    display: none;
  }

  &--disabled {
    opacity: 0.5;
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: $uni-border-radius-base;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $uni-spacing-md;
    flex-shrink: 0;

    &--disabled {
      background: linear-gradient(135deg, #D0D0D0, #E0E0E0) !important;
    }
  }

  &__icon-emoji {
    font-size: 18px;
    line-height: 1;
  }

  &__text {
    flex: 1;
    font-size: $uni-font-size-base;
    color: $uni-text-color;
    font-weight: $uni-font-weight-medium;
  }

  &__badge {
    margin-right: $uni-spacing-sm;
  }

  &__badge-text {
    font-size: $uni-font-size-xs;
    padding: 2px $uni-spacing-sm;
    border-radius: $uni-border-radius-pill;
    font-weight: $uni-font-weight-medium;

    &--success {
      color: $uni-color-success;
      background-color: $uni-color-success-pale;
    }

    &--warning {
      color: $uni-color-warning;
      background-color: $uni-color-warning-pale;
    }

    &--info {
      color: $uni-text-color-grey;
      background-color: $uni-bg-color-tag;
    }
  }

  &__arrow {
    font-size: 20px;
    color: $uni-text-color-disable;
    font-weight: $uni-font-weight-medium;
    flex-shrink: 0;
  }
}
</style>
