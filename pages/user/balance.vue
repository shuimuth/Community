<template>
  <view class="balance-page">
    <!-- Balance hero header with brand gradient -->
    <view class="balance-hero">
      <view class="hero-bg-decor">
        <view class="decor-circle decor-circle--1"></view>
        <view class="decor-circle decor-circle--2"></view>
        <view class="decor-circle decor-circle--3"></view>
      </view>

      <view class="hero-content">
        <text class="hero-label">可用余额（元）</text>
        <view class="hero-amount-row">
          <text class="hero-currency">¥</text>
          <text class="hero-amount">{{ formatAmount(balance) }}</text>
        </view>

        <!-- Stats bar -->
        <view class="hero-stats">
          <view class="stat-item">
            <text class="stat-value">¥{{ formatAmount(frozenBalance) }}</text>
            <text class="stat-label">冻结金额</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">¥{{ formatAmount(totalIncome) }}</text>
            <text class="stat-label">累计收入</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">¥{{ formatAmount(totalWithdraw) }}</text>
            <text class="stat-label">累计提现</text>
          </view>
        </view>

        <!-- Withdraw button -->
        <view class="hero-action">
          <view class="withdraw-btn pressable" @tap="goWithdraw">
            <text class="withdraw-btn__text">💰 立即提现</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Frozen tip -->
    <view class="frozen-tip" v-if="frozenBalance > 0">
      <text class="frozen-tip__icon">ℹ️</text>
      <text class="frozen-tip__text">冻结金额为进行中的任务保证金，任务完成后自动释放</text>
    </view>

    <!-- Recent transactions section -->
    <view class="section fade-in-up">
      <view class="section__header">
        <view class="section__title-row">
          <text class="section__icon">📋</text>
          <text class="section__title">近期交易</text>
        </view>
        <view class="section__action pressable" @tap="goTransactions">
          <text class="section__action-text">全部记录</text>
          <text class="section__arrow">›</text>
        </view>
      </view>

      <view v-if="recentList.length > 0" class="trans-list">
        <view
          v-for="(item, index) in recentList"
          :key="item._id"
          class="trans-item pressable"
          :style="{ animationDelay: index * 60 + 'ms' }"
        >
          <view class="trans-item__icon" :class="'trans-item__icon--' + item.type">
            <text class="trans-item__emoji">{{ getTransEmoji(item.type) }}</text>
          </view>
          <view class="trans-item__body">
            <text class="trans-item__title">{{ getTransTitle(item) }}</text>
            <text class="trans-item__time">{{ formatDate(item.created_at) }}</text>
          </view>
          <text class="trans-item__amount" :class="{ 'trans-item__amount--income': isIncome(item.type) }">
            {{ isIncome(item.type) ? '+' : '-' }}¥{{ formatAmount(item.amount) }}
          </text>
        </view>
      </view>

      <!-- Empty state -->
      <view v-else class="empty-block">
        <text class="empty-block__emoji">📭</text>
        <text class="empty-block__text">暂无交易记录</text>
        <text class="empty-block__sub">完成任务后收入将显示在这里</text>
      </view>
    </view>

    <!-- Bottom safe area -->
    <view class="safe-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { callCloudObject } from '@/utils/request'
import { TRANSACTION_TYPES, PLATFORM } from '@/utils/constants'

const userStore = useUserStore()
const balance = ref(0)
const frozenBalance = ref(0)
const totalIncome = ref(0)
const totalWithdraw = ref(0)
const recentList = ref<any[]>([])

onShow(() => {
  loadBalanceData()
})

async function loadBalanceData() {
  try {
    uni.showLoading({ title: '加载中...' })
    const result = await callCloudObject('user-center', 'getBalanceInfo')

    balance.value = result?.balance || 0
    frozenBalance.value = result?.frozen_balance || 0
    totalIncome.value = result?.total_income || 0
    totalWithdraw.value = result?.total_withdraw || 0
    recentList.value = result?.recent_transactions || []

    // Update store
    userStore.updateBalance(balance.value, frozenBalance.value)
  } catch (e) {
    console.error('Load balance error:', e)
  } finally {
    uni.hideLoading()
  }
}

function formatAmount(val: number): string {
  return (val || 0).toFixed(2)
}

function formatDate(timestamp: number): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function isIncome(type: string): boolean {
  return type === TRANSACTION_TYPES.INCOME || type === TRANSACTION_TYPES.REFUND
}

function getTransEmoji(type: string): string {
  const map: Record<string, string> = {
    income: '💵',
    expense: '📤',
    withdraw: '🏦',
    refund: '🔄',
    service_fee: '📎'
  }
  return map[type] || '💳'
}

function getTransTitle(item: any): string {
  const map: Record<string, string> = {
    income: '任务报酬收入',
    expense: '任务发布支付',
    withdraw: '余额提现',
    refund: '任务取消退款',
    service_fee: '平台服务费'
  }
  return item.description || map[item.type] || '交易记录'
}

function goWithdraw() {
  if (balance.value < PLATFORM.MIN_WITHDRAW) {
    uni.showToast({
      title: `余额不足${PLATFORM.MIN_WITHDRAW}元，无法提现`,
      icon: 'none'
    })
    return
  }
  uni.navigateTo({ url: '/pages/user/withdraw' })
}

