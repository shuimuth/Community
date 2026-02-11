<template>
  <view class="profile-page">
    <!-- Hero Header -->
    <view class="hero">
      <view class="hero__bg"></view>
      <view class="hero__content">
        <!-- Avatar -->
        <view class="avatar-wrap animate-fade-in-up">
          <image
            class="avatar-wrap__img"
            :src="profileData.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>
          <view v-if="profileData.is_verified" class="avatar-wrap__badge">✓</view>
        </view>

        <!-- Name + credit -->
        <text class="hero__name animate-fade-in-up" style="animation-delay: 0.05s">{{ profileData.nickname || '用户' }}</text>

        <view class="credit-pill animate-fade-in-up" :style="{ backgroundColor: creditBgColor }" style="animation-delay: 0.1s">
          <text class="credit-pill__icon">{{ creditIcon }}</text>
          <text class="credit-pill__text">信用 {{ profileData.credit_score || 0 }}</text>
        </view>

        <!-- Verification tag -->
        <view v-if="profileData.is_verified" class="verify-tag animate-fade-in-up" style="animation-delay: 0.15s">
          <text class="verify-tag__icon">🛡️</text>
          <text class="verify-tag__text">已实名认证</text>
        </view>
      </view>

      <!-- Stats card (glassmorphism) -->
      <view class="stats-card animate-fade-in-up" style="animation-delay: 0.2s">
        <view class="stats-card__item" v-for="(stat, index) in statsList" :key="index">
          <text class="stats-card__value">{{ stat.value }}</text>
          <text class="stats-card__label">{{ stat.label }}</text>
        </view>
      </view>
    </view>

    <!-- Reviews Section -->
    <view class="section animate-fade-in-up" style="animation-delay: 0.25s">
      <view class="section__header">
        <view class="section__title-wrap">
          <text class="section__icon">💬</text>
          <text class="section__title">收到的评价</text>
        </view>
        <view class="section__count-badge" v-if="reviews.length > 0">
          <text class="section__count-text">{{ reviews.length }}</text>
        </view>
      </view>

      <!-- Review list -->
      <view v-if="reviews.length > 0" class="review-list">
        <view
          v-for="(item, index) in reviews"
          :key="item._id"
          class="review-card animate-fade-in-up"
          :style="{ animationDelay: (0.3 + index * 0.05) + 's' }"
        >
          <!-- Reviewer info row -->
          <view class="review-card__header">
            <image
              class="review-card__avatar"
              :src="item.reviewer_avatar || '/static/default-avatar.png'"
              mode="aspectFill"
            ></image>
            <view class="review-card__info">
              <text class="review-card__name">{{ item.reviewer_name || '用户' }}</text>
              <view class="review-card__stars">
                <text
                  v-for="i in 5"
                  :key="i"
                  class="review-card__star"
                  :class="{ 'review-card__star--active': i <= item.score }"
                >★</text>
              </view>
            </view>
            <text class="review-card__time">{{ formatTime(item.created_at) }}</text>
          </view>

          <!-- Review content -->
          <text v-if="item.content" class="review-card__content">{{ item.content }}</text>
          <text v-else class="review-card__content review-card__content--empty">该用户未留下文字评价</text>
        </view>
      </view>

      <!-- Empty state -->
      <EmptyState
        v-else
        icon="💬"
        title="暂无评价"
        description="该用户还没有收到评价"
      />
    </view>

    <!-- Bottom safe area -->
    <view class="safe-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { callCloudObject } from '@/utils/request'
import { formatRelativeTime } from '@/utils/common'

const profileData = reactive({
  _id: '',
  nickname: '',
  avatar: '',
  credit_score: 0,
  is_verified: false,
  published_count: 0,
  completed_count: 0,
  average_score: '',
  good_rate: ''
})

const reviews = ref<any[]>([])

// Stats list for grid display
const statsList = computed(() => [
  { label: '发布', value: profileData.published_count || 0 },
  { label: '完成', value: profileData.completed_count || 0 },
  { label: '评分', value: profileData.average_score || '-' },
  { label: '好评率', value: profileData.good_rate || '-' }
])

// Credit color based on score
const creditBgColor = computed(() => {
  const score = profileData.credit_score || 0
  if (score >= 90) return 'rgba(82, 196, 26, 0.15)'
  if (score >= 70) return 'rgba(24, 144, 255, 0.15)'
  if (score >= 60) return 'rgba(250, 173, 20, 0.15)'
  return 'rgba(245, 34, 45, 0.15)'
})

// Credit icon based on score
const creditIcon = computed(() => {
  const score = profileData.credit_score || 0
  if (score >= 90) return '🌟'
  if (score >= 70) return '⭐'
  if (score >= 60) return '⚡'
  return '⚠️'
})

