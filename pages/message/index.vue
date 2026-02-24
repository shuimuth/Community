<template>
  <view class="msg-page">
    <!-- Top header bar -->
    <view class="msg-page__header">
      <view class="msg-page__header-top flex-between">
        <text class="msg-page__title">消息</text>
        <view
          v-if="hasUnread"
          class="msg-page__mark-read pressable"
          @tap="markAllRead"
        >
          <text class="msg-page__mark-read-text">全部已读</text>
        </view>
      </view>

      <!-- Category tabs -->
      <scroll-view class="msg-page__tabs" scroll-x :show-scrollbar="false">
        <view class="msg-page__tabs-inner">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="msg-page__tab"
            :class="{ 'msg-page__tab--active': activeTab === tab.key }"
            @tap="switchTab(tab.key)"
          >
            <text class="msg-page__tab-text">{{ tab.label }}</text>
            <view v-if="tab.count > 0" class="msg-page__tab-badge">
              <text class="msg-page__tab-badge-text">{{ tab.count > 99 ? '99+' : tab.count }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Message list -->
    <scroll-view
      class="msg-page__list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view v-if="filteredMessages.length > 0" class="msg-page__list-inner">
        <view
          v-for="(msg, index) in filteredMessages"
          :key="msg._id"
          class="msg-card anim-fade-in-up"
          :class="{ 'msg-card--unread': !msg.is_read }"
          :style="{ animationDelay: index * 0.04 + 's' }"
          @tap="onMessageTap(msg)"
        >
          <!-- Icon -->
          <view class="msg-card__icon" :class="getIconColorClass(msg.type)">
            <text class="msg-card__icon-emoji">{{ getIconEmoji(msg.type) }}</text>
          </view>

          <!-- Content -->
          <view class="msg-card__content">
            <view class="msg-card__header">
              <text class="msg-card__title text-ellipsis">{{ msg.title }}</text>
              <text class="msg-card__time">{{ formatTime(msg.created_at) }}</text>
            </view>
            <text class="msg-card__body text-ellipsis">{{ msg.content }}</text>
          </view>

          <!-- Unread indicator -->
          <view v-if="!msg.is_read" class="msg-card__dot"></view>
        </view>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else-if="!loading"
        type="message"
        size="large"
        :title="emptyTitle"
        :description="emptyDesc"
      />

      <!-- Load more -->
      <view v-if="filteredMessages.length > 0" class="msg-page__load-more">
        <uni-load-more :status="loadMoreStatus" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { formatRelativeTime } from '@/utils/common'
import { callCloudObject } from '@/utils/request'
import { useAppStore } from '@/store/app'
import { PLATFORM } from '@/utils/constants'

const appStore = useAppStore()

// ── Tab definitions ──
const tabs = ref([
  { key: 'all', label: '全部', count: 0 },
  { key: 'task', label: '任务', count: 0 },
  { key: 'finance', label: '财务', count: 0 },
  { key: 'system', label: '系统', count: 0 }
])
const activeTab = ref('all')

// ── Data state ──
const messageList = ref<any[]>([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const hasMore = ref(true)
const pageSize = PLATFORM.PAGE_SIZE

// ── Computed ──
const hasUnread = computed(() => {
  return messageList.value.some(m => !m.is_read)
})

const loadMoreStatus = computed(() => {
  if (loading.value) return 'loading'
  if (!hasMore.value) return 'noMore'
  return 'more'
})

// Filter messages by active tab category
const filteredMessages = computed(() => {
  if (activeTab.value === 'all') return messageList.value
  return messageList.value.filter(m => getCategory(m.type) === activeTab.value)
})

const emptyTitle = computed(() => {
  const map: Record<string, string> = {
    all: '暂无消息',
    task: '暂无任务消息',
    finance: '暂无财务消息',
    system: '暂无系统消息'
  }
  return map[activeTab.value] || '暂无消息'
})

const emptyDesc = computed(() => {
  const map: Record<string, string> = {
    all: '互动消息会出现在这里',
    task: '接单和发布的任务动态将显示在这里',
    finance: '提现和收入通知将显示在这里',
    system: '平台公告和通知将显示在这里'
  }
  return map[activeTab.value] || ''
})

// ── Category helpers ──
function getCategory(type: string): string {
  const taskTypes = ['task_accepted', 'task_completed', 'task_cancelled', 'task_confirmed']
  const financeTypes = ['withdraw_result']
  if (taskTypes.includes(type)) return 'task'
  if (financeTypes.includes(type)) return 'finance'
  return 'system'
}

// Update tab unread counts
function updateTabCounts() {
  let task = 0, finance = 0, system = 0
  messageList.value.forEach(m => {
    if (!m.is_read) {
      const cat = getCategory(m.type)
      if (cat === 'task') task++
      else if (cat === 'finance') finance++
      else system++
    }
  })
  tabs.value[0].count = task + finance + system
  tabs.value[1].count = task
  tabs.value[2].count = finance
  tabs.value[3].count = system
}

function switchTab(key: string) {
  activeTab.value = key
}

// ── Icon helpers ──
function getIconEmoji(type: string): string {
  const map: Record<string, string> = {
    task_accepted: '🤝',
    task_completed: '✅',
    task_cancelled: '❌',
    task_confirmed: '🎉',
    withdraw_result: '💰',
    review_received: '⭐',
    system: '📢'
  }
  return map[type] || '📬'
}

function getIconColorClass(type: string): string {
  const map: Record<string, string> = {
    task_accepted: 'msg-card__icon--primary',
    task_completed: 'msg-card__icon--success',
    task_cancelled: 'msg-card__icon--error',
    task_confirmed: 'msg-card__icon--success',
    withdraw_result: 'msg-card__icon--warning',
    review_received: 'msg-card__icon--warning',
    system: 'msg-card__icon--info'
  }
  return map[type] || 'msg-card__icon--info'
}

function formatTime(time: string | number): string {
  return formatRelativeTime(time)
}

// ── Actions ──
async function onMessageTap(msg: any) {
  if (!msg.is_read) {
    try {
      await callCloudObject('notification-service', 'markAsRead', { message_id: msg._id })
      msg.is_read = true
      appStore.setUnreadMessageCount(Math.max(0, appStore.unreadMessageCount - 1))
      updateTabCounts()
    } catch (e) {
      console.error('Mark message read error:', e)
    }
  }
  if (msg.related_id && msg.related_type === 'task') {
    uni.navigateTo({ url: `/pages/task/detail?id=${msg.related_id}` })
  }
}

async function markAllRead() {
  try {
    await callCloudObject('notification-service', 'markAllAsRead')
    messageList.value.forEach(m => { m.is_read = true })
    appStore.setUnreadMessageCount(0)
    updateTabCounts()
    uni.showToast({ title: '已全部标为已读', icon: 'success' })
  } catch (e) {
    console.error('Mark all read error:', e)
  }
}

async function loadMessages() {
  if (loading.value) return
  loading.value = true

  try {
    const result = await callCloudObject('notification-service', 'getMessages', {
      page: page.value,
      pageSize
    })

    const data = result?.data || []
    if (page.value === 1) {
      messageList.value = data
    } else {
      messageList.value.push(...data)
    }
    hasMore.value = data.length >= pageSize
    updateTabCounts()
  } catch (e) {
    console.error('Load messages error:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadUnreadCount() {
  try {
    const result = await callCloudObject('notification-service', 'getUnreadCount')
    appStore.setUnreadMessageCount(result?.count || 0)
  } catch (e) {
    console.error('Load unread count error:', e)
  }
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await loadMessages()
}

async function onLoadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  await loadMessages()
}

onShow(() => {
  page.value = 1
  loadMessages()
  loadUnreadCount()
})
</script>

<style lang="scss" scoped>
/* ============================================================
   Message Page — Warm Orange Design System v2.0
   ============================================================ */

.msg-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: $uni-bg-color-grey;

  // ── Header ──
  &__header {
    background-color: $uni-bg-color;
    padding-top: $uni-spacing-md;
    box-shadow: $uni-shadow-sm;
    position: sticky;
    top: 0;
    z-index: $uni-z-index-sticky;
  }

  &__header-top {
    padding: 0 $uni-spacing-base $uni-spacing-md;
  }

  &__title {
    font-size: $uni-font-size-xxl;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
  }

  &__mark-read {
    padding: $uni-spacing-xs $uni-spacing-md;
    background-color: $uni-color-primary-pale;
    border-radius: $uni-border-radius-pill;
  }

  &__mark-read-text {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-medium;
    color: $uni-color-primary;
  }

  // ── Category Tabs ──
  &__tabs {
    white-space: nowrap;
  }

  &__tabs-inner {
    display: flex;
    padding: 0 $uni-spacing-base $uni-spacing-md;
    gap: $uni-spacing-sm;
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: $uni-spacing-sm $uni-spacing-base;
    border-radius: $uni-border-radius-pill;
    background-color: $uni-bg-color-grey;
    transition: $uni-transition-fast;
    flex-shrink: 0;

    &--active {
      background: $brand-gradient;

      .msg-page__tab-text {
        color: $uni-text-color-inverse;
        font-weight: $uni-font-weight-semibold;
      }

      .msg-page__tab-badge {
        background-color: rgba(255, 255, 255, 0.3);
      }

      .msg-page__tab-badge-text {
        color: $uni-text-color-inverse;
      }
    }
  }

  &__tab-text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    line-height: 1.2;
  }

  &__tab-badge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: $uni-border-radius-pill;
    background-color: $uni-color-error;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__tab-badge-text {
    font-size: 10px;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color-inverse;
    line-height: 1;
  }

  // ── List ──
  &__list {
    flex: 1;
  }

  &__list-inner {
    padding: $uni-spacing-md;
  }

  &__load-more {
    padding-bottom: $uni-spacing-lg;
  }
}

/* ── Message Card ─────────────────────────────────────────── */
.msg-card {
  display: flex;
  align-items: center;
  gap: $uni-spacing-md;
  padding: $uni-spacing-base;
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-lg;
  margin-bottom: $uni-spacing-sm;
  box-shadow: $uni-shadow-card;
  transition: $uni-transition-fast;
  position: relative;

  &:active {
    transform: scale(0.985);
    box-shadow: $uni-shadow-sm;
  }

  // Unread state: warm tinted background
  &--unread {
    background-color: $uni-color-primary-pale;
    border-left: 3px solid $uni-color-primary;
  }

  // ── Icon ──
  &__icon {
    width: 44px;
    height: 44px;
    border-radius: $uni-border-radius-base;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--primary { background-color: $uni-color-primary-pale; }
    &--success { background-color: $uni-color-success-pale; }
    &--warning { background-color: $uni-color-warning-pale; }
    &--error   { background-color: $uni-color-error-pale; }
    &--info    { background-color: $uni-bg-color-grey; }
  }

  &__icon-emoji {
    font-size: 22px;
    line-height: 1;
  }

  // ── Content ──
  &__content {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
    gap: $uni-spacing-sm;
  }

  &__title {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    flex: 1;
    min-width: 0;
  }

  &__time {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-disable;
    flex-shrink: 0;
  }

  &__body {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    line-height: $uni-line-height-base;
    display: block;
    width: 100%;
  }

  // ── Unread dot ──
  &__dot {
    width: 8px;
    height: 8px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-color-primary;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(255, 122, 69, 0.15);
  }
}
</style>
