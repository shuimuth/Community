<template>
  <view class="index-page">
    <!-- Custom Header: Location + Search -->
    <PageHeader mode="search" :show-back="false" placeholder="搜索任务..." @search="goSearch">
      <template #left>
        <view class="index-location pressable" @tap="goManageCommunity">
          <text class="index-location__icon">📍</text>
          <text class="index-location__text text-ellipsis">{{ currentCommunityName }}</text>
          <text class="index-location__arrow">›</text>
        </view>
      </template>
    </PageHeader>

    <!-- Category filter tabs -->
    <view class="index-tabs">
      <scroll-view scroll-x :show-scrollbar="false" class="index-tabs__scroll">
        <view class="index-tabs__inner">
          <view
            v-for="item in typeFilters"
            :key="item.value"
            class="index-tabs__item"
            :class="{ 'index-tabs__item--active': currentType === item.value }"
            @tap="switchType(item.value)"
          >
            <text class="index-tabs__icon">{{ item.icon }}</text>
            <text class="index-tabs__label">{{ item.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Task list area -->
    <scroll-view
      scroll-y
      class="index-list"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <!-- Skeleton loading state -->
      <view v-if="loading && taskList.length === 0" class="index-list__skeleton">
        <view v-for="i in 4" :key="i" class="skeleton-card" :style="{ animationDelay: `${i * 0.1}s` }"></view>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else-if="taskList.length === 0"
        type="task"
        action-text="去发布任务"
        action-type="primary"
        @action="goPublish"
      />

      <!-- Task card list -->
      <view v-else class="index-list__content">
        <TaskCard
          v-for="(task, idx) in taskList"
          :key="task._id"
          :task="task"
          :anim-index="idx"
          show-description
          @tap="goDetail(task._id)"
        />
      </view>

      <!-- Load more -->
      <view v-if="taskList.length > 0" class="index-list__footer">
        <view v-if="loading" class="index-load-more">
          <text class="index-load-more__text">加载中...</text>
        </view>
        <view v-else-if="!hasMore" class="index-load-more">
          <view class="index-load-more__line"></view>
          <text class="index-load-more__text">没有更多了</text>
          <view class="index-load-more__line"></view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/user'
import { formatDate, formatRelativeTime } from '@/utils/common'

const userStore = useUserStore()

// ── State ──
const loading = ref(false)
const refreshing = ref(false)
const taskList = ref<any[]>([])
const currentType = ref('all')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(true)

// ── Category filters with emoji icons ──
const typeFilters = [
  { label: '全部', value: 'all', icon: '🏠' },
  { label: '取快递', value: '取快递', icon: '📦' },
  { label: '接送小孩', value: '接送小孩', icon: '👶' },
  { label: '陪诊', value: '陪诊', icon: '🏥' },
  { label: '陪读', value: '陪读', icon: '📚' },
  { label: '代扔垃圾', value: '代扔垃圾', icon: '🗑️' },
  { label: '宠物喂养', value: '宠物喂养', icon: '🐾' },
  { label: '其他', value: '其他', icon: '📋' }
]

// ── Computed ──
const currentCommunityName = computed(() => {
  return userStore.currentCommunityName
})

// ── Lifecycle ──
onMounted(() => {
  loadTasks()
  // Listen for community change event
  uni.$on('community-changed', () => {
    loadTasks()
  })
})

onUnmounted(() => {
  uni.$off('community-changed')
})

// ── Data loading ──
async function loadTasks(reset = true) {
  if (reset) {
    page.value = 1
    hasMore.value = true
  }

  loading.value = true
  try {
    const taskQuery = uniCloud.importObject('task-query')
    // Use current community if only one is selected, otherwise use all communities
    const communityIds = userStore.currentCommunity 
      ? [userStore.currentCommunity._id] 
      : userStore.communityIds
    
    const res = await taskQuery.getTaskList({
      community_ids: communityIds,
      task_type: currentType.value,
      status: 'pending',
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
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// ── Actions ──
function switchType(type: string) {
  currentType.value = type
  loadTasks()
}

function onRefresh() {
  refreshing.value = true
  loadTasks()
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadTasks(false)
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/task/search' })
}

function goManageCommunity() {
  uni.navigateTo({ url: '/pages/community/manage' })
}

function goPublish() {
  uni.switchTab({ url: '/pages/publish/index' })
}
</script>

<style lang="scss" scoped>
.index-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* ── Location selector ── */
.index-location {
  display: flex;
  align-items: center;
  gap: 2px;
  max-width: 120px;

  &__icon {
    font-size: 14px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    max-width: 80px;
  }

  &__arrow {
    font-size: 16px;
    color: $uni-text-color-grey;
    margin-left: -2px;
  }
}

/* ── Category tabs ── */
.index-tabs {
  background-color: $uni-bg-color;
  padding: $uni-spacing-sm 0;
  box-shadow: 0 1px 0 $uni-border-color-light;

  &__scroll {
    white-space: nowrap;
  }

  &__inner {
    display: inline-flex;
    gap: $uni-spacing-sm;
    padding: 0 $uni-spacing-base;
  }

  &__item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: $uni-spacing-sm $uni-spacing-md;
    border-radius: $uni-border-radius-base;
    background-color: $uni-bg-color-grey;
    transition: $uni-transition-fast;
    flex-shrink: 0;

    &--active {
      background-color: $uni-color-primary-pale;
      box-shadow: inset 0 0 0 1px rgba(255, 122, 69, 0.15);

      .index-tabs__label {
        color: $uni-color-primary;
        font-weight: $uni-font-weight-semibold;
      }
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &__icon {
    font-size: 18px;
    line-height: 1.2;
  }

  &__label {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
    line-height: 1.2;
    white-space: nowrap;
  }
}

/* ── Task list area ── */
.index-list {
  flex: 1;
  padding: $uni-spacing-md $uni-spacing-base;

  &__skeleton {
    display: flex;
    flex-direction: column;
    gap: $uni-spacing-md;
  }

  &__content {
    // TaskCard handles its own margin
  }

  &__footer {
    padding: $uni-spacing-lg 0 $uni-spacing-xl;
  }
}

/* ── Load more indicator ── */
.index-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-md;
  padding: $uni-spacing-sm 0;

  &__line {
    width: 32px;
    height: 1px;
    background-color: $uni-border-color-light;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-disable;
  }
}
</style>