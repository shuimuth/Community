
<template>
  <view class="page-header" :class="headerClasses" :style="headerStyle">
    <!-- Status bar placeholder -->
    <view class="page-header__statusbar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- Navigation bar content -->
    <view class="page-header__navbar">
      <!-- Left area: back button or custom slot -->
      <view class="page-header__left" @tap="handleLeftTap">
        <slot name="left">
          <view v-if="showBack" class="page-header__back pressable">
            <text class="page-header__back-icon">‹</text>
          </view>
        </slot>
      </view>

      <!-- Center area: title or custom slot -->
      <view class="page-header__center">
        <slot name="center">
          <!-- Search bar mode -->
          <view
            v-if="mode === 'search'"
            class="page-header__search"
            @tap="$emit('search')"
          >
            <text class="page-header__search-icon">🔍</text>
            <text class="page-header__search-placeholder">{{ placeholder || '搜索' }}</text>
          </view>
          <!-- Default title mode -->
          <text
            v-else
            class="page-header__title text-ellipsis"
            :class="{ 'page-header__title--light': isLightText }"
          >{{ title }}</text>
        </slot>
      </view>

      <!-- Right area: action buttons or custom slot -->
      <view class="page-header__right">
        <slot name="right"></slot>
      </view>
    </view>
  </view>

  <!-- Placeholder to prevent content from being hidden behind fixed header -->
  <view
    v-if="fixed && !float"
    class="page-header__placeholder"
    :style="{ height: totalHeight + 'px' }"
  ></view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

/**
 * PageHeader — Unified custom navigation bar component
 *
 * Handles status bar height, back navigation, title display,
 * and various visual modes (solid/transparent/gradient).
 * 
 * Usage:
 *   <PageHeader title="Page Title" />
 *   <PageHeader mode="transparent" float :show-back="true" />
 *   <PageHeader mode="search" placeholder="Search tasks" @search="onSearch" />
 */

const props = withDefaults(defineProps<{
  /** Page title text */
  title?: string
  /** Visual mode */
  mode?: 'solid' | 'transparent' | 'gradient' | 'search'
  /** Custom background color (overrides mode) */
  bgColor?: string
  /** Whether to show the back button */
  showBack?: boolean
  /** Whether the header is fixed positioned */
  fixed?: boolean
  /** Whether the header floats over content (no placeholder) */
  float?: boolean
  /** Search mode placeholder text */
  placeholder?: string
  /** Custom navbar height in px */
  navbarHeight?: number
  /** Border bottom visibility */
  borderBottom?: boolean
}>(), {
  title: '',
  mode: 'solid',
  bgColor: '',
  showBack: true,
  fixed: true,
  float: false,
  placeholder: '搜索',
  navbarHeight: 44,
  borderBottom: false
})

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'search'): void
  (e: 'left-tap'): void
}>()

// Status bar height
const statusBarHeight = ref(20)

onMounted(() => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 20
  } catch (e) {
    statusBarHeight.value = 20
  }
})

// Total header height (status bar + navbar)
const totalHeight = computed(() => {
  return statusBarHeight.value + props.navbarHeight
})

// Whether to use light (white) text
const isLightText = computed(() => {
  return props.mode === 'gradient' || props.mode === 'transparent'
})

// Dynamic header classes
const headerClasses = computed(() => {
  return [
    `page-header--${props.mode}`,
    {
      'page-header--fixed': props.fixed,
      'page-header--float': props.float,
      'page-header--bordered': props.borderBottom && props.mode === 'solid'
    }
  ]
})

// Dynamic header styles
const headerStyle = computed(() => {
  const styles: Record<string, string> = {}

  if (props.bgColor) {
    styles.background = props.bgColor
  }

  return styles
})

// Handle left area tap
function handleLeftTap() {
  if (props.showBack) {
    // Check if there are pages to go back
    const pages = getCurrentPages()
    if (pages.length > 1) {
      uni.navigateBack()
    } else {
      // Fallback: switch to home tab
      uni.switchTab({ url: '/pages/index/index' })
    }
    emit('back')
  }
  emit('left-tap')
}
</script>

<style lang="scss" scoped>
.page-header {
  width: 100%;
  z-index: $uni-z-index-sticky;

  // ── Mode: Solid (default white background) ──
  &--solid {
    background-color: $uni-bg-color;
  }

  // ── Mode: Transparent ──
  &--transparent {
    background-color: transparent;
  }

  // ── Mode: Gradient (brand gradient) ──
  &--gradient {
    background: $brand-gradient;
  }

  // ── Mode: Search (white with search bar) ──
  &--search {
    background-color: $uni-bg-color;
  }

  // ── Fixed position ──
  &--fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
  }

  // ── Float over content ──
  &--float {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
  }

  // ── Border bottom ──
  &--bordered {
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background-color: $uni-border-color-light;
    }
  }

  // ── Status bar ──
  &__statusbar {
    width: 100%;
  }

  // ── Navbar ──
  &__navbar {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 $uni-spacing-md;
    position: relative;
  }

  // ── Left area ──
  &__left {
    flex-shrink: 0;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  &__back {
    width: 36px;
    height: 36px;
    border-radius: $uni-border-radius-circle;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: $uni-transition-fast;

    // Glassmorphism effect for transparent/gradient mode
    .page-header--transparent &,
    .page-header--gradient & {
      background-color: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
    }

    .page-header--solid &,
    .page-header--search & {
      background-color: transparent;
    }

    &:active {
      background-color: $uni-bg-color-hover;
    }
  }

  &__back-icon {
    font-size: 28px;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color;
    line-height: 1;
    margin-top: -2px;

    .page-header--transparent &,
    .page-header--gradient & {
      color: $uni-text-color-inverse;
    }
  }

  // ── Center area ──
  &__center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    padding: 0 $uni-spacing-sm;
  }

  &__title {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    text-align: center;
    max-width: 100%;

    &--light {
      color: $uni-text-color-inverse;
    }
  }

  // ── Search bar ──
  &__search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    padding: $uni-spacing-sm $uni-spacing-md;
    background-color: $uni-bg-color-input;
    border-radius: $uni-border-radius-pill;
    transition: $uni-transition-fast;

    &:active {
      background-color: $uni-bg-color-hover;
    }
  }

  &__search-icon {
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
  }

  &__search-placeholder {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-placeholder;
    line-height: 1.2;
  }

  // ── Right area ──
  &__right {
    flex-shrink: 0;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: $uni-spacing-xs;
  }

  // ── Placeholder ──
  &__placeholder {
    width: 100%;
    flex-shrink: 0;
  }
}

// ── Right area icon button utility ──
// Use this class on elements placed inside the right slot
:deep(.page-header-action) {
  width: 36px;
  height: 36px;
  border-radius: $uni-border-radius-circle;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: $uni-transition-fast;

  &:active {
    background-color: $uni-bg-color-hover;
  }
}
</style>