function goTransactions() {
  uni.navigateTo({ url: '/pages/user/transactions' })
}
</script>

<style lang="scss" scoped>
.balance-page {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
}

// ── Hero Header ──
.balance-hero {
  background: $brand-gradient;
  padding: calc(var(--status-bar-height, 25px) + 56px) $uni-spacing-lg $uni-spacing-xl;
  position: relative;
  overflow: hidden;
}

.hero-bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decor-circle {
  position: absolute;
  border-radius: $uni-border-radius-circle;
  background-color: rgba(255, 255, 255, 0.06);

  &--1 {
    width: 200px;
    height: 200px;
    top: -60px;
    right: -40px;
  }
  &--2 {
    width: 120px;
    height: 120px;
    bottom: -30px;
    left: -20px;
  }
  &--3 {
    width: 80px;
    height: 80px;
    top: 40%;
    left: 60%;
    background-color: rgba(255, 255, 255, 0.04);
  }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-label {
  display: block;
  font-size: $uni-font-size-sm;
  color: rgba(255, 255, 255, 0.75);
  text-align: center;
  margin-bottom: $uni-spacing-sm;
}

.hero-amount-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: $uni-spacing-lg;
}

.hero-currency {
  font-size: 22px;
  font-weight: $uni-font-weight-semibold;
  color: rgba(255, 255, 255, 0.9);
  margin-right: 4px;
}

.hero-amount {
  font-size: 42px;
  font-weight: $uni-font-weight-bold;
  color: $uni-text-color-inverse;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}

// ── Stats bar ──
.hero-stats {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-md 0;
  margin-bottom: $uni-spacing-lg;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: $uni-font-size-base;
  font-weight: $uni-font-weight-semibold;
  color: $uni-text-color-inverse;
  margin-bottom: 4px;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: $uni-font-size-xs;
  color: rgba(255, 255, 255, 0.6);
}

.stat-divider {
  width: 1px;
  height: 28px;
  background-color: rgba(255, 255, 255, 0.15);
}

// ── Withdraw button ──
.hero-action {
  padding: 0 $uni-spacing-sm;
}

.withdraw-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $uni-text-color-inverse;
  border-radius: $uni-border-radius-pill;
  padding: $uni-spacing-sm 0;
  height: 48px;
  box-shadow: $uni-shadow-lg;

  &__text {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-color-primary;
  }
}

// ── Frozen tip ──
.frozen-tip {
  display: flex;
  align-items: center;
  gap: $uni-spacing-xs;
  padding: $uni-spacing-sm $uni-spacing-lg;
  background-color: rgba(255, 166, 0, 0.08);

  &__icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-color-warning;
    line-height: 1.5;
  }
}

// ── Section ──
.section {
  margin: $uni-spacing-md $uni-spacing-lg;
  background-color: $uni-bg-color;
  border-radius: $uni-border-radius-xl;
  box-shadow: $uni-shadow-sm;
  overflow: hidden;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $uni-spacing-md $uni-spacing-lg;
    border-bottom: 1rpx solid $uni-border-color-light;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: $uni-spacing-xs;
  }

  &__icon {
    font-size: 16px;
  }

  &__title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__action {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__action-text {
    font-size: $uni-font-size-sm;
    color: $uni-color-primary;
  }

  &__arrow {
    font-size: 18px;
    color: $uni-color-primary;
    font-weight: $uni-font-weight-medium;
  }
}

// ── Transaction list ──
.trans-list {
  padding: 0 $uni-spacing-lg;
}

.trans-item {
  display: flex;
  align-items: center;
  padding: $uni-spacing-md 0;
  border-bottom: 1rpx solid $uni-border-color-light;
  animation: fadeInUp $uni-duration-normal ease both;

  &:last-child {
    border-bottom: none;
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: $uni-border-radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $uni-spacing-md;
    flex-shrink: 0;

    &--income {
      background-color: rgba(76, 175, 80, 0.1);
    }
    &--expense {
      background-color: rgba($uni-color-primary, 0.1);
    }
    &--withdraw {
      background-color: rgba(33, 150, 243, 0.1);
    }
    &--refund {
      background-color: rgba(156, 39, 176, 0.1);
    }
    &--service_fee {
      background-color: rgba(96, 125, 139, 0.1);
    }
  }

  &__emoji {
    font-size: 20px;
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
    margin-bottom: 4px;
  }

  &__time {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-light;
  }

  &__amount {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    margin-left: $uni-spacing-sm;

    &--income {
      color: $uni-color-success;
    }
  }
}

// ── Empty block ──
.empty-block {
  padding: $uni-spacing-2xl $uni-spacing-lg;
  text-align: center;

  &__emoji {
    display: block;
    font-size: 48px;
    margin-bottom: $uni-spacing-md;
  }

  &__text {
    display: block;
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color-light;
    margin-bottom: $uni-spacing-xs;
  }

  &__sub {
    display: block;
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }
}

// ── Safe bottom ──
.safe-bottom {
  height: calc(env(safe-area-inset-bottom) + #{$uni-spacing-lg});
}
</style>
