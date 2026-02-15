<template>
  <view class="manage-page">
    <!-- Hero header -->
    <view class="hero">
      <view class="hero__bg"></view>
      <view class="hero__content">
        <text class="hero__title">我的小区</text>
        <view class="hero__badge">
          <text class="hero__badge-text">{{ communities.length }}/5</text>
        </view>
      </view>
      <text class="hero__subtitle">点击小区卡片可切换首页显示的小区</text>
    </view>

    <!-- Community list -->
    <view class="community-list" v-if="communities.length > 0">
      <view
        v-for="(item, index) in communities"
        :key="item._id"
        class="community-card animate-fade-in-up"
        :class="{ 'community-card--active': item._id === currentCommunityId }"
        :style="{ animationDelay: index * 0.08 + 's' }"
        @tap="handleSelect(item)"
      >
        <view class="community-card__icon">
          <text class="community-card__icon-emoji">🏘️</text>
        </view>
        <view class="community-card__info">
          <text class="community-card__name">{{ item.name }}</text>
          <view class="community-card__detail">
            <text class="community-card__detail-icon">📍</text>
            <text class="community-card__detail-text">{{ item.region || '' }} {{ item.address || '暂无详细地址' }}</text>
          </view>
        </view>
        <view class="community-card__actions">
          <view
            v-if="item._id === currentCommunityId"
            class="community-card__badge"
          >
            <text class="community-card__badge-text">当前</text>
          </view>
          <view
            class="community-card__delete"
            :class="{ 'community-card__delete--disabled': communities.length <= 1 }"
            @tap.stop="handleRemove(item)"
          >
            <text class="community-card__delete-icon">🗑️</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Empty state -->
    <EmptyState
      v-else
      icon="🏘️"
      title="暂未关联小区"
      description="添加您所在的小区，发现身边的互助任务"
      actionText="去添加小区"
      @action="goAddCommunity"
    />

    <!-- Tips section -->
    <view class="tips-card animate-fade-in-up" :style="{ animationDelay: '0.3s' }">
      <view class="tips-card__header">
        <text class="tips-card__header-icon">💡</text>
        <text class="tips-card__header-title">温馨提示</text>
      </view>
      <view class="tips-card__list">
        <view class="tips-card__item">
          <view class="tips-card__dot"></view>
          <text class="tips-card__text">点击小区卡片可切换首页显示的小区</text>
        </view>
        <view class="tips-card__item">
          <view class="tips-card__dot"></view>
          <text class="tips-card__text">至少需要保留 1 个小区</text>
        </view>
        <view class="tips-card__item">
          <view class="tips-card__dot"></view>
          <text class="tips-card__text">最多可关联 5 个小区</text>
        </view>
      </view>
    </view>

    <!-- Add button -->
    <view class="action-bar" v-if="communities.length < 5">
      <view class="action-bar__btn" @tap="goAddCommunity">
        <text class="action-bar__btn-icon">＋</text>
        <text class="action-bar__btn-text">添加小区</text>
      </view>
      <text class="action-bar__hint">还可添加 {{ 5 - communities.length }} 个小区</text>
    </view>

    <!-- Max reached hint -->
    <view class="max-hint" v-else-if="communities.length >= 5">
      <text class="max-hint__icon">✅</text>
      <text class="max-hint__text">已达最大关联数量</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { showToast, showConfirm } from '@/utils/common'

const userStore = useUserStore()

const communities = computed(() => userStore.communities)
const currentCommunityId = computed(() => userStore.currentCommunityId)

function handleSelect(item: any) {
  if (item._id === currentCommunityId.value) return
  userStore.setCurrentCommunity(item._id)
  showToast(`已切换到 ${item.name}`, 'success')
  // Refresh home page data
  uni.$emit('community-changed')
}

async function handleRemove(item: any) {
  if (communities.value.length <= 1) {
    showToast('至少需要保留1个小区')
    return
  }

  const confirmed = await showConfirm(`确定移除"${item.name}"吗？`)
  if (!confirmed) return

  try {
    uni.showLoading({ title: '移除中...' })
    const communityService = uniCloud.importObject('community-service')
    await communityService.removeCommunity({ community_id: item._id })

    // Update store
    const updated = communities.value.filter((c: any) => c._id !== item._id)
    userStore.setCommunities(updated)

    showToast('已移除', 'success')
  } catch (err: any) {
    showToast(err.message || '移除失败')
  } finally {
    uni.hideLoading()
  }
}

function goAddCommunity() {
  uni.navigateTo({ url: '/pages/community/select' })
}
</script>

<style lang="scss" scoped>
.manage-page {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
  padding-bottom: calc(env(safe-area-inset-bottom) + 32rpx);
}

