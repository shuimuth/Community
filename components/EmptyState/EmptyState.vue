
<template>
  <view class="empty-state" :class="[`empty-state--${size}`]">
    <!-- Illustration area -->
    <view class="empty-state__illustration anim-fade-in">
      <!-- Custom image -->
      <image
        v-if="image"
        :src="image"
        class="empty-state__image"
        mode="aspectFit"
      />
      <!-- Emoji icon (default) -->
      <view v-else class="empty-state__emoji-wrap">
        <text class="empty-state__emoji">{{ iconEmoji }}</text>
      </view>
    </view>

    <!-- Text content -->
    <view class="empty-state__content anim-fade-in-up anim-delay-1">
      <text class="empty-state__title">{{ title }}</text>
      <text v-if="description" class="empty-state__desc">{{ description }}</text>
    </view>

    <!-- Action button -->
    <view
      v-if="actionText"
      class="empty-state__action anim-fade-in-up anim-delay-2"
    >
      <view
        class="empty-state__btn"
        :class="[actionType === 'primary' ? 'empty-state__btn--primary' : 'empty-state__btn--outline']"
        @tap="$emit('action')"
      >
        <text class="empty-state__btn-text">{{ actionText }}</text>
      </view>
    </view>

    <!-- Custom slot for extra content -->
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * EmptyState — Unified empty state / placeholder component
 * 
 * Replaces scattered empty-state implementations across all pages.
 * Supports multiple preset types, custom illustrations, and action buttons.
 *
 * Usage:
 *   <EmptyState type="task" />
 *   <EmptyState type="message" title="No messages yet" />
 *   <EmptyState 
 *     type="task" 
 *     action-text="Post a task" 
 *     @action="goPublish" 
 *   />
 */

// Preset type configurations
const PRESETS: Record<string, { emoji: string; title: string; desc: string }> = {
  task: {
    emoji: '📋',
    title: '暂无可接任务',
    desc: '换个小区或类型试试？'
  },
  message: {
    emoji: '💬',
    title: '暂无消息',
    desc: '互动消息会出现在这里'
  },
  search: {
    emoji: '🔍',
    title: '没有找到结果',
    desc: '试试其他关键词？'
  },
  published: {
    emoji: '📝',
    title: '暂无发布的任务',
    desc: '发布一个任务让邻居帮忙吧'
  },
  accepted: {
    emoji: '🤝',
    title: '暂无接单的任务',
    desc: '去首页看看有什么可以帮忙的'
  },
  transaction: {
    emoji: '💰',
    title: '暂无交易记录',
    desc: '完成任务后收入会出现在这里'
  },
  review: {
    emoji: '⭐',
    title: '暂无评价',
    desc: '完成任务后可以收到评价'
  },
  network: {
    emoji: '📡',
    title: '网络连接异常',
    desc: '请检查网络后重试'
  },
  error: {
    emoji: '😥',
    title: '加载失败',
    desc: '请稍后重试'
  },
  default: {
    emoji: '📭',
    title: '暂无数据',
    desc: ''
  }
}

const props = withDefaults(defineProps<{
  /** Preset type — determines default icon, title, desc */
  type?: keyof typeof PRESETS
  /** Custom title (overrides preset) */
  title?: string
  /** Custom description (overrides preset) */
  description?: string
  /** Custom image URL (overrides emoji icon) */
  image?: string
  /** Custom emoji icon (overrides preset) */
  icon?: string
  /** Action button text — if provided, button is shown */
  actionText?: string
  /** Action button style */
  actionType?: 'primary' | 'outline'
  /** Component size variant */
  size?: 'default' | 'compact' | 'large'
}>(), {
  type: 'default',
  title: '',
  description: '',
  image: '',
  icon: '',
  actionText: '',
  actionType: 'outline',
  size: 'default'
})

defineEmits<{
  (e: 'action'): void
}>()

// Resolve the emoji icon: prop > preset
const iconEmoji = computed(() => {
  if (props.icon) return props.icon
  return PRESETS[props.type]?.emoji || PRESETS.default.emoji
})

// Use custom title or fall back to preset
const title = computed(() => {
  if (props.title) return props.title
  return PRESETS[props.type]?.title || PRESETS.default.title
})

// Use custom description or fall back to preset
const description = computed(() => {
  if (props.description) return props.description
  return PRESETS[props.type]?.desc || PRESETS.default.desc
})
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px $uni-spacing-xl;

  // ── Size Variants ──
  &--compact {
    padding: 40px $uni-spacing-base;

    .empty-state__image {
      width: 100px;
      height: 100px;
    }

    .empty-state__emoji-wrap {
      width: 64px;
      height: 64px;
    }

    .empty-state__emoji {
      font-size: 32px;
    }

    .empty-state__title {
      font-size: $uni-font-size-base;
    }

    .empty-state__desc {
      font-size: $uni-font-size-xs;
    }
  }

  &--large {
    padding: 80px $uni-spacing-xxl;

    .empty-state__image {
      width: 180px;
      height: 180px;
    }

    .empty-state__emoji-wrap {
      width: 100px;
      height: 100px;
    }

    .empty-state__emoji {
      font-size: 52px;
    }

    .empty-state__title {
      font-size: $uni-font-size-xl;
    }
  }

  // ── Illustration ──
  &__illustration {
    margin-bottom: $uni-spacing-lg;
  }

  &__image {
    width: 140px;
    height: 140px;
  }

  &__emoji-wrap {
    width: 80px;
    height: 80px;
    border-radius: $uni-border-radius-circle;
    background: linear-gradient(135deg, $uni-color-primary-pale, $uni-bg-color-grey);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(255, 122, 69, 0.08);
  }

  &__emoji {
    font-size: 40px;
    line-height: 1;
  }

  // ── Content ──
  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $uni-spacing-xs;
    margin-bottom: $uni-spacing-base;
    max-width: 260px;
    text-align: center;
  }

  &__title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
    line-height: $uni-line-height-tight;
  }

  &__desc {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    line-height: $uni-line-height-base;
  }

  // ── Action Button ──
  &__action {
    margin-top: $uni-spacing-sm;
  }

  &__btn {
    padding: 0 $uni-spacing-xl;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $uni-border-radius-pill;
    transition: $uni-transition-base;

    &:active {
      transform: scale(0.96);
    }

    &--primary {
      background: $brand-gradient;
      box-shadow: 0 4px 12px rgba(255, 122, 69, 0.20);

      .empty-state__btn-text {
        color: $uni-text-color-inverse;
        font-weight: $uni-font-weight-semibold;
      }
    }

    &--outline {
      border: 1px solid $uni-color-primary;
      background-color: transparent;

      .empty-state__btn-text {
        color: $uni-color-primary;
      }
    }
  }

  &__btn-text {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-medium;
  }
}
</style>