onLoad((options: any) => {
  const userId = options?.id
  if (userId) {
    loadProfile(userId)
  } else {
    uni.showToast({ title: '用户不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

async function loadProfile(userId: string) {
  try {
    uni.showLoading({ title: '加载中...' })
    const result = await callCloudObject('credit-service', 'getUserProfile', {
      user_id: userId
    })

    if (result) {
      Object.assign(profileData, {
        _id: result._id || userId,
        nickname: result.nickname || '用户',
        avatar: result.avatar || '',
        credit_score: result.credit_score || 0,
        is_verified: result.is_verified || false,
        published_count: result.published_count || 0,
        completed_count: result.completed_count || 0,
        average_score: result.average_score ? result.average_score.toFixed(1) : '-',
        good_rate: result.good_rate ? (result.good_rate * 100).toFixed(0) + '%' : '-'
      })
      reviews.value = result.reviews || []
    }
  } catch (e) {
    console.error('Load profile error:', e)
  } finally {
    uni.hideLoading()
  }
}

function formatTime(timestamp: number): string {
  return formatRelativeTime(timestamp)
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
}

// ══════════════════════════════════════════
// Hero Header
// ══════════════════════════════════════════
.hero {
  position: relative;
  padding-bottom: 40px;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 280px;
    background: $brand-gradient;
    border-radius: 0 0 $uni-border-radius-xl $uni-border-radius-xl;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 40px;
  }

  &__name {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: #fff;
    margin-bottom: $uni-spacing-sm;
  }
}

// ── Avatar ──
.avatar-wrap {
  position: relative;
  margin-bottom: $uni-spacing-md;

  &__img {
    width: 80px;
    height: 80px;
    border-radius: $uni-border-radius-circle;
    border: 3px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  &__badge {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 22px;
    height: 22px;
    border-radius: $uni-border-radius-circle;
    background: linear-gradient(135deg, #52c41a, #389e0d);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    color: #fff;
    font-size: 10px;
    font-weight: $uni-font-weight-bold;
  }
}

// ── Credit Pill ──
.credit-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  border-radius: $uni-border-radius-pill;
  margin-bottom: $uni-spacing-sm;

  &__icon {
    font-size: 12px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: #fff;
    font-weight: $uni-font-weight-medium;
  }
}

// ── Verify Tag ──
.verify-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: $uni-spacing-md;

  &__icon {
    font-size: 12px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: rgba(255, 255, 255, 0.8);
  }
}

// ── Stats Card (Glassmorphism) ──
.stats-card {
  position: relative;
  z-index: 2;
  display: flex;
  margin: 0 $uni-spacing-md;
  margin-top: $uni-spacing-md;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-md 0;
  box-shadow: $uni-shadow-brand;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    position: relative;

    &:not(:last-child)::after {
      content: '';
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 1px;
      height: 24px;
      background-color: $uni-border-color-light;
    }
  }

  &__value {
    font-size: 20px;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    line-height: 1.2;
  }

  &__label {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }
}

// ══════════════════════════════════════════
// Reviews Section
// ══════════════════════════════════════════
.section {
  margin: $uni-spacing-md;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $uni-spacing-md;
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }

  &__icon {
    font-size: 18px;
    line-height: 1;
  }

  &__title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
  }

  &__count-badge {
    min-width: 24px;
    height: 24px;
    border-radius: $uni-border-radius-pill;
    background-color: rgba($uni-color-primary, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
  }

  &__count-text {
    font-size: $uni-font-size-xs;
    font-weight: $uni-font-weight-semibold;
    color: $uni-color-primary;
  }
}

// ── Review Cards ──
.review-list {
  display: flex;
  flex-direction: column;
  gap: $uni-spacing-sm;
}

.review-card {
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-md;
  box-shadow: $uni-shadow-sm;
  transition: $uni-transition-fast;

  &:active {
    transform: scale(0.985);
  }

  &__header {
    display: flex;
    align-items: center;
    margin-bottom: $uni-spacing-sm;
  }

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: $uni-border-radius-circle;
    margin-right: $uni-spacing-sm;
    border: 1px solid $uni-border-color-light;
  }

  &__info {
    flex: 1;
  }

  &__name {
    display: block;
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
    margin-bottom: 2px;
    line-height: 1.3;
  }

  &__stars {
    display: flex;
    gap: 2px;
  }

  &__star {
    font-size: 12px;
    color: $uni-border-color-light;
    line-height: 1;

    &--active {
      color: #faad14;
    }
  }

  &__time {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
    flex-shrink: 0;
  }

  &__content {
    font-size: $uni-font-size-base;
    color: $uni-text-color;
    line-height: 1.6;
    padding-left: 48px;

    &--empty {
      color: $uni-text-color-placeholder;
      font-style: italic;
    }
  }
}

// ══════════════════════════════════════════
// Safe Bottom
// ══════════════════════════════════════════
.safe-bottom {
  height: $uni-spacing-xl;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
