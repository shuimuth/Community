<template>
  <view class="transactions-page">
    <!-- Sticky tab filter -->
    <view class="tab-bar">
      <view class="tab-bar__inner">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-pill"
          :class="{ 'tab-pill--active': currentTab === tab.value }"
          @tap="switchTab(tab.value)"
        >
          <text class="tab-pill__icon">{{ tab.icon }}</text>
          <text class="tab-pill__text">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- Transaction list -->
    <scroll-view
      class="trans-scroll"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view v-if="list.length > 0" class="trans-body">
        <!-- Grouped by date -->
        <template v-for="(group, index) in groupedList" :key="index">
          <view class="date-divider">
            <view class="date-divider__line"></view>
            <text class="date-divider__text">{{ group.date }}</text>
            <view class="date-divider__line"></view>
          </view>

          <view
            v-for="(item, idx) in group.items"
            :key="item._id"
            class="trans-card animate-fade-in-up"
            :style="{ animationDelay: idx * 0.05 + 's' }"
          >
            <!-- Type icon -->
            <view class="trans-card__icon" :class="'trans-card__icon--' + item.type">
              <text class="trans-card__emoji">{{ getTransEmoji(item.type) }}</text>
            </view>

            <!-- Info -->
            <view class="trans-card__info">
              <text class="trans-card__title">{{ getTransTitle(item) }}</text>
              <text class="trans-card__desc" v-if="item.description">{{ item.description }}</text>
              <view class="trans-card__meta">
                <text class="trans-card__time">{{ formatTime(item.created_at) }}</text>
                <view
                  v-if="item.type === 'withdraw' && getWithdrawStatus(item.status)"
                  class="trans-card__status"
                  :class="'trans-card__status--' + item.status"
                >
                  <text class="trans-card__status-text">{{ getWithdrawStatus(item.status) }}</text>
                </view>
              </view>
            </view>

            <!-- Amount -->
            <view class="trans-card__amount" :class="{ 'trans-card__amount--income': isIncome(item.type) }">
              <text class="trans-card__amount-text">
                {{ isIncome(item.type) ? '+' : '-' }}¥{{ formatAmount(item.amount) }}
              </text>
            </view>
          </view>
        </template>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else-if="!isLoading"
        icon="📋"
        title="暂无交易记录"
        :description="currentTab ? '该分类下暂无记录' : '完成任务后交易记录将在这里显示'"
      />

      <!-- Loading more -->
      <view v-if="isLoading && list.length > 0" class="load-more">
        <view class="load-more__spinner"></view>
        <text class="load-more__text">加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="load-more">
        <text class="load-more__text">— 没有更多了 —</text>
      </view>

      <!-- Bottom safe area -->
      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { callCloudObject } from '@/utils/request'
import { TRANSACTION_TYPES, PLATFORM } from '@/utils/constants'

const tabs = [
  { label: '全部', value: '', icon: '📊' },
  { label: '收入', value: 'income', icon: '💰' },
  { label: '支出', value: 'expense', icon: '💳' },
  { label: '提现', value: 'withdraw', icon: '🏦' }
]

const currentTab = ref('')
const list = ref<any[]>([])
const isLoading = ref(false)
const isRefreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = PLATFORM.PAGE_SIZE

// Group transactions by date
const groupedList = computed(() => {
  const groups: { date: string; items: any[] }[] = []
  const map = new Map<string, any[]>()

  for (const item of list.value) {
    const date = formatDateKey(item.created_at)
    if (!map.has(date)) {
      map.set(date, [])
    }
    map.get(date)!.push(item)
  }

  map.forEach((items, date) => {
    groups.push({ date, items })
  })

  return groups
})

onShow(() => {
  refresh()
})

function switchTab(tab: string) {
  if (currentTab.value === tab) return
  currentTab.value = tab
  refresh()
}

async function refresh() {
  page.value = 1
  noMore.value = false
  list.value = []
  await loadTransactions()
}

async function onRefresh() {
  isRefreshing.value = true
  await refresh()
  isRefreshing.value = false
}

async function loadMore() {
  if (isLoading.value || noMore.value) return
  page.value++
  await loadTransactions()
}

async function loadTransactions() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const result = await callCloudObject('user-center', 'getTransactions', {
      type: currentTab.value,
      page: page.value,
      pageSize
    })

    const data = result?.data || []
    if (page.value === 1) {
      list.value = data
    } else {
      list.value = [...list.value, ...data]
    }

    if (data.length < pageSize) {
      noMore.value = true
    }
  } catch (e) {
    console.error('Load transactions error:', e)
  } finally {
    isLoading.value = false
  }
}

