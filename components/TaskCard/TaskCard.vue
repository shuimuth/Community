
<template>
  <view
    class="task-card"
    :class="[
      `task-card--${size}`,
      { 'task-card--urgent': isUrgent, 'task-card--completed': isCompleted }
    ]"
    @tap="handleTap"
  >
    <!-- Card Header: Type Badge + Reward -->
    <view class="task-card__header">
      <view class="task-card__type" :style="typeBadgeStyle">
        <text class="task-card__type-icon">{{ typeIcon }}</text>
        <text class="task-card__type-text">{{ task.task_type }}</text>
      </view>
      <view class="task-card__reward">
        <text class="task-card__reward-symbol">¥</text>
        <text class="task-card__reward-value">{{ rewardDisplay }}</text>
      </view>
    </view>

    <!-- Card Body: Title + Description -->
    <view class="task-card__body">
      <text class="task-card__title text-ellipsis">{{ task.title }}</text>
      <text
        v-if="showDescription && task.description"
        class="task-card__desc text-clamp-2"
      >{{ task.description }}</text>
    </view>

    <!-- Card Meta: Location + Time -->
    <view class="task-card__meta">
      <view v-if="task.community_name" class="task-card__meta-item">
        <text class="task-card__meta-icon">📍</text>
        <text class="task-card__meta-text">{{ task.community_name }}</text>
      </view>
      <view v-if="timeDisplay" class="task-card__meta-item">
        <text class="task-card__meta-icon">⏰</text>
        <text class="task-card__meta-text">{{ timeDisplay }}</text>
      </view>
      <view v-if="showStatus && task.status" class="task-card__status">
        <text class="task-card__status-dot" :style="{ backgroundColor: statusColor }"></text>
        <text class="task-card__status-text" :style="{ color: statusColor }">{{ statusLabel }}</text>
      </view>
    </view>

    <!-- Card Footer: Publisher Info + Time -->
    <view class="task-card__footer">
      <view class="task-card__publisher">
        <image
          :src="task.publisher_avatar || '/static/default-avatar.png'"
          class="task-card__avatar"
          mode="aspectFill"
          lazy-load
        />
        <text class="task-card__publisher-name">{{ task.publisher_name || '匿名用户' }}</text>
      </view>
      <text class="task-card__time">{{ relativeTime }}</text>
    </view>

    <!-- Urgent indicator ribbon -->
    <view v-if="isUrgent" class="task-card__urgent-ribbon">
      <text class="task-card__urgent-text">急</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, formatRelativeTime } from '@/utils/common'
import { TASK_TYPE_COLORS, TASK_STATUS } from '@/utils/constants'

/**
 * TaskCard — Unified task card component
 * 
 * Consolidates card implementations from index, hall, and search pages.
 * Supports multiple display modes and responsive sizing.
 */

// Task type icon mapping
const TYPE_ICONS: Record<string, string> = {
  '取快递': '📦',
  '接送小孩': '👶',
  '陪诊': '🏥',
  '陪读': '📚',
  '代扔垃圾': '🗑️',
  '宠物喂养': '🐾',
  '其他': '📋'
}

// Task status display mapping
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  [TASK_STATUS.PENDING]: { label: '待接单', color: '#FF7A45' },
  [TASK_STATUS.IN_PROGRESS]: { label: '进行中', color: '#2684FF' },
  [TASK_STATUS.WAITING_CONFIRM]: { label: '待确认', color: '#FFAB00' },
  [TASK_STATUS.COMPLETED]: { label: '已完成', color: '#36B37E' },
  [TASK_STATUS.CANCELLED]: { label: '已取消', color: '#8C8C9A' },
  [TASK_STATUS.DISPUTED]: { label: '争议中', color: '#FF5630' }
}

// Type-specific badge background colors (lighter/softer versions)
const TYPE_BG_COLORS: Record<string, string> = {
  '取快递': 'rgba(255, 152, 0, 0.10)',
  '接送小孩': 'rgba(76, 175, 80, 0.10)',
  '陪诊': 'rgba(33, 150, 243, 0.10)',
  '陪读': 'rgba(156, 39, 176, 0.10)',
  '代扔垃圾': 'rgba(121, 85, 72, 0.10)',
  '宠物喂养': 'rgba(233, 30, 99, 0.10)',
  '其他': 'rgba(96, 125, 139, 0.10)'
}

interface TaskData {
  _id: string
  task_type: string
  title: string
  description?: string
  reward: number
  community_name?: string
  expected_time?: number
  deadline?: number
  created_at: number
  publisher_avatar?: string
  publisher_name?: string
  status?: string
  [key: string]: any
}

const props = withDefaults(defineProps<{
  /** Task data object */
  task: TaskData
  /** Card size variant */
  size?: 'default' | 'compact' | 'large'
  /** Whether to show the description text */
  showDescription?: boolean
  /** Whether to show the status badge */
  showStatus?: boolean
  /** Animation delay index for staggered entrance */
  animIndex?: number
}>(), {
  size: 'default',
  showDescription: false,
  showStatus: false,
  animIndex: 0
})

const emit = defineEmits<{
  (e: 'tap', id: string): void
}>()

