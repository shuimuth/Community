<template>
  <view class="page-container">
    <!-- Tab bar -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: currentTab === 'received' }"
        @tap="switchTab('received')"
      >
        <text class="tab-text">收到的评价</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 'given' }"
        @tap="switchTab('given')"
      >
        <text class="tab-text">我的评价</text>
      </view>
      <!-- Animated indicator -->
      <view class="tab-slider" :class="{ 'tab-slider--right': currentTab === 'given' }"></view>
    </view>

    <!-- Stats summary card (only for received tab) -->
    <view class="stats-card animate-fade-in" v-if="currentTab === 'received'">
      <view class="stats-card__inner">
        <view class="stat-item">
          <text class="stat-item__value">{{ stats.average_score || '-' }}</text>
          <text class="stat-item__label">平均评分</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-item__value">{{ stats.total_reviews || 0 }}</text>
          <text class="stat-item__label">评价总数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-item__value">{{ stats.good_rate || '-' }}</text>
          <text class="stat-item__label">好评率</text>
        </view>
      </view>
    </view>

    <!-- Review list -->
    <scroll-view
      class="review-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view v-if="list.length > 0" class="list-content">
        <view
          v-for="(item, index) in list"
          :key="item._id"
          class="review-card animate-slide-up"
          :style="{ animationDelay: index * 0.06 + 's' }"
        >
          <!-- Card header: avatar + name + role tag -->
          <view class="review-card__header">
            <image
              class="review-card__avatar"
              :src="getAvatar(item)"
              mode="aspectFill"
            ></image>
            <view class="review-card__info">
              <text class="review-card__name">{{ getReviewerName(item) }}</text>
              <text class="review-card__time">{{ formatTime(item.created_at) }}</text>
            </view>
            <view class="review-card__role" :class="item.reviewer_role === 'publisher' ? 'review-card__role--publisher' : 'review-card__role--worker'">
              <text class="review-card__role-text">{{ item.reviewer_role === 'publisher' ? '发布者' : '接单者' }}</text>
            </view>
          </view>

          <!-- Star rating row -->
          <view class="review-card__stars">
            <view class="stars-row">
              <text
                v-for="i in 5"
                :key="i"
                class="star-icon"
                :class="i <= item.score ? 'star-icon--filled' : 'star-icon--empty'"
              >★</text>
            </view>
            <text class="score-label">{{ item.score }}.0</text>
          </view>

          <!-- Review content -->
          <view class="review-card__body">
            <text class="review-card__content" v-if="item.content">{{ item.content }}</text>
            <text class="review-card__content review-card__content--empty" v-else>未填写评价内容</text>
          </view>

          <!-- Task reference link -->
          <view class="review-card__task pressable" @tap="goToTask(item.task_id)">
            <text class="review-card__task-icon">📋</text>
            <text class="review-card__task-title">{{ item.task_title || '查看相关任务' }}</text>
            <text class="review-card__task-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else-if="!isLoading"
        :icon="currentTab === 'received' ? '⭐' : '📝'"
        :title="currentTab === 'received' ? '暂无收到的评价' : '暂无发出的评价'"
        :description="currentTab === 'received' ? '完成任务后即可收到他人评价' : '完成任务后可以对对方进行评价'"
      />

      <!-- Loading more / No more -->
      <view v-if="isLoading && list.length > 0" class="loading-more">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="no-more">
        <view class="no-more__line"></view>
        <text class="no-more__text">没有更多了</text>
        <view class="no-more__line"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { callCloudObject } from '@/utils/request'
import { formatRelativeTime } from '@/utils/common'
import { PLATFORM } from '@/utils/constants'

const currentTab = ref<'received' | 'given'>('received')
const list = ref<any[]>([])
const isLoading = ref(false)
const isRefreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = PLATFORM.PAGE_SIZE

const stats = reactive({
  average_score: '',
  total_reviews: 0,
  good_rate: ''
})

onShow(() => {
  refresh()
})

function switchTab(tab: 'received' | 'given') {
  if (currentTab.value === tab) return
  currentTab.value = tab
  refresh()
}

