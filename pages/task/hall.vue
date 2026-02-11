<template>
  <view class="hall">
    <!-- Filter bar: type tabs + community selector -->
    <view class="hall__filter anim-fade-in-down">
      <scroll-view scroll-x class="hall__type-scroll" :show-scrollbar="false">
        <view class="hall__type-list">
          <view
            v-for="item in typeFilters"
            :key="item.value"
            class="hall__type-tab"
            :class="{ 'hall__type-tab--active': currentType === item.value }"
            @tap="switchType(item.value)"
          >
            <text class="hall__type-tab-text">{{ item.label }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="hall__community-btn pressable" @tap="showCommunityPicker = true">
        <text class="hall__community-icon">📍</text>
        <text class="hall__community-text text-ellipsis">{{ currentCommunityLabel }}</text>
        <text class="hall__community-arrow">▾</text>
      </view>
    </view>

    <!-- Sort bar -->
    <view class="hall__sort anim-fade-in">
      <view
        v-for="item in sortOptions"
        :key="item.value"
        class="hall__sort-item"
        :class="{ 'hall__sort-item--active': currentSort === item.value }"
        @tap="switchSort(item.value)"
      >
        <text class="hall__sort-text">{{ item.label }}</text>
        <view v-if="currentSort === item.value" class="hall__sort-dot"></view>
      </view>
    </view>

    <!-- Task list -->
    <scroll-view
      scroll-y
      class="hall__scroll"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <!-- Skeleton loading -->
      <view v-if="loading && taskList.length === 0" class="hall__skeleton">
        <view v-for="i in 4" :key="i" class="skeleton-card"></view>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else-if="taskList.length === 0"
        type="task"
        action-text="换个条件试试"
        @action="resetFilters"
      />

      <!-- Task cards -->
      <view v-else class="hall__list">
        <TaskCard
          v-for="(task, index) in taskList"
          :key="task._id"
          :task="task"
          :show-description="true"
          :anim-index="index"
          @tap="goDetail"
        />
      </view>

      <!-- Load more indicator -->
      <view v-if="taskList.length > 0" class="hall__load-more">
        <view v-if="loading" class="hall__loading-indicator">
          <text class="hall__loading-dot">●</text>
          <text class="hall__loading-dot hall__loading-dot--delay1">●</text>
          <text class="hall__loading-dot hall__loading-dot--delay2">●</text>
        </view>
        <text v-else-if="!hasMore" class="hall__no-more">— 没有更多了 —</text>
      </view>
    </scroll-view>

    <!-- Community picker popup -->
    <view v-if="showCommunityPicker" class="hall__overlay" @tap="showCommunityPicker = false">
      <view class="hall__picker anim-fade-in-up" @tap.stop>
        <!-- Picker handle -->
        <view class="hall__picker-handle">
          <view class="hall__picker-handle-bar"></view>
        </view>

        <!-- Picker header -->
        <view class="hall__picker-header">
          <text class="hall__picker-title">选择小区</text>
          <view class="hall__picker-close pressable" @tap="showCommunityPicker = false">
            <text class="hall__picker-close-icon">✕</text>
          </view>
        </view>

        <!-- Picker options -->
        <scroll-view scroll-y class="hall__picker-scroll">
          <view
            class="hall__picker-item"
            :class="{ 'hall__picker-item--active': selectedCommunityId === '' }"
            @tap="selectCommunity('', '全部小区')"
          >
            <text class="hall__picker-item-icon">🌐</text>
            <text class="hall__picker-item-text">全部小区</text>
            <text v-if="selectedCommunityId === ''" class="hall__picker-check">✓</text>
          </view>
          <view
            v-for="c in userCommunities"
            :key="c.community_id"
            class="hall__picker-item"
            :class="{ 'hall__picker-item--active': selectedCommunityId === c.community_id }"
            @tap="selectCommunity(c.community_id, c.name)"
          >
            <text class="hall__picker-item-icon">🏘️</text>
            <text class="hall__picker-item-text">{{ c.name }}</text>
            <text v-if="selectedCommunityId === c.community_id" class="hall__picker-check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { formatDate, formatRelativeTime } from '@/utils/common'

const userStore = useUserStore()

// State
const loading = ref(false)
const refreshing = ref(false)
const taskList = ref<any[]>([])
const currentType = ref('all')
const currentSort = ref('newest')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(true)
const showCommunityPicker = ref(false)
const selectedCommunityId = ref('')
const selectedCommunityName = ref('全部小区')

// Filter configurations
const typeFilters = [
  { label: '全部', value: 'all' },
  { label: '📦 取快递', value: '取快递' },
  { label: '👶 接送小孩', value: '接送小孩' },
  { label: '🏥 陪诊', value: '陪诊' },
  { label: '📚 陪读', value: '陪读' },
  { label: '🗑️ 代扔垃圾', value: '代扔垃圾' },
  { label: '🐾 宠物喂养', value: '宠物喂养' },
  { label: '📋 其他', value: '其他' }
]

const sortOptions = [
  { label: '最新发布', value: 'newest' },
  { label: '报酬最高', value: 'reward_desc' },
  { label: '即将截止', value: 'deadline_asc' }
]

// Computed
const userCommunities = computed(() => userStore.communities || [])
const currentCommunityLabel = computed(() => selectedCommunityName.value)

// Lifecycle
onMounted(() => {
  loadTasks()
})

// Data loading
async function loadTasks(reset = true) {
  if (reset) {
    page.value = 1
    hasMore.value = true
  }
  loading.value = true
  try {
    const taskQuery = uniCloud.importObject('task-query')
    const communityIds = selectedCommunityId.value
      ? [selectedCommunityId.value]
      : userStore.communityIds

    const res = await taskQuery.getTaskList({
      community_ids: communityIds,
      task_type: currentType.value,
      status: 'pending',
      sort: currentSort.value,
      page: page.value,
      pageSize
    })

    if (reset) {
      taskList.value = res.data || []
    } else {
      taskList.value = [...taskList.value, ...(res.data || [])]
    }
    total.value = res.total || 0
    hasMore.value = taskList.value.length < total.value
  } catch (err: any) {
    console.error('Load tasks error:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// Filter & sort handlers
function switchType(type: string) {
  currentType.value = type
  loadTasks()
}

function switchSort(sort: string) {
  currentSort.value = sort
  loadTasks()
}

function selectCommunity(id: string, name: string) {
  selectedCommunityId.value = id
  selectedCommunityName.value = name
  showCommunityPicker.value = false
  loadTasks()
}

function resetFilters() {
  currentType.value = 'all'
  currentSort.value = 'newest'
  selectedCommunityId.value = ''
  selectedCommunityName.value = '全部小区'
  loadTasks()
}

// Scroll handlers
function onRefresh() {
  refreshing.value = true
  loadTasks()
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadTasks(false)
}

// Navigation
function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
.hall {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $uni-bg-color-grey;

  // ── Filter Bar ──
  &__filter {
    background-color: $uni-bg-color;
    padding: $uni-spacing-md $uni-spacing-base;
    display: flex;
    flex-direction: column;
    gap: $uni-spacing-sm;
  }

  &__type-scroll {
    white-space: nowrap;
  }

  &__type-list {
    display: inline-flex;
    gap: $uni-spacing-sm;
    padding: 2px 0;
  }

  &__type-tab {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border-radius: $uni-border-radius-pill;
    background-color: $uni-bg-color-tag;
    transition: $uni-transition-fast;
    flex-shrink: 0;

    &--active {
      background-color: $uni-color-primary-pale;

      .hall__type-tab-text {
        color: $uni-color-primary;
        font-weight: $uni-font-weight-semibold;
      }
    }
  }

  &__type-tab-text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    white-space: nowrap;
  }

  &__community-btn {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid $uni-border-color;
    border-radius: $uni-border-radius-pill;
    background-color: $uni-bg-color;
  }

  &__community-icon {
    font-size: 12px;
    line-height: 1;
  }

  &__community-text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color;
    max-width: 120px;
  }

  &__community-arrow {
    font-size: 10px;
    color: $uni-text-color-grey;
    line-height: 1;
  }

  // ── Sort Bar ──
  &__sort {
    display: flex;
    align-items: center;
    gap: $uni-spacing-lg;
    background-color: $uni-bg-color;
    padding: $uni-spacing-sm $uni-spacing-base;
    border-bottom: 1px solid $uni-border-color-light;
  }

  &__sort-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 4px 0;
    position: relative;
  }

  &__sort-text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    transition: $uni-transition-fast;

    .hall__sort-item--active & {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-semibold;
    }
  }

  &__sort-dot {
    width: 4px;
    height: 4px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-color-primary;
    animation: scaleIn $uni-animation-duration-base cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  // ── Scroll Area ──
  &__scroll {
    flex: 1;
  }

  &__skeleton {
    padding: $uni-spacing-md $uni-spacing-base;
  }

  &__list {
    padding: $uni-spacing-md $uni-spacing-base;
  }

  // ── Load More ──
  &__load-more {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $uni-spacing-lg 0 $uni-spacing-xxl;
  }

  &__loading-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__loading-dot {
    font-size: 8px;
    color: $uni-color-primary;
    animation: pulse 1s ease-in-out infinite;

    &--delay1 { animation-delay: 0.15s; }
    &--delay2 { animation-delay: 0.30s; }
  }

  &__no-more {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-disable;
  }

  // ── Community Picker Overlay ──
  &__overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: $uni-bg-color-mask;
    z-index: $uni-z-index-popup;
    display: flex;
    align-items: flex-end;
    animation: fadeIn $uni-animation-duration-fast ease-out both;
  }

  &__picker {
    width: 100%;
    background-color: $uni-bg-color;
    border-radius: $uni-border-radius-xl $uni-border-radius-xl 0 0;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    padding-bottom: constant(safe-area-inset-bottom);
    padding-bottom: env(safe-area-inset-bottom);
  }

  &__picker-handle {
    display: flex;
    justify-content: center;
    padding: $uni-spacing-sm 0;
  }

  &__picker-handle-bar {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background-color: $uni-border-color;
  }

  &__picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $uni-spacing-sm $uni-spacing-base $uni-spacing-md;
  }

  &__picker-title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__picker-close {
    width: 32px;
    height: 32px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-bg-color-grey;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__picker-close-icon {
    font-size: 14px;
    color: $uni-text-color-grey;
  }

  &__picker-scroll {
    flex: 1;
    padding: 0 $uni-spacing-base;
  }

  &__picker-item {
    display: flex;
    align-items: center;
    gap: $uni-spacing-md;
    padding: $uni-spacing-md 0;
    border-bottom: 1px solid $uni-border-color-light;
    transition: $uni-transition-fast;

    &:last-child {
      border-bottom: none;
    }

    &--active {
      .hall__picker-item-text {
        color: $uni-color-primary;
        font-weight: $uni-font-weight-semibold;
      }
    }

    &:active {
      background-color: $uni-bg-color-hover;
    }
  }

  &__picker-item-icon {
    font-size: 18px;
    line-height: 1;
  }

  &__picker-item-text {
    flex: 1;
    font-size: $uni-font-size-base;
    color: $uni-text-color;
    transition: $uni-transition-fast;
  }

  &__picker-check {
    font-size: $uni-font-size-base;
    color: $uni-color-primary;
    font-weight: $uni-font-weight-bold;
  }
}
</style>