// Computed properties
const typeIcon = computed(() => TYPE_ICONS[props.task.task_type] || '📋')

const typeBadgeStyle = computed(() => {
  const textColor = TASK_TYPE_COLORS[props.task.task_type] || '#607d8b'
  const bgColor = TYPE_BG_COLORS[props.task.task_type] || 'rgba(96, 125, 139, 0.10)'
  return {
    color: textColor,
    backgroundColor: bgColor
  }
})

const rewardDisplay = computed(() => {
  const r = props.task.reward
  if (r >= 1000) return r.toFixed(0)
  if (Number.isInteger(r)) return r.toString()
  return r.toFixed(2)
})

const timeDisplay = computed(() => {
  if (props.task.expected_time) {
    return formatDate(props.task.expected_time, 'MM-DD HH:mm')
  }
  if (props.task.deadline) {
    return '截止 ' + formatDate(props.task.deadline, 'MM-DD HH:mm')
  }
  return ''
})

const relativeTime = computed(() => {
  return formatRelativeTime(props.task.created_at)
})

const isUrgent = computed(() => {
  if (!props.task.deadline) return false
  const hoursLeft = (props.task.deadline - Date.now()) / (1000 * 60 * 60)
  return hoursLeft > 0 && hoursLeft < 4
})

const isCompleted = computed(() => {
  return props.task.status === TASK_STATUS.COMPLETED || props.task.status === TASK_STATUS.CANCELLED
})

const statusLabel = computed(() => {
  return STATUS_MAP[props.task.status || '']?.label || ''
})

const statusColor = computed(() => {
  return STATUS_MAP[props.task.status || '']?.color || '#8C8C9A'
})

function handleTap() {
  emit('tap', props.task._id)
}
</script>

<style lang="scss" scoped>
.task-card {
  position: relative;
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-base;
  margin-bottom: $uni-spacing-md;
  box-shadow: $uni-shadow-card;
  overflow: hidden;
  transition: $uni-transition-fast;
  animation: fadeInUp $uni-animation-duration-base ease-out both;

  &:active {
    transform: scale(0.985);
    box-shadow: $uni-shadow-sm;
  }

  // ── Size Variants ──
  &--compact {
    padding: $uni-spacing-md;

    .task-card__title {
      font-size: $uni-font-size-base;
    }

    .task-card__reward-value {
      font-size: $uni-font-size-lg;
    }
  }

  &--large {
    padding: $uni-spacing-lg;
    border-radius: $uni-border-radius-xl;
    box-shadow: $uni-shadow-base;

    .task-card__title {
      font-size: $uni-font-size-xl;
    }

    .task-card__reward-value {
      font-size: $uni-font-size-xxl;
    }
  }

  // ── State Modifiers ──
  &--urgent {
    border-left: 3px solid $uni-color-error;
  }

  &--completed {
    opacity: 0.7;

    .task-card__title {
      text-decoration: line-through;
      color: $uni-text-color-grey;
    }
  }

  // ── Header ──
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $uni-spacing-sm;
  }

  &__type {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: $uni-border-radius-pill;
    font-size: $uni-font-size-xs;
    font-weight: $uni-font-weight-semibold;
    line-height: 1.4;
  }

  &__type-icon {
    font-size: 12px;
  }

  &__type-text {
    font-size: inherit;
    font-weight: inherit;
    color: inherit;
  }

  &__reward {
    display: flex;
    align-items: baseline;
    font-family: 'DIN Alternate', $uni-font-family;
  }

  &__reward-symbol {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
    margin-right: 1px;
  }

  &__reward-value {
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
    line-height: 1;
  }

  // ── Body ──
  &__body {
    margin-bottom: $uni-spacing-sm;
  }

  &__title {
    display: block;
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    line-height: $uni-line-height-tight;
    margin-bottom: $uni-spacing-xs;
  }

  &__desc {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    line-height: $uni-line-height-base;
  }

  // ── Meta ──
  &__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $uni-spacing-md;
    margin-bottom: $uni-spacing-md;
  }

  &__meta-item {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  &__meta-icon {
    font-size: 12px;
    line-height: 1;
  }

  &__meta-text {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    line-height: 1.2;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: $uni-border-radius-circle;
  }

  &__status-text {
    font-size: $uni-font-size-xs;
    font-weight: $uni-font-weight-medium;
  }

  // ── Footer ──
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: $uni-spacing-sm;
    border-top: 1px solid $uni-border-color-light;
  }

  &__publisher {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }

  &__avatar {
    width: $uni-img-size-sm;
    height: $uni-img-size-sm;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-bg-color-grey;
    flex-shrink: 0;
  }

  &__publisher-name {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-disable;
  }

  // ── Urgent Ribbon ──
  &__urgent-ribbon {
    position: absolute;
    top: 8px;
    right: -24px;
    width: 80px;
    height: 20px;
    background-color: $uni-color-error;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(255, 86, 48, 0.3);
  }

  &__urgent-text {
    font-size: 10px;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color-inverse;
    letter-spacing: 2px;
  }
}

// ── Staggered animation delays ──
@for $i from 0 through 20 {
  .task-card:nth-child(#{$i + 1}) {
    animation-delay: #{$i * 0.04}s;
  }
}
</style>
