<template>
  <view class="my-tasks">
    <!-- Tab switcher -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ 'tab-item--active': currentTab === 'published' }"
        @tap="switchTab('published')"
      >
        <text class="tab-item__text">我发布的</text>
      </view>
      <view
        class="tab-item"
        :class="{ 'tab-item--active': currentTab === 'accepted' }"
        @tap="switchTab('accepted')"
      >
        <text class="tab-item__text">我接单的</text>
      </view>
      <!-- Animated indicator -->
      <view class="tab-bar__indicator" :class="{ 'tab-bar__indicator--right': currentTab === 'accepted' }"></view>
    </view>

    <!-- Status filter chips -->
    <scroll-view class="filter-bar" scroll-x :show-scrollbar="false">
      <view class="filter-bar__inner">
        <view
          class="filter-chip"
          :class="{ 'filter-chip--active': statusFilter === '' }"
          @tap="filterByStatus('')"
        >
          <text class="filter-chip__text">全部</text>
        </view>
        <view
          v-for="item in statusOptions"
          :key="item.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': statusFilter === item.value }"
          @tap="filterByStatus(item.value)"
        >
          <text class="filter-chip__text">{{ item.label }}</text>
          <view v-if="statusFilter === item.value" class="filter-chip__dot" :style="{ backgroundColor: getStatusColor(item.value) }"></view>
        </view>
      </view>
    </scroll-view>

    <!-- Task list -->
    <scroll-view
      class="task-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <!-- List content -->
      <view v-if="taskList.length > 0" class="task-list__content">
        <view
          v-for="(task, index) in taskList"
          :key="task._id"
          class="task-item animate-fade-in-up"
          :style="{ animationDelay: index * 0.05 + 's' }"
          @tap="goToDetail(task._id)"
        >
          <!-- Card top: type + status -->
          <view class="task-item__header">
            <view class="task-item__type" :style="{ backgroundColor: getTypeColor(task.type) + '15', color: getTypeColor(task.type) }">
              <text class="task-item__type-text">{{ task.type }}</text>
            </view>
            <view class="task-item__status" :class="'task-item__status--' + task.status">
              <view class="task-item__status-dot"></view>
              <text class="task-item__status-text">{{ getStatusLabel(task.status) }}</text>
            </view>
          </view>

          <!-- Title -->
          <text class="task-item__title">{{ task.title }}</text>

          <!-- Meta info -->
          <view class="task-item__meta">
            <view class="task-item__meta-item">
              <text class="task-item__meta-icon">📍</text>
              <text class="task-item__meta-text">{{ task.community_name || '未知小区' }}</text>
            </view>
            <view class="task-item__meta-item">
              <text class="task-item__meta-icon">🕐</text>
              <text class="task-item__meta-text">{{ formatTime(task.created_at) }}</text>
            </view>
          </view>

          <!-- Footer: reward + actions -->
          <view class="task-item__footer">
            <view class="task-item__reward">
              <text class="task-item__reward-symbol">¥</text>
              <text class="task-item__reward-value">{{ task.reward }}</text>
            </view>
            <view class="task-item__actions">
              <!-- Published tasks actions -->
              <template v-if="currentTab === 'published'">
                <view
                  v-if="task.status === 'waiting_confirm'"
                  class="task-item__action task-item__action--primary"
                  @tap.stop="confirmComplete(task)"
                >
                  <text class="task-item__action-text">✓ 确认完成</text>
                </view>
                <view
                  v-if="task.status === 'pending'"
                  class="task-item__action task-item__action--ghost"
                  @tap.stop="cancelTask(task)"
                >
                  <text class="task-item__action-text">取消任务</text>
                </view>
              </template>
              <!-- Accepted tasks actions -->
              <template v-if="currentTab === 'accepted'">
                <view
                  v-if="task.status === 'in_progress'"
                  class="task-item__action task-item__action--primary"
                  @tap.stop="submitComplete(task)"
                >
                  <text class="task-item__action-text">✓ 提交完成</text>
                </view>
              </template>
            </view>
          </view>
        </view>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else-if="!isLoading"
        :icon="currentTab === 'published' ? '📋' : '🤝'"
        :title="currentTab === 'published' ? '暂无发布的任务' : '暂无接单的任务'"
        :description="currentTab === 'published' ? '发布一个任务，让邻居来帮忙吧' : '去任务大厅看看有什么可以做的'"
        :actionText="currentTab === 'published' ? '去发布任务' : '浏览任务'"
        @action="currentTab === 'published' ? goPublish() : goHall()"
      />

      <!-- Loading more -->
      <view v-if="isLoading && taskList.length > 0" class="load-more">
        <view class="load-more__spinner"></view>
        <text class="load-more__text">加载中...</text>
      </view>
      <view v-if="noMore && taskList.length > 0" class="load-more">
        <view class="load-more__line"></view>
        <text class="load-more__text">没有更多了</text>
        <view class="load-more__line"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { TASK_STATUS, TASK_TYPE_COLORS, PLATFORM } from '@/utils/constants'
