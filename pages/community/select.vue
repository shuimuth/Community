<template>
  <view class="community-select">
    <!-- Hero Header -->
    <view class="hero">
      <view class="hero__bg"></view>
      <view class="hero__content">
        <text class="hero__icon">🏘️</text>
        <text class="hero__title">选择您的小区</text>
        <text class="hero__subtitle">最多可选择5个小区，我们将为您展示相关的任务信息</text>
      </view>
    </view>

    <!-- Search bar -->
    <view class="search-section">
      <view class="search-box">
        <text class="search-box__icon">🔍</text>
        <input
          class="search-box__input"
          v-model="keyword"
          placeholder="搜索小区名称"
          placeholder-class="search-box__placeholder"
          confirm-type="search"
          @confirm="handleSearch"
          @input="debounceSearch"
        />
        <view v-if="keyword" class="search-box__clear" @tap="handleClear">
          <text class="search-box__clear-icon">✕</text>
        </view>
      </view>
    </view>

    <!-- Selected communities -->
    <view v-if="selectedList.length > 0" class="selected-section animate-fade-in-up">
      <view class="section-header">
        <text class="section-header__title">已选小区</text>
        <view class="section-header__badge">
          <text class="section-header__badge-text">{{ selectedList.length }}/5</text>
        </view>
      </view>
      <scroll-view scroll-x :show-scrollbar="false" class="selected-scroll">
        <view class="selected-scroll__inner">
          <view
            v-for="item in selectedList"
            :key="item._id"
            class="selected-tag"
          >
            <text class="selected-tag__icon">📍</text>
            <text class="selected-tag__text">{{ item.name }}</text>
            <view class="selected-tag__close" @tap="toggleSelect(item)">
              <text class="selected-tag__close-icon">✕</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Community list -->
    <view class="list-section">
      <view class="section-header">
        <text class="section-header__title">{{ keyword ? '搜索结果' : '全部小区' }}</text>
        <text class="section-header__count">共{{ total }}个</text>
      </view>

      <!-- Loading skeleton -->
      <view v-if="loading && communityList.length === 0" class="skeleton-list">
        <view v-for="i in 5" :key="i" class="skeleton-item">
          <view class="skeleton-item__content">
            <view class="skeleton-line skeleton-line--title"></view>
            <view class="skeleton-line skeleton-line--sub"></view>
          </view>
          <view class="skeleton-circle"></view>
        </view>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else-if="communityList.length === 0 && !loading"
        :icon="keyword ? '🔍' : '🏘️'"
        :title="keyword ? '未找到匹配的小区' : '暂无小区数据'"
        :description="keyword ? '换个关键词试试吧' : '小区列表为空，请稍后再试'"
      />

      <!-- Community list -->
      <view v-else class="community-list">
        <view
          v-for="(item, index) in communityList"
          :key="item._id"
          class="community-card animate-fade-in-up"
          :class="{ 'community-card--selected': isSelected(item._id) }"
          :style="{ animationDelay: index * 0.04 + 's' }"
          @tap="toggleSelect(item)"
        >
          <view class="community-card__left">
            <view class="community-card__avatar" :class="{ 'community-card__avatar--selected': isSelected(item._id) }">
              <text class="community-card__avatar-icon">{{ isSelected(item._id) ? '✓' : '🏠' }}</text>
            </view>
          </view>
          <view class="community-card__info">
            <text class="community-card__name">{{ item.name }}</text>
            <text v-if="item.region || item.address" class="community-card__address">
              📍 {{ item.region || '' }} {{ item.address || '' }}
            </text>
          </view>
          <view class="community-card__check">
            <view class="check-circle" :class="{ 'check-circle--active': isSelected(item._id) }">
              <text v-if="isSelected(item._id)" class="check-circle__icon">✓</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Load more -->
      <view v-if="loading && communityList.length > 0" class="load-more">
        <view class="load-more__spinner"></view>
        <text class="load-more__text">加载中...</text>
      </view>
      <view v-else-if="!hasMore && communityList.length > 0" class="load-more">
        <view class="load-more__line"></view>
        <text class="load-more__text">没有更多了</text>
        <view class="load-more__line"></view>
      </view>
      <view v-else-if="hasMore && communityList.length > 0" class="load-more" @tap="loadMore">
        <text class="load-more__action">点击加载更多</text>
      </view>
    </view>

    <!-- Submit bottom bar -->
    <view class="bottom-bar safe-area-bottom">
      <view class="bottom-bar__inner">
        <view class="bottom-bar__info">
          <text class="bottom-bar__info-text">
            已选择 <text class="bottom-bar__info-highlight">{{ selectedList.length }}</text> 个小区
          </text>
        </view>
        <view
          class="bottom-bar__btn"
          :class="{ 'bottom-bar__btn--disabled': selectedList.length === 0 || submitting }"
          @tap="handleSubmit"
        >
          <view v-if="submitting" class="bottom-bar__btn-spinner"></view>
          <text class="bottom-bar__btn-text">{{ submitting ? '保存中...' : '确认选择' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { showToast, debounce } from '@/utils/common'

interface CommunityItem {
  _id: string
  name: string
  region?: string
  address?: string
}

const userStore = useUserStore()
const keyword = ref('')
const loading = ref(false)
const submitting = ref(false)
const communityList = ref<CommunityItem[]>([])
const selectedList = ref<CommunityItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

onMounted(async () => {
  // Pre-fill already selected communities
  if (userStore.communities.length > 0) {
    selectedList.value = [...userStore.communities]
  }
  await loadCommunities()
})

async function loadCommunities(reset = true) {
  if (reset) {
    page.value = 1
    hasMore.value = true
  }

  loading.value = true
  try {
    const communityService = uniCloud.importObject('community-service')
    const res = await communityService.searchCommunities({
      keyword: keyword.value,
      page: page.value,
      pageSize
    })

    if (reset) {
      communityList.value = res.data || []
    } else {
      communityList.value = [...communityList.value, ...(res.data || [])]
    }
    total.value = res.total || 0
    hasMore.value = communityList.value.length < total.value
  } catch (err: any) {
    console.error('Load communities error:', err)
    showToast('加载小区列表失败')
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadCommunities(false)
}

function isSelected(id: string): boolean {
  return selectedList.value.some(item => item._id === id)
}

function toggleSelect(item: CommunityItem) {
  const index = selectedList.value.findIndex(s => s._id === item._id)
  if (index >= 0) {
    selectedList.value.splice(index, 1)
  } else {
    if (selectedList.value.length >= 5) {
      showToast('最多只能选择5个小区')
      return
    }
    selectedList.value.push(item)
  }
}

function handleSearch() {
  loadCommunities()
}

function handleClear() {
  keyword.value = ''
  loadCommunities()
}

const debounceSearch = debounce(() => {
  loadCommunities()
}, 500)

async function handleSubmit() {
  if (selectedList.value.length === 0) {
    showToast('请至少选择一个小区')
    return
  }
  if (submitting.value) return

  submitting.value = true
  try {
    const communityService = uniCloud.importObject('community-service')

    // Get current user communities
    const currentCommunities = userStore.communities.map(c => c._id)
    const newCommunities = selectedList.value.map(c => c._id)

    // Remove deselected
    for (const id of currentCommunities) {
      if (!newCommunities.includes(id)) {
        await communityService.removeCommunity({ community_id: id })
      }
    }

    // Add newly selected
    for (const id of newCommunities) {
      if (!currentCommunities.includes(id)) {
        await communityService.addCommunity({ community_id: id })
      }
    }

    // Update store
    userStore.setCommunities(selectedList.value)

    showToast('小区选择成功！', 'success')

    setTimeout(() => {
      if (currentCommunities.length === 0) {
        uni.switchTab({ url: '/pages/index/index' })
      } else {
        uni.navigateBack()
      }
    }, 1000)
  } catch (err: any) {
    console.error('Submit communities error:', err)
    showToast(err.message || '保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.community-select {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

// ══════════════════════════════════════════
// Hero Header
// ══════════════════════════════════════════
.hero {
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
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      top: -60px;
      right: -40px;
    }

    &::before {
      content: '';
      position: absolute;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      bottom: -30px;
      left: -20px;
    }
  }

  &__content {
    position: relative;
    padding: 40px $uni-spacing-lg 28px;
  }

  &__icon {
    font-size: 36px;
    margin-bottom: $uni-spacing-sm;
    display: block;
  }

  &__title {
    display: block;
    font-size: $uni-font-size-xxl;
    font-weight: $uni-font-weight-bold;
    color: #fff;
    margin-bottom: 6px;
  }

  &__subtitle {
    font-size: $uni-font-size-sm;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.5;
  }
}

// ══════════════════════════════════════════
// Search
// ══════════════════════════════════════════
.search-section {
  padding: $uni-spacing-md $uni-spacing-md 0;
  margin-top: -14px;
  position: relative;
  z-index: 2;
}

.search-box {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  padding: 0 $uni-spacing-md;
  height: 44px;
  box-shadow: $uni-shadow-md;

  &__icon {
    font-size: 16px;
    margin-right: $uni-spacing-sm;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    font-size: $uni-font-size-base;
    color: $uni-text-color;
    height: 44px;
  }

  &__placeholder {
    color: $uni-text-color-placeholder;
    font-size: $uni-font-size-base;
  }

  &__clear {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: $uni-bg-color-hover;
    border-radius: $uni-border-radius-circle;
    flex-shrink: 0;
    margin-left: $uni-spacing-sm;

    &-icon {
      font-size: 10px;
      color: $uni-text-color-placeholder;
      font-weight: $uni-font-weight-bold;
    }
  }
}

// ══════════════════════════════════════════
// Section Header
// ══════════════════════════════════════════
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $uni-spacing-sm;

  &__title {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__badge {
    padding: 2px 10px;
    background: rgba($uni-color-primary, 0.1);
    border-radius: $uni-border-radius-pill;

    &-text {
      font-size: $uni-font-size-xs;
      color: $uni-color-primary;
      font-weight: $uni-font-weight-semibold;
    }
  }

  &__count {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }
}

// ══════════════════════════════════════════
// Selected Tags
// ══════════════════════════════════════════
.selected-section {
  padding: $uni-spacing-md $uni-spacing-md 0;
}

.selected-scroll {
  white-space: nowrap;

  &__inner {
    display: flex;
    gap: $uni-spacing-sm;
    padding-bottom: 4px;
  }
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 6px 10px;
  background: rgba($uni-color-primary, 0.08);
  border: 1rpx solid rgba($uni-color-primary, 0.2);
  border-radius: $uni-border-radius-pill;
  flex-shrink: 0;
  transition: $uni-transition-fast;

  &__icon {
    font-size: 12px;
  }

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-color-primary;
    font-weight: $uni-font-weight-medium;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__close {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba($uni-color-primary, 0.15);
    border-radius: $uni-border-radius-circle;
    margin-left: 2px;

    &-icon {
      font-size: 9px;
      color: $uni-color-primary;
      font-weight: $uni-font-weight-bold;
    }
  }

  &:active {
    transform: scale(0.95);
  }
}

// ══════════════════════════════════════════
// Community List
// ══════════════════════════════════════════
.list-section {
  padding: $uni-spacing-md;
}

.community-list {
  display: flex;
  flex-direction: column;
  gap: $uni-spacing-sm;
}

.community-card {
  display: flex;
  align-items: center;
  padding: $uni-spacing-md;
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  border: 1rpx solid transparent;
  box-shadow: $uni-shadow-sm;
  transition: $uni-transition-fast;

  &:active {
    transform: scale(0.985);
  }

  &--selected {
    border-color: rgba($uni-color-primary, 0.3);
    background-color: rgba($uni-color-primary, 0.02);
  }

  // ── Avatar ──
  &__left {
    margin-right: $uni-spacing-sm;
    flex-shrink: 0;
  }

  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: $uni-border-radius-base;
    background-color: $uni-bg-color-page;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: $uni-transition-fast;

    &--selected {
      background: $brand-gradient;
    }

    &-icon {
      font-size: 20px;
      line-height: 1;
    }
  }

  // ── Info ──
  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    display: block;
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__address {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  // ── Check ──
  &__check {
    flex-shrink: 0;
    margin-left: $uni-spacing-sm;
  }
}

.check-circle {
  width: 22px;
  height: 22px;
  border-radius: $uni-border-radius-circle;
  border: 2px solid $uni-border-color;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: $uni-transition-fast;

  &--active {
    border-color: $uni-color-primary;
    background: $brand-gradient;

    .check-circle__icon {
      color: #fff;
      font-size: 12px;
      font-weight: $uni-font-weight-bold;
    }
  }
}

// ══════════════════════════════════════════
// Skeleton Loading
// ══════════════════════════════════════════
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: $uni-spacing-sm;
}

.skeleton-item {
  display: flex;
  align-items: center;
  padding: $uni-spacing-md;
  background-color: #fff;
  border-radius: $uni-border-radius-lg;

  &__content {
    flex: 1;
  }
}

.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, $uni-bg-color-page 25%, $uni-bg-color-hover 50%, $uni-bg-color-page 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: $uni-border-radius-sm;

  &--title {
    width: 60%;
    margin-bottom: 8px;
  }

  &--sub {
    width: 80%;
    height: 10px;
  }
}

.skeleton-circle {
  width: 22px;
  height: 22px;
  border-radius: $uni-border-radius-circle;
  background: linear-gradient(90deg, $uni-bg-color-page 25%, $uni-bg-color-hover 50%, $uni-bg-color-page 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  margin-left: $uni-spacing-md;
  flex-shrink: 0;
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

  &__action {
    font-size: $uni-font-size-sm;
    color: $uni-color-primary;
    font-weight: $uni-font-weight-medium;
  }
}

// ══════════════════════════════════════════
// Bottom Bar
// ══════════════════════════════════════════
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1rpx solid $uni-border-color-light;
  z-index: 100;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $uni-spacing-sm $uni-spacing-md;
  }

  &__info {
    flex: 1;

    &-text {
      font-size: $uni-font-size-sm;
      color: $uni-text-color-secondary;
    }

    &-highlight {
      color: $uni-color-primary;
      font-weight: $uni-font-weight-bold;
      font-size: $uni-font-size-lg;
    }
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $uni-spacing-xs;
    padding: 10px 32px;
    background: $brand-gradient;
    border-radius: $uni-border-radius-pill;
    box-shadow: $uni-shadow-primary;
    transition: $uni-transition-fast;

    &:active {
      opacity: $uni-opacity-active;
      transform: scale(0.97);
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    &-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: $uni-border-radius-circle;
      animation: spin 0.8s linear infinite;
    }

    &-text {
      font-size: $uni-font-size-base;
      color: #fff;
      font-weight: $uni-font-weight-semibold;
    }
  }
}

// ══════════════════════════════════════════
// Animations
// ══════════════════════════════════════════
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