// ══════════════════════════════════════════
// Hero Header
// ══════════════════════════════════════════
.hero {
  position: relative;
  padding: $uni-spacing-xl $uni-spacing-lg $uni-spacing-lg;
  overflow: hidden;

  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: $brand-gradient;
    opacity: 0.95;
  }

  &__content {
    position: relative;
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    margin-bottom: 6px;
  }

  &__title {
    font-size: $uni-font-size-xxl;
    font-weight: $uni-font-weight-bold;
    color: #fff;
  }

  &__badge {
    padding: 3px 10px;
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: $uni-border-radius-pill;
    backdrop-filter: blur(4px);

    &-text {
      font-size: $uni-font-size-xs;
      font-weight: $uni-font-weight-semibold;
      color: #fff;
    }
  }

  &__subtitle {
    position: relative;
    font-size: $uni-font-size-sm;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.4;
  }
}

// ══════════════════════════════════════════
// Community List
// ══════════════════════════════════════════
.community-list {
  padding: $uni-spacing-md;
  display: flex;
  flex-direction: column;
  gap: $uni-spacing-sm;
}

.community-card {
  display: flex;
  align-items: center;
  gap: $uni-spacing-md;
  padding: $uni-spacing-md;
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  box-shadow: $uni-shadow-sm;
  transition: $uni-transition-fast;
  cursor: pointer;
  position: relative;

  &:active {
    transform: scale(0.985);
  }

  &--active {
    background: linear-gradient(135deg, rgba(255, 122, 69, 0.05) 0%, rgba(255, 122, 69, 0.02) 100%);
    border: 1.5px solid rgba(255, 122, 69, 0.3);
    box-shadow: 0 2px 12px rgba(255, 122, 69, 0.15);
  }

  // ── Icon ──
  &__icon {
    width: 48px;
    height: 48px;
    border-radius: $uni-border-radius-base;
    background-color: rgba($uni-color-primary, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &-emoji {
      font-size: 24px;
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
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__detail {
    display: flex;
    align-items: center;
    gap: 4px;

    &-icon {
      font-size: 12px;
      line-height: 1;
    }

    &-text {
      font-size: $uni-font-size-xs;
      color: $uni-text-color-placeholder;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.3;
    }
  }

  // ── Delete ──
  &__actions {
    display: flex;
    align-items: center;
    gap: $uni-spacing-xs;
    flex-shrink: 0;
  }

  &__badge {
    padding: 4px 10px;
    background: $brand-gradient;
    border-radius: $uni-border-radius-pill;
    box-shadow: 0 2px 8px rgba(255, 122, 69, 0.25);

    &-text {
      font-size: $uni-font-size-xs;
      font-weight: $uni-font-weight-semibold;
      color: #fff;
      line-height: 1;
    }
  }

  &__delete {
    width: 40px;
    height: 40px;
    border-radius: $uni-border-radius-circle;
    background-color: rgba(#f5222d, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: $uni-transition-fast;

    &-icon {
      font-size: 18px;
      line-height: 1;
    }

    &:active {
      transform: scale(0.9);
      background-color: rgba(#f5222d, 0.12);
    }

    &--disabled {
      opacity: 0.25;
      pointer-events: none;
    }
  }
}

// ══════════════════════════════════════════
// Tips Card
// ══════════════════════════════════════════
.tips-card {
  margin: 0 $uni-spacing-md;
  padding: $uni-spacing-md;
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  box-shadow: $uni-shadow-xs;

  &__header {
    display: flex;
    align-items: center;
    gap: $uni-spacing-xs;
    margin-bottom: $uni-spacing-sm;

    &-icon {
      font-size: 16px;
      line-height: 1;
    }

    &-title {
      font-size: $uni-font-size-sm;
      font-weight: $uni-font-weight-semibold;
      color: $uni-text-color;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__dot {
    width: 4px;
    height: 4px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-color-primary;
    opacity: 0.5;
    flex-shrink: 0;
  }

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-secondary;
    line-height: 1.4;
  }
}

// ══════════════════════════════════════════
// Action Bar
// ══════════════════════════════════════════
.action-bar {
  padding: $uni-spacing-lg $uni-spacing-md 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $uni-spacing-sm;

  &__btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $uni-spacing-xs;
    padding: 14px 0;
    background: $brand-gradient;
    border-radius: $uni-border-radius-lg;
    box-shadow: $uni-shadow-brand;
    transition: $uni-transition-fast;

    &:active {
      opacity: $uni-opacity-active;
      transform: scale(0.98);
    }

    &-icon {
      font-size: $uni-font-size-lg;
      color: #fff;
      font-weight: $uni-font-weight-bold;
    }

    &-text {
      font-size: $uni-font-size-base;
      font-weight: $uni-font-weight-semibold;
      color: #fff;
    }
  }

  &__hint {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-placeholder;
  }
}

// ══════════════════════════════════════════
// Max Hint
// ══════════════════════════════════════════
.max-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $uni-spacing-xs;
  padding: $uni-spacing-lg 0;

  &__icon {
    font-size: 16px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-placeholder;
  }
}
</style>