function formatDateKey(timestamp: number): string {
  if (!timestamp) return '未知'
  const d = new Date(timestamp)
  const now = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  if (y === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
    return '今天'
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (y === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) {
    return '昨天'
  }

  return y === now.getFullYear() ? `${m}-${day}` : `${y}-${m}-${day}`
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatAmount(val: number): string {
  return (val || 0).toFixed(2)
}

function isIncome(type: string): boolean {
  return type === TRANSACTION_TYPES.INCOME || type === TRANSACTION_TYPES.REFUND
}

function getTransEmoji(type: string): string {
  const map: Record<string, string> = {
    income: '💰',
    expense: '💳',
    withdraw: '🏦',
    refund: '↩️',
    service_fee: '📋'
  }
  return map[type] || '📌'
}

function getTransIcon(type: string): string {
  const map: Record<string, string> = {
    income: 'download',
    expense: 'upload',
    withdraw: 'wallet',
    refund: 'redo',
    service_fee: 'paperplane'
  }
  return map[type] || 'circle'
}

function getTransTitle(item: any): string {
  const map: Record<string, string> = {
    income: '任务报酬收入',
    expense: '任务发布支付',
    withdraw: '余额提现',
    refund: '任务取消退款',
    service_fee: '平台服务费'
  }
  return map[item.type] || '交易记录'
}

function getWithdrawStatus(status: string): string {
  const map: Record<string, string> = {
    pending: '审核中',
    approved: '已通过',
    rejected: '已拒绝',
    paid: '已到账',
    failed: '失败'
  }
  return map[status] || ''
}
</script>

<style lang="scss" scoped>
.transactions-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  display: flex;
  flex-direction: column;
}

// ── Tab bar ──
.tab-bar {
  background-color: $uni-bg-color;
  padding: $uni-spacing-sm $uni-spacing-md;
  border-bottom: 1rpx solid $uni-border-color-light;
  position: sticky;
  top: 0;
  z-index: $uni-z-index-sticky;

  &__inner {
    display: flex;
    gap: $uni-spacing-sm;
    background-color: $uni-bg-color-grey;
    border-radius: $uni-border-radius-pill;
    padding: 4px;
  }
}

.tab-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: $uni-spacing-sm 0;
  border-radius: $uni-border-radius-pill;
  transition: $uni-transition-normal;

  &__icon {
    font-size: 14px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    font-weight: $uni-font-weight-regular;
    transition: $uni-transition-normal;
  }

  &--active {
    background-color: $uni-bg-color;
    box-shadow: $uni-shadow-sm;

    .tab-pill__text {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-semibold;
    }
  }
}

// ── Scroll area ──
.trans-scroll {
  flex: 1;
  height: 0;
}

.trans-body {
  padding: $uni-spacing-sm $uni-spacing-md;
}

// ── Date divider ──
.date-divider {
  display: flex;
  align-items: center;
  gap: $uni-spacing-md;
  padding: $uni-spacing-md 0 $uni-spacing-sm;

  &__line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, $uni-border-color-light, transparent);
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
    font-weight: $uni-font-weight-medium;
    letter-spacing: 1px;
  }
}

// ── Transaction card ──
.trans-card {
  display: flex;
  align-items: center;
  padding: $uni-spacing-md;
  background-color: $uni-bg-color;
  border-radius: $uni-border-radius-lg;
  margin-bottom: $uni-spacing-sm;
  transition: $uni-transition-fast;
  box-shadow: $uni-shadow-sm;

  &:active {
    transform: scale(0.98);
    background-color: $uni-bg-color-hover;
  }

  // ── Type icon ──
  &__icon {
    width: 44px;
    height: 44px;
    border-radius: $uni-border-radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $uni-spacing-md;
    flex-shrink: 0;

    &--income {
      background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
    }
    &--expense {
      background: linear-gradient(135deg, #fff3e0, #ffe0b2);
    }
    &--withdraw {
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
    }
    &--refund {
      background: linear-gradient(135deg, #f3e5f5, #e1bee7);
    }
    &--service_fee {
      background: linear-gradient(135deg, #eceff1, #cfd8dc);
    }
  }

  &__emoji {
    font-size: 22px;
    line-height: 1;
  }

  // ── Info ──
  &__info {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
    display: block;
    line-height: 1.3;
  }

  &__desc {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
    display: block;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $uni-spacing-xs;
    margin-top: 4px;
  }

  &__time {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }

  &__status {
    padding: 1px 6px;
    border-radius: $uni-border-radius-pill;
    font-size: 10px;

    &--pending {
      background-color: rgba($uni-color-warning, 0.1);
      .trans-card__status-text { color: $uni-color-warning; }
    }
    &--approved, &--paid {
      background-color: rgba($uni-color-success, 0.1);
      .trans-card__status-text { color: $uni-color-success; }
    }
    &--rejected, &--failed {
      background-color: rgba($uni-color-error, 0.1);
      .trans-card__status-text { color: $uni-color-error; }
    }
  }

  &__status-text {
    font-size: 10px;
    font-weight: $uni-font-weight-medium;
  }

  // ── Amount ──
  &__amount {
    text-align: right;
    margin-left: $uni-spacing-sm;
    flex-shrink: 0;

    &-text {
      font-size: $uni-font-size-lg;
      font-weight: $uni-font-weight-bold;
      color: $uni-text-color;
      font-variant-numeric: tabular-nums;
    }

    &--income .trans-card__amount-text {
      color: $uni-color-success;
    }
  }
}

// ── Loading more ──
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-sm;
  padding: $uni-spacing-lg 0;

  &__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid $uni-border-color-light;
    border-top-color: $uni-color-primary;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ── Safe bottom ──
.safe-bottom {
  height: calc(env(safe-area-inset-bottom) + #{$uni-spacing-lg});
}
</style>