import { callCloudObject } from '@/utils/request'
import { formatRelativeTime, showConfirm } from '@/utils/common'

const currentTab = ref<'published' | 'accepted'>('published')
const statusFilter = ref('')
const taskList = ref<any[]>([])
const isLoading = ref(false)
const isRefreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = PLATFORM.PAGE_SIZE

const statusOptions = [
  { label: '待接单', value: TASK_STATUS.PENDING },
  { label: '进行中', value: TASK_STATUS.IN_PROGRESS },
  { label: '待确认', value: TASK_STATUS.WAITING_CONFIRM },
  { label: '已完成', value: TASK_STATUS.COMPLETED },
  { label: '已取消', value: TASK_STATUS.CANCELLED },
  { label: '申诉中', value: TASK_STATUS.DISPUTED }
]

// Status color mapping for visual indicators
function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: '#FF7A45',
    in_progress: '#1890ff',
    waiting_confirm: '#722ed1',
    completed: '#52c41a',
    cancelled: '#999999',
    disputed: '#f5222d'
  }
  return colorMap[status] || '#999999'
}

onShow(() => {
  refresh()
})

function switchTab(tab: 'published' | 'accepted') {
  if (currentTab.value === tab) return
  currentTab.value = tab
  refresh()
}

function filterByStatus(status: string) {
  statusFilter.value = status
  refresh()
}

async function refresh() {
  page.value = 1
  noMore.value = false
  taskList.value = []
  await loadTasks()
}

async function onRefresh() {
  isRefreshing.value = true
  await refresh()
  isRefreshing.value = false
}

async function loadMore() {
  if (isLoading.value || noMore.value) return
  page.value++
  await loadTasks()
}

async function loadTasks() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const result = await callCloudObject('user-center', 'getMyTasks', {
      type: currentTab.value,
      status: statusFilter.value,
      page: page.value,
      pageSize
    })

    const list = result?.data || []
    if (page.value === 1) {
      taskList.value = list
    } else {
      taskList.value = [...taskList.value, ...list]
    }

    if (list.length < pageSize) {
      noMore.value = true
    }
  } catch (e) {
    console.error('Load tasks error:', e)
  } finally {
    isLoading.value = false
  }
}

function getTypeColor(type: string): string {
  return TASK_TYPE_COLORS[type] || '#607d8b'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待接单',
    in_progress: '进行中',
    waiting_confirm: '待确认',
    completed: '已完成',
    cancelled: '已取消',
    disputed: '申诉中'
  }
  return map[status] || status
}

