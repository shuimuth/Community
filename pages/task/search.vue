<template>
  <view class="search-page">
    <!-- Sticky search header -->
    <view class="search-header">
      <view class="search-header__bar">
        <view class="search-header__back pressable" @tap="goBack">
          <text class="search-header__back-icon">‹</text>
        </view>
        <view class="search-header__input-wrap">
          <text class="search-header__icon">🔍</text>
          <input
            v-model="keyword"
            class="search-header__input"
            placeholder="搜索任务标题或描述"
            placeholder-class="search-header__placeholder"
            :focus="true"
            confirm-type="search"
            @confirm="doSearch()"
          />
          <view
            v-if="keyword"
            class="search-header__clear pressable"
            @tap="keyword = ''; doSearch()"
          >
            <text class="search-header__clear-icon">✕</text>
          </view>
        </view>
        <view class="search-header__action pressable" @tap="doSearch()">
          <text class="search-header__action-text">搜索</text>
        </view>
      </view>
    </view>

    <!-- Filter panel -->
    <view class="filter-panel">
      <!-- Type filter chips -->
      <scroll-view scroll-x class="filter-chips" :show-scrollbar="false">
        <view class="filter-chips__inner">
          <view
            v-for="item in typeFilters"
            :key="item.value"
            class="filter-chip"
            :class="{ 'filter-chip--active': selectedType === item.value }"
            @tap="selectedType = item.value; doSearch()"
          >
            <text class="filter-chip__text">{{ item.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- Expandable advanced filters -->
      <view class="filter-advanced" :class="{ 'filter-advanced--open': showAdvanced }">
        <view class="filter-toggle pressable" @tap="showAdvanced = !showAdvanced">
          <text class="filter-toggle__text">高级筛选</text>
          <text class="filter-toggle__arrow">{{ showAdvanced ? '▲' : '▼' }}</text>
        </view>

        <view v-if="showAdvanced" class="filter-advanced__body anim-fade-in-up">
          <!-- Community filter -->
          <view class="filter-field">
            <text class="filter-field__label">小区</text>
            <picker
              :range="communityOptions"
              range-key="name"
              :value="communityIndex"
              @change="onCommunityFilter"
            >
              <view class="filter-field__picker">
                <text class="filter-field__picker-text">
                  {{ selectedCommunityName || '全部小区' }}
                </text>
                <text class="filter-field__picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- Reward range -->
          <view class="filter-field">
            <text class="filter-field__label">报酬范围</text>
            <view class="filter-field__range">
              <view class="range-input-wrap">
                <text class="range-input-prefix">¥</text>
                <input
                  v-model="minReward"
                  type="number"
                  placeholder="最低"
                  class="range-input"
                  @blur="doSearch()"
                />
              </view>
              <view class="range-divider"></view>
              <view class="range-input-wrap">
                <text class="range-input-prefix">¥</text>
                <input
                  v-model="maxReward"
                  type="number"
                  placeholder="最高"
                  class="range-input"
                  @blur="doSearch()"
                />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Results section -->
    <view class="results">
      <!-- Results count bar -->
      <view v-if="searched && taskList.length > 0" class="results__header anim-fade-in">
        <text class="results__count">找到 <text class="results__count-num">{{ total }}</text> 个任务</text>
      </view>

      <!-- Loading skeleton -->
      <view v-if="loading && taskList.length === 0" class="results__skeleton">
        <view v-for="i in 3" :key="i" class="skeleton-card"></view>
      </view>

      <!-- Empty states -->
      <EmptyState
        v-else-if="taskList.length === 0 && searched"
        type="search"
        action-text="清除筛选"
        action-type="outline"
        size="compact"
        @action="resetFilters"
      />

      <view v-else-if="taskList.length === 0 && !searched" class="results__hint">
        <view class="results__hint-icon">🔍</view>
        <text class="results__hint-title">搜索社区任务</text>
        <text class="results__hint-desc">输入关键词，发现身边的互助需求</text>

        <!-- Hot search suggestions -->
        <view v-if="hotKeywords.length" class="hot-keywords">
          <text class="hot-keywords__title">热门搜索</text>
          <view class="hot-keywords__list">
            <view
              v-for="(kw, idx) in hotKeywords"
              :key="idx"
              class="hot-keywords__item pressable"
              @tap="keyword = kw; doSearch()"
            >
              <text class="hot-keywords__text">{{ kw }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Task list -->
      <view v-else class="results__list">
        <TaskCard
          v-for="(task, index) in taskList"
          :key="task._id"
          :task="task"
          show-description
          :anim-index="index"
          @tap="goDetail"
        />
      </view>

      <!-- Load more -->
      <view v-if="taskList.length > 0" class="results__loadmore">
        <view v-if="loading" class="loadmore-loading">
          <view class="loadmore-spinner"></view>
          <text class="loadmore-text">加载中...</text>
        </view>
        <view v-else-if="!hasMore" class="loadmore-end">
          <view class="loadmore-line"></view>
          <text class="loadmore-text">没有更多了</text>
          <view class="loadmore-line"></view>
        </view>
        <view v-else class="loadmore-more pressable" @tap="loadMore">
          <text class="loadmore-text text-primary">点击加载更多</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { TASK_TYPE_COLORS } from '@/utils/constants'

const userStore = useUserStore()

// Search state
const keyword = ref('')
const selectedType = ref('all')
const minReward = ref('')
const maxReward = ref('')
const communityIndex = ref(0)
const selectedCommunityId = ref('')
const selectedCommunityName = ref('')
const showAdvanced = ref(false)

// Results state
const loading = ref(false)
const searched = ref(false)
const taskList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

// Hot search keywords
const hotKeywords = ref(['取快递', '接送小孩', '宠物喂养', '陪诊', '代扔垃圾'])

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

const communityOptions = computed(() => [
  { _id: '', name: '全部小区' },
  ...userStore.communities
])

function onCommunityFilter(e: any) {
  communityIndex.value = e.detail.value
  const c = communityOptions.value[e.detail.value]
  selectedCommunityId.value = c._id
  selectedCommunityName.value = c._id ? c.name : ''
  doSearch()
}

function resetFilters() {
  keyword.value = ''
  selectedType.value = 'all'
  minReward.value = ''
  maxReward.value = ''
  communityIndex.value = 0
  selectedCommunityId.value = ''
  selectedCommunityName.value = ''
  searched.value = false
  taskList.value = []
  total.value = 0
}

async function doSearch(reset = true) {
  if (reset) {
    page.value = 1
    hasMore.value = true
  }
  searched.value = true
  loading.value = true

  try {
    const taskQuery = uniCloud.importObject('task-query')
    const communityIds = selectedCommunityId.value
      ? [selectedCommunityId.value]
      : userStore.communityIds

    const res = await taskQuery.searchTasks({
      keyword: keyword.value,
      community_ids: communityIds,
      task_type: selectedType.value,
      min_reward: minReward.value ? Number(minReward.value) : undefined,
      max_reward: maxReward.value ? Number(maxReward.value) : undefined,
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
    console.error('Search error:', err)
    uni.showToast({ title: '搜索失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  doSearch(false)
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* ── Search Header ─────────────────────────────────────────── */
.search-header {
  position: sticky;
  top: 0;
  z-index: $uni-z-index-sticky;
  background-color: $uni-bg-color;
  padding: $uni-spacing-sm $uni-spacing-md;
  padding-top: $uni-spacing-md;
  box-shadow: $uni-shadow-sm;

  &__bar {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }

  &__back {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__back-icon {
    font-size: 28px;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
    line-height: 1;
  }

  &__input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    background-color: $uni-bg-color-input;
    border-radius: $uni-border-radius-pill;
    padding: 0 $uni-spacing-md;
    height: 40px;
    transition: $uni-transition-fast;

    &:focus-within {
      background-color: $uni-bg-color;
      box-shadow: 0 0 0 2px rgba(255, 122, 69, 0.15);
    }
  }

  &__icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    font-size: $uni-font-size-sm;
    color: $uni-text-color;
    height: 100%;
  }

  &__placeholder {
    color: $uni-text-color-placeholder;
    font-size: $uni-font-size-sm;
  }

  &__clear {
    width: 20px;
    height: 20px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-text-color-disable;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__clear-icon {
    font-size: 10px;
    color: $uni-text-color-inverse;
    font-weight: $uni-font-weight-bold;
  }

  &__action {
    flex-shrink: 0;
    padding: $uni-spacing-sm $uni-spacing-md;
  }

  &__action-text {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
    color: $uni-color-primary;
  }
}

/* ── Filter Panel ──────────────────────────────────────────── */
.filter-panel {
  background-color: $uni-bg-color;
  padding-bottom: $uni-spacing-sm;
  margin-bottom: $uni-spacing-sm;
}

.filter-chips {
  white-space: nowrap;
  padding: $uni-spacing-sm 0;

  &__inner {
    display: inline-flex;
    gap: $uni-spacing-sm;
    padding: 0 $uni-spacing-md;
  }
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: $uni-border-radius-pill;
  background-color: $uni-bg-color-tag;
  transition: $uni-transition-fast;

  &:active {
    transform: scale(0.95);
  }

  &--active {
    background-color: $uni-color-primary-pale;

    .filter-chip__text {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-semibold;
    }
  }

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    white-space: nowrap;
  }
}

.filter-advanced {
  padding: 0 $uni-spacing-md;
}

.filter-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-xs;
  padding: $uni-spacing-sm 0;

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-grey;
  }

  &__arrow {
    font-size: 8px;
    color: $uni-text-color-grey;
  }
}

.filter-advanced__body {
  padding-bottom: $uni-spacing-sm;
}

.filter-field {
  display: flex;
  align-items: center;
  padding: $uni-spacing-sm 0;
  gap: $uni-spacing-md;

  &__label {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    flex-shrink: 0;
    width: 60px;
    font-weight: $uni-font-weight-medium;
  }

  &__picker {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $uni-spacing-sm $uni-spacing-md;
    background-color: $uni-bg-color-input;
    border-radius: $uni-border-radius-base;
    transition: $uni-transition-fast;
  }

  &__picker-text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color;
  }

  &__picker-arrow {
    font-size: 14px;
    color: $uni-text-color-grey;
    transform: rotate(90deg);
  }

  &__range {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }
}

.range-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: $uni-bg-color-input;
  border-radius: $uni-border-radius-base;
  padding: 0 $uni-spacing-sm;
  height: 36px;
}

.range-input-prefix {
  font-size: $uni-font-size-sm;
  color: $uni-text-color-grey;
  margin-right: 2px;
}

.range-input {
  flex: 1;
  font-size: $uni-font-size-sm;
  color: $uni-text-color;
  height: 100%;
  text-align: center;
}

.range-divider {
  width: 12px;
  height: 1px;
  background-color: $uni-text-color-disable;
  flex-shrink: 0;
}

/* ── Results Section ───────────────────────────────────────── */
.results {
  padding: $uni-spacing-md;

  &__header {
    margin-bottom: $uni-spacing-md;
  }

  &__count {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
  }

  &__count-num {
    color: $uni-color-primary;
    font-weight: $uni-font-weight-semibold;
  }

  &__skeleton {
    display: flex;
    flex-direction: column;
    gap: $uni-spacing-md;
  }

  /* Initial hint state */
  &__hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px $uni-spacing-xl;
    text-align: center;
  }

  &__hint-icon {
    font-size: 48px;
    margin-bottom: $uni-spacing-lg;
    opacity: 0.6;
  }

  &__hint-title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-xs;
  }

  &__hint-desc {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    margin-bottom: $uni-spacing-xl;
  }

  &__list {
    // TaskCard handles its own margin
  }

  &__loadmore {
    padding: $uni-spacing-lg 0;
  }
}

/* ── Hot Keywords ──────────────────────────────────────────── */
.hot-keywords {
  width: 100%;
  max-width: 300px;

  &__title {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    font-weight: $uni-font-weight-medium;
    margin-bottom: $uni-spacing-md;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: $uni-spacing-sm;
  }

  &__item {
    padding: 6px 16px;
    background-color: $uni-bg-color;
    border-radius: $uni-border-radius-pill;
    border: 1px solid $uni-border-color-light;
    transition: $uni-transition-fast;

    &:active {
      background-color: $uni-color-primary-pale;
      border-color: $uni-color-primary-lighter;
    }
  }

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
  }
}

/* ── Load More ─────────────────────────────────────────────── */
.loadmore-loading,
.loadmore-end,
.loadmore-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-sm;
  padding: $uni-spacing-md 0;
}

.loadmore-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid $uni-color-primary-lighter;
  border-top-color: $uni-color-primary;
  border-radius: $uni-border-radius-circle;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loadmore-text {
  font-size: $uni-font-size-sm;
  color: $uni-text-color-grey;
}

.loadmore-line {
  width: 32px;
  height: 1px;
  background-color: $uni-border-color-light;
}

/* ── Skeleton Cards ────────────────────────────────────────── */
.skeleton-card {
  height: 130px;
  background: linear-gradient(
    90deg,
    $uni-bg-color-grey 25%,
    $uni-bg-color-hover 50%,
    $uni-bg-color-grey 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: $uni-border-radius-lg;
}
</style>