async function refresh() {
  page.value = 1
  noMore.value = false
  list.value = []
  await loadReviews()
  if (currentTab.value === 'received') {
    await loadStats()
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await refresh()
  isRefreshing.value = false
}

async function loadMore() {
  if (isLoading.value || noMore.value) return
  page.value++
  await loadReviews()
}

async function loadReviews() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const result = await callCloudObject('credit-service', 'getReviews', {
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
    console.error('Load reviews error:', e)
  } finally {
    isLoading.value = false
  }
}

async function loadStats() {
  try {
    const result = await callCloudObject('credit-service', 'getReviewStats')
    if (result) {
      stats.average_score = result.average_score ? result.average_score.toFixed(1) : '-'
      stats.total_reviews = result.total_reviews || 0
      stats.good_rate = result.good_rate ? (result.good_rate * 100).toFixed(0) + '%' : '-'
    }
  } catch (e) {
    console.error('Load stats error:', e)
  }
}

function getAvatar(item: any): string {
  if (currentTab.value === 'received') {
    return item.reviewer_avatar || '/static/default-avatar.png'
  }
  return item.target_avatar || '/static/default-avatar.png'
}

function getReviewerName(item: any): string {
  if (currentTab.value === 'received') {
    return item.reviewer_name || '匿名用户'
  }
  return item.target_name || '匿名用户'
}

function formatTime(timestamp: number): string {
  return formatRelativeTime(timestamp)
}

function goToTask(taskId: string) {
  if (taskId) {
    uni.navigateTo({ url: `/pages/task/detail?id=${taskId}` })
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
  display: flex;
  flex-direction: column;
}

// ── Tab Bar ──
.tab-bar {
  display: flex;
  background-color: #fff;
  position: relative;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 0 12px;
  position: relative;
  z-index: 1;
}

.tab-text {
  font-size: $uni-font-size-base;
  color: $uni-text-color-secondary;
  font-weight: $uni-font-weight-regular;
  transition: all $uni-transition-fast;
}

.tab-item.active .tab-text {
  color: $uni-color-primary;
  font-weight: $uni-font-weight-semibold;
}

.tab-slider {
  position: absolute;
  bottom: 0;
  left: 25%;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  border-radius: $uni-border-radius-pill;
  background: $brand-gradient;
  transition: left $uni-transition-normal cubic-bezier(0.35, 0, 0.25, 1);

  &--right {
    left: 75%;
  }
}

// ── Stats Card ──
.stats-card {
  margin: $uni-spacing-md $uni-spacing-md 0;
}

.stats-card__inner {
  display: flex;
  align-items: center;
  background: $brand-gradient;
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-lg 0;
  box-shadow: $uni-shadow-primary;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-item__value {
  font-size: 24px;
  font-weight: $uni-font-weight-bold;
  color: $uni-text-color-inverse;
  line-height: 1.2;
}

.stat-item__label {
  font-size: $uni-font-size-xs;
  color: rgba(255, 255, 255, 0.8);
}

.stat-divider {
  width: 1px;
  height: 28px;
  background-color: rgba(255, 255, 255, 0.25);
}

// ── Review List ──
.review-list {
  flex: 1;
  height: 0;
}

.list-content {
  padding: $uni-spacing-md;
  display: flex;
  flex-direction: column;
  gap: $uni-spacing-sm;
}

// ── Review Card ──
.review-card {
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-md;
  box-shadow: $uni-shadow-sm;
}

.review-card__header {
  display: flex;
  align-items: center;
  margin-bottom: $uni-spacing-sm;
}

.review-card__avatar {
  width: 40px;
  height: 40px;
  border-radius: $uni-border-radius-circle;
  margin-right: $uni-spacing-sm;
  border: 2px solid $uni-bg-color-page;
}

.review-card__info {
  flex: 1;
  min-width: 0;
}

.review-card__name {
  display: block;
  font-size: $uni-font-size-base;
  font-weight: $uni-font-weight-medium;
  color: $uni-text-color;
  line-height: 1.3;
}

.review-card__time {
  font-size: $uni-font-size-xs;
  color: $uni-text-color-light;
}

.review-card__role {
  padding: 3px 10px;
  border-radius: $uni-border-radius-pill;

  &--publisher {
    background-color: rgba($uni-color-primary, 0.1);
  }

  &--worker {
    background-color: rgba($uni-color-info, 0.1);
  }
}

.review-card__role-text {
  font-size: $uni-font-size-xs;
  font-weight: $uni-font-weight-medium;

  .review-card__role--publisher & {
    color: $uni-color-primary;
  }

  .review-card__role--worker & {
    color: $uni-color-info;
  }
}

// ── Stars ──
.review-card__stars {
  display: flex;
  align-items: center;
  gap: $uni-spacing-xs;
  margin-bottom: $uni-spacing-sm;
}

.stars-row {
  display: flex;
  gap: 2px;
}

.star-icon {
  font-size: 16px;
  line-height: 1;

  &--filled {
    color: $uni-color-warning;
  }

  &--empty {
    color: $uni-border-color-light;
  }
}

.score-label {
  font-size: $uni-font-size-sm;
  font-weight: $uni-font-weight-semibold;
  color: $uni-color-warning;
  margin-left: 2px;
}

// ── Review Body ──
.review-card__body {
  margin-bottom: $uni-spacing-sm;
}

.review-card__content {
  font-size: $uni-font-size-base;
  color: $uni-text-color;
  line-height: 1.7;

  &--empty {
    color: $uni-text-color-placeholder;
    font-style: italic;
    font-size: $uni-font-size-sm;
  }
}

// ── Task Reference ──
.review-card__task {
  display: flex;
  align-items: center;
  gap: $uni-spacing-xs;
  padding: $uni-spacing-sm $uni-spacing-md;
  background-color: $uni-bg-color-page;
  border-radius: $uni-border-radius-base;
  transition: background-color $uni-transition-fast;
}

.review-card__task-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.review-card__task-title {
  flex: 1;
  font-size: $uni-font-size-sm;
  color: $uni-text-color-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-card__task-arrow {
  font-size: 18px;
  color: $uni-text-color-light;
  flex-shrink: 0;
}

// ── Loading & No More ──
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-sm;
  padding: $uni-spacing-lg 0;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid $uni-border-color-light;
  border-top-color: $uni-color-primary;
  border-radius: $uni-border-radius-circle;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: $uni-font-size-sm;
  color: $uni-text-color-light;
}

.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-sm;
  padding: $uni-spacing-lg $uni-spacing-xl;
}

.no-more__line {
  flex: 1;
  height: 1px;
  background-color: $uni-border-color-light;
}

.no-more__text {
  font-size: $uni-font-size-xs;
  color: $uni-text-color-placeholder;
  white-space: nowrap;
}

// ── Animations ──
.animate-fade-in {
  animation: fadeIn $uni-duration-normal ease-out;
}

.animate-slide-up {
  animation: slideUp $uni-duration-normal ease-out both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