function formatTime(timestamp: number): string {
  return formatRelativeTime(timestamp)
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` })
}

function goPublish() {
  uni.switchTab({ url: '/pages/publish/index' })
}

function goHall() {
  uni.navigateTo({ url: '/pages/task/hall' })
}

async function confirmComplete(task: any) {
  const confirmed = await showConfirm('确认该任务已完成？确认后将支付报酬给接单人')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '处理中...' })
    await callCloudObject('task-flow', 'publisherConfirm', { task_id: task._id })
    uni.showToast({ title: '已确认完成', icon: 'success' })
    refresh()
  } catch (e) {
    console.error('Confirm error:', e)
  } finally {
    uni.hideLoading()
  }
}

async function cancelTask(task: any) {
  const confirmed = await showConfirm('确定要取消该任务吗？费用将原路退回')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '处理中...' })
    await callCloudObject('task-flow', 'cancelTask', { task_id: task._id })
    uni.showToast({ title: '已取消任务', icon: 'success' })
    refresh()
  } catch (e) {
    console.error('Cancel error:', e)
  } finally {
    uni.hideLoading()
  }
}

async function submitComplete(task: any) {
  const confirmed = await showConfirm('确认已完成该任务？提交后等待发布者确认')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '提交中...' })
await callCloudObject('task-flow', 'receiverConfirm', { task_id: task._id })
    uni.showToast({ title: '已提交完成', icon: 'success' })
    refresh()
  } catch (e) {
    console.error('Submit complete error:', e)
  } finally {
    uni.hideLoading()
  }
}
</script>

<style lang="scss" scoped>
.my-tasks {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
  display: flex;
  flex-direction: column;
}

// ══════════════════════════════════════════
// Tab Switcher
// ══════════════════════════════════════════
.tab-bar {
  display: flex;
  background-color: #fff;
  position: relative;
  border-bottom: 1rpx solid $uni-border-color-light;

  &__indicator {
    position: absolute;
    bottom: 0;
    left: 25%;
    width: 40px;
    height: 3px;
    border-radius: 3px;
    background: $brand-gradient;
    transform: translateX(-50%);
    transition: left $uni-transition-normal;

    &--right {
      left: 75%;
    }
  }
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $uni-spacing-md 0;
  transition: $uni-transition-fast;

  &__text {
    font-size: $uni-font-size-base;
    color: $uni-text-color-secondary;
    font-weight: $uni-font-weight-regular;
    transition: $uni-transition-fast;
  }

  &--active &__text {
    color: $uni-color-primary;
    font-weight: $uni-font-weight-semibold;
  }
}

// ══════════════════════════════════════════
// Filter Chips
// ══════════════════════════════════════════
.filter-bar {
  background-color: #fff;
  white-space: nowrap;

  &__inner {
    display: flex;
    padding: $uni-spacing-sm $uni-spacing-md;
    gap: $uni-spacing-sm;
  }
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: $uni-border-radius-pill;
  background-color: $uni-bg-color-page;
  flex-shrink: 0;
  transition: $uni-transition-fast;

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    transition: $uni-transition-fast;
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: $uni-border-radius-circle;
  }

  &--active {
    background-color: rgba($uni-color-primary, 0.1);

    .filter-chip__text {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-medium;
    }
  }

  &:active {
    transform: scale(0.95);
  }
}

// ══════════════════════════════════════════
// Task List
// ══════════════════════════════════════════
.task-list {
  flex: 1;
  height: 0;

  &__content {
    padding: $uni-spacing-md;
    display: flex;
    flex-direction: column;
    gap: $uni-spacing-sm;
  }
}

// ══════════════════════════════════════════
// Task Card Item
// ══════════════════════════════════════════
.task-item {
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-md;
  box-shadow: $uni-shadow-sm;
  transition: $uni-transition-fast;

  &:active {
    transform: scale(0.985);
    box-shadow: $uni-shadow-xs;
  }

  // ── Header: type + status ──
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $uni-spacing-sm;
  }

  &__type {
    padding: 3px 10px;
    border-radius: $uni-border-radius-pill;

    &-text {
      font-size: $uni-font-size-xs;
      font-weight: $uni-font-weight-medium;
    }
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 4px;

    &-dot {
      width: 6px;
      height: 6px;
      border-radius: $uni-border-radius-circle;
      background-color: #999;
    }

    &-text {
      font-size: $uni-font-size-xs;
      color: $uni-text-color-secondary;
    }

    // Status variants
    &--pending {
      .task-item__status-dot { background-color: #FF7A45; }
      .task-item__status-text { color: #FF7A45; }
    }
    &--in_progress {
      .task-item__status-dot { background-color: #1890ff; animation: pulse-dot 2s infinite; }
      .task-item__status-text { color: #1890ff; }
    }
    &--waiting_confirm {
      .task-item__status-dot { background-color: #722ed1; animation: pulse-dot 2s infinite; }
      .task-item__status-text { color: #722ed1; }
    }
    &--completed {
      .task-item__status-dot { background-color: #52c41a; }
      .task-item__status-text { color: #52c41a; }
    }
    &--cancelled {
      .task-item__status-dot { background-color: #999; }
      .task-item__status-text { color: #999; }
    }
    &--disputed {
      .task-item__status-dot { background-color: #f5222d; animation: pulse-dot 2s infinite; }
      .task-item__status-text { color: #f5222d; }
    }
  }

  // ── Title ──
  &__title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-sm;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  // ── Meta info ──
  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: $uni-spacing-md;
    margin-bottom: $uni-spacing-md;

    &-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &-icon {
      font-size: 12px;
      line-height: 1;
    }

    &-text {
      font-size: $uni-font-size-xs;
      color: $uni-text-color-placeholder;
      line-height: 1.2;
    }
  }

  // ── Footer: reward + actions ──
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: $uni-spacing-sm;
    border-top: 1rpx solid $uni-border-color-light;
  }

  &__reward {
    display: flex;
    align-items: baseline;
    gap: 2px;

    &-symbol {
      font-size: $uni-font-size-sm;
      font-weight: $uni-font-weight-bold;
      color: $uni-color-primary;
    }

    &-value {
      font-size: 22px;
      font-weight: $uni-font-weight-bold;
      color: $uni-color-primary;
      line-height: 1;
    }
  }

  &__actions {
    display: flex;
    gap: $uni-spacing-sm;
  }

  &__action {
    padding: 6px 16px;
    border-radius: $uni-border-radius-pill;
    transition: $uni-transition-fast;

    &-text {
      font-size: $uni-font-size-sm;
      font-weight: $uni-font-weight-medium;
    }

    &--primary {
      background: $brand-gradient;

      .task-item__action-text {
        color: #fff;
      }

      &:active {
        opacity: $uni-opacity-active;
        transform: scale(0.95);
      }
    }

    &--ghost {
      background-color: $uni-bg-color-page;

      .task-item__action-text {
        color: $uni-text-color-secondary;
      }

      &:active {
        background-color: $uni-bg-color-hover;
        transform: scale(0.95);
      }
    }
  }
}

// ══════════════════════════════════════════
// Load More
// ══════════════════════════════════════════
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
    border-radius: $uni-border-radius-circle;
    animation: spin 0.8s linear infinite;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }

  &__line {
    width: 32px;
    height: 1px;
    background-color: $uni-border-color-light;
  }
}

// ══════════════════════════════════════════
// Animations
// ══════════════════════════════════════════
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.4); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
