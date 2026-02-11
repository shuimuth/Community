<template>
  <view class="detail-page">
    <!-- Loading skeleton -->
    <view v-if="loading" class="detail-page__loading">
      <view class="skeleton-card" style="height: 200px;"></view>
      <view class="skeleton-card" style="height: 120px;"></view>
      <view class="skeleton-card" style="height: 120px;"></view>
    </view>

    <!-- Empty / not found -->
    <EmptyState
      v-else-if="!task"
      type="error"
      title="任务不存在"
      description="该任务可能已被删除或链接无效"
      action-text="返回首页"
      action-type="primary"
      @action="goHome"
    />

    <template v-else>
      <!-- Hero section: type + status + reward -->
      <view class="detail-hero anim-fade-in">
        <view class="detail-hero__top flex-between">
          <view class="detail-hero__type" :style="typeBadgeStyle">
            <text class="detail-hero__type-icon">{{ typeIcon }}</text>
            <text class="detail-hero__type-text">{{ task.task_type }}{{ task.custom_type ? ` · ${task.custom_type}` : '' }}</text>
          </view>
          <view class="detail-hero__status" :style="statusStyle">
            <text class="detail-hero__status-dot" :style="{ backgroundColor: getStatusColor(task.status) }"></text>
            <text class="detail-hero__status-text">{{ getStatusText(task.status) }}</text>
          </view>
        </view>

        <text class="detail-hero__title">{{ task.title }}</text>

        <view class="detail-hero__reward">
          <text class="detail-hero__reward-label">任务报酬</text>
          <view class="detail-hero__reward-value">
            <text class="detail-hero__reward-symbol">¥</text>
            <text class="detail-hero__reward-amount">{{ task.reward }}</text>
          </view>
        </view>
      </view>

      <!-- Description card -->
      <view class="detail-section anim-fade-in-up anim-delay-1">
        <text class="detail-section__label">📄 任务描述</text>
        <text class="detail-section__desc">{{ task.description || '暂无详细描述' }}</text>

        <!-- Task images -->
        <view v-if="task.images && task.images.length > 0" class="detail-images">
          <image
            v-for="(img, idx) in task.images"
            :key="idx"
            :src="img"
            class="detail-images__item"
            mode="aspectFill"
            lazy-load
            @tap="previewImage(idx)"
          />
        </view>
      </view>

      <!-- Meta info card -->
      <view class="detail-section anim-fade-in-up anim-delay-2">
        <text class="detail-section__label">📋 任务信息</text>
        <view class="detail-meta">
          <view class="detail-meta__item">
            <text class="detail-meta__icon">📍</text>
            <text class="detail-meta__key">任务地点</text>
            <text class="detail-meta__val">{{ task.community_name }} {{ task.address || '' }}</text>
          </view>
          <view v-if="task.expected_time" class="detail-meta__item">
            <text class="detail-meta__icon">⏰</text>
            <text class="detail-meta__key">期望完成</text>
            <text class="detail-meta__val">{{ formatDate(task.expected_time) }}</text>
          </view>
          <view class="detail-meta__item">
            <text class="detail-meta__icon">📅</text>
            <text class="detail-meta__key">发布时间</text>
            <text class="detail-meta__val">{{ formatDate(task.created_at) }}</text>
          </view>
        </view>
      </view>

      <!-- Publisher card -->
      <view v-if="task.publisher" class="detail-person anim-fade-in-up anim-delay-3">
        <text class="detail-person__label">👤 发布者</text>
        <view class="detail-person__card pressable" @tap="goProfile(task.publisher._id)">
          <image
            :src="task.publisher.avatar || '/static/default-avatar.png'"
            class="detail-person__avatar"
            mode="aspectFill"
          />
          <view class="detail-person__info">
            <text class="detail-person__name">{{ task.publisher.nickname || '匿名用户' }}</text>
            <view class="detail-person__stats">
              <view class="detail-person__credit">
                <text class="detail-person__credit-label">信用</text>
                <text class="detail-person__credit-score">{{ task.publisher.credit_score || 100 }}</text>
              </view>
              <text class="detail-person__divider">|</text>
              <text class="detail-person__count">发布 {{ task.publisher.task_published_count || 0 }} 个任务</text>
            </view>
          </view>
          <text class="detail-person__arrow">›</text>
        </view>

        <!-- Contact button -->
        <view
          v-if="task.is_receiver && task.publisher.mobile"
          class="detail-person__contact pressable"
          @tap="callPublisher"
        >
          <text class="detail-person__contact-icon">📞</text>
          <text class="detail-person__contact-text">联系发布者</text>
        </view>
      </view>

      <!-- Receiver card -->
      <view v-if="task.receiver" class="detail-person anim-fade-in-up anim-delay-4">
        <text class="detail-person__label">🤝 接单者</text>
        <view class="detail-person__card pressable" @tap="goProfile(task.receiver._id)">
          <image
            :src="task.receiver.avatar || '/static/default-avatar.png'"
            class="detail-person__avatar"
            mode="aspectFill"
          />
          <view class="detail-person__info">
            <text class="detail-person__name">{{ task.receiver.nickname || '匿名用户' }}</text>
            <view class="detail-person__stats">
              <view class="detail-person__credit">
                <text class="detail-person__credit-label">信用</text>
                <text class="detail-person__credit-score">{{ task.receiver.credit_score || 100 }}</text>
              </view>
              <text class="detail-person__divider">|</text>
              <text class="detail-person__count">完成 {{ task.receiver.task_completed_count || 0 }} 个任务</text>
            </view>
          </view>
          <text class="detail-person__arrow">›</text>
        </view>
      </view>

      <!-- Bottom spacer -->
      <view class="bottom-bar-spacer"></view>
    </template>

    <!-- Bottom action bar -->
    <view v-if="task && !loading" class="detail-action safe-area-bottom">
      <!-- Publisher actions -->
      <template v-if="task.is_publisher">
        <view v-if="task.status === 'pending'" class="detail-action__btn detail-action__btn--ghost pressable" @tap="handleCancel">
          <text class="detail-action__btn-text">取消任务</text>
        </view>
        <view v-if="task.status === 'waiting_confirm'" class="detail-action__btn detail-action__btn--ghost pressable" @tap="handleDispute">
          <text class="detail-action__btn-text">申诉</text>
        </view>
        <view v-if="task.status === 'waiting_confirm'" class="detail-action__btn detail-action__btn--primary pressable" @tap="handleConfirm">
          <text class="detail-action__btn-text detail-action__btn-text--white">确认完成</text>
        </view>
      </template>

      <!-- Receiver actions -->
      <template v-else-if="task.is_receiver">
        <view v-if="task.status === 'in_progress'" class="detail-action__btn detail-action__btn--primary pressable" @tap="handleReceiverComplete">
          <text class="detail-action__btn-text detail-action__btn-text--white">确认完成</text>
        </view>
      </template>

      <!-- Other user actions -->
      <template v-else>
        <view
          v-if="task.status === 'pending'"
          class="detail-action__btn detail-action__btn--primary pressable"
          :class="{ 'detail-action__btn--loading': accepting }"
          @tap="handleAccept"
        >
          <text class="detail-action__btn-text detail-action__btn-text--white">
            {{ accepting ? '接单中...' : '💪 立即接单' }}
          </text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { formatDate as formatDateFn, showToast, showConfirm, getTaskStatusText, getTaskStatusColor } from '@/utils/common'
import { TASK_TYPE_COLORS } from '@/utils/constants'

const userStore = useUserStore()
const task = ref<any>(null)
const loading = ref(true)
const accepting = ref(false)
const taskId = ref('')

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

const TYPE_BG_COLORS: Record<string, string> = {
  '取快递': 'rgba(255, 152, 0, 0.10)',
  '接送小孩': 'rgba(76, 175, 80, 0.10)',
  '陪诊': 'rgba(33, 150, 243, 0.10)',
  '陪读': 'rgba(156, 39, 176, 0.10)',
  '代扔垃圾': 'rgba(121, 85, 72, 0.10)',
  '宠物喂养': 'rgba(233, 30, 99, 0.10)',
  '其他': 'rgba(96, 125, 139, 0.10)'
}

const STATUS_BG: Record<string, string> = {
  pending: 'rgba(255, 122, 69, 0.08)',
  in_progress: 'rgba(38, 132, 255, 0.08)',
  waiting_confirm: 'rgba(255, 171, 0, 0.08)',
  completed: 'rgba(54, 179, 126, 0.08)',
  cancelled: 'rgba(140, 140, 154, 0.08)',
  disputed: 'rgba(255, 86, 48, 0.08)'
}

const typeIcon = computed(() => {
  return TYPE_ICONS[task.value?.task_type] || '📋'
})

const typeBadgeStyle = computed(() => {
  const type = task.value?.task_type || ''
  return {
    color: TASK_TYPE_COLORS[type] || '#607d8b',
    backgroundColor: TYPE_BG_COLORS[type] || 'rgba(96, 125, 139, 0.10)'
  }
})

const statusStyle = computed(() => {
  const status = task.value?.status || ''
  return {
    backgroundColor: STATUS_BG[status] || 'rgba(140, 140, 154, 0.08)'
  }
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  taskId.value = currentPage.$page?.options?.id || currentPage.options?.id || ''

  if (taskId.value) {
    loadTaskDetail()
  } else {
    loading.value = false
  }
})

async function loadTaskDetail() {
  loading.value = true
  try {
    const taskQuery = uniCloud.importObject('task-query')
    task.value = await taskQuery.getTaskDetail({ task_id: taskId.value })
  } catch (err: any) {
    console.error('Load task detail error:', err)
    showToast('加载任务详情失败')
  } finally {
    loading.value = false
  }
}

function getStatusText(status: string): string {
  return getTaskStatusText(status)
}

function getStatusColor(status: string): string {
  return getTaskStatusColor(status)
}

function formatDate(ts: number): string {
  return formatDateFn(ts, 'YYYY-MM-DD HH:mm')
}

function previewImage(index: number) {
  uni.previewImage({
    current: index,
    urls: task.value.images
  })
}

function goProfile(userId: string) {
  uni.navigateTo({ url: `/pages/user/profile?id=${userId}` })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function callPublisher() {
  if (task.value?.publisher?.mobile) {
    uni.makePhoneCall({ phoneNumber: task.value.publisher.mobile })
  }
}

async function handleAccept() {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withpwd' })
    return
  }

  if (!userStore.userInfo?.is_verified) {
    const confirmed = await showConfirm('接单需要完成实名认证，是否去认证？')
    if (confirmed) {
      uni.navigateTo({ url: '/pages/user/verify' })
    }
    return
  }

  const confirmed = await showConfirm(`确定接受此任务？报酬 ¥${task.value.reward}`)
  if (!confirmed) return

  accepting.value = true
  try {
    const taskService = uniCloud.importObject('task-service')
    await taskService.acceptTask({ task_id: taskId.value })
    showToast('接单成功！', 'success')
    await loadTaskDetail()
  } catch (err: any) {
    showToast(err.message || '接单失败')
  } finally {
    accepting.value = false
  }
}

async function handleCancel() {
  const confirmed = await showConfirm('确定取消该任务？取消后报酬将退还')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '处理中...' })
    const taskFlow = uniCloud.importObject('task-flow')
    await taskFlow.cancelTask({ task_id: taskId.value })
    showToast('任务已取消', 'success')
    await loadTaskDetail()
  } catch (err: any) {
    showToast(err.message || '取消失败')
  } finally {
    uni.hideLoading()
  }
}

async function handleReceiverComplete() {
  const confirmed = await showConfirm('确认任务已完成？')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '处理中...' })
    const taskFlow = uniCloud.importObject('task-flow')
    await taskFlow.receiverConfirm({ task_id: taskId.value })
    showToast('已提交完成确认', 'success')
    await loadTaskDetail()
  } catch (err: any) {
    showToast(err.message || '操作失败')
  } finally {
    uni.hideLoading()
  }
}

async function handleConfirm() {
  const confirmed = await showConfirm('确认任务已完成？报酬将转给接单者')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '处理中...' })
    const taskFlow = uniCloud.importObject('task-flow')
    await taskFlow.publisherConfirm({ task_id: taskId.value })
    showToast('已确认完成', 'success')
    await loadTaskDetail()
  } catch (err: any) {
    showToast(err.message || '操作失败')
  } finally {
    uni.hideLoading()
  }
}

async function handleDispute() {
  const confirmed = await showConfirm('确定对此任务发起申诉？')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '处理中...' })
    const taskFlow = uniCloud.importObject('task-flow')
    await taskFlow.dispute({ task_id: taskId.value })
    showToast('已发起申诉', 'success')
    await loadTaskDetail()
  } catch (err: any) {
    showToast(err.message || '操作失败')
  } finally {
    uni.hideLoading()
  }
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding: $uni-spacing-md $uni-spacing-base;
  padding-bottom: 0;
}

/* ── Loading skeleton ── */
.detail-page__loading {
  display: flex;
  flex-direction: column;
  gap: $uni-spacing-md;
  padding-top: $uni-spacing-base;
}

/* ── Hero section ── */
.detail-hero {
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-xl;
  padding: $uni-spacing-lg;
  margin-bottom: $uni-spacing-md;
  box-shadow: $uni-shadow-base;

  &__top {
    margin-bottom: $uni-spacing-md;
  }

  &__type {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 14px;
    border-radius: $uni-border-radius-pill;
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
  }

  &__type-icon {
    font-size: 13px;
  }

  &__type-text {
    font-size: inherit;
    color: inherit;
    font-weight: inherit;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: $uni-border-radius-pill;
  }

  &__status-dot {
    width: 7px;
    height: 7px;
    border-radius: $uni-border-radius-circle;
  }

  &__status-text {
    font-size: $uni-font-size-xs;
    font-weight: $uni-font-weight-medium;
    color: $uni-text-color-secondary;
  }

  &__title {
    display: block;
    font-size: $uni-font-size-xl;
    font-weight: $uni-font-weight-bold;
    color: $uni-text-color;
    line-height: $uni-line-height-tight;
    margin-bottom: $uni-spacing-lg;
  }

  &__reward {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $uni-spacing-md $uni-spacing-base;
    background: $uni-color-primary-pale;
    border-radius: $uni-border-radius-lg;
  }

  &__reward-label {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-secondary;
    font-weight: $uni-font-weight-medium;
  }

  &__reward-value {
    display: flex;
    align-items: baseline;
    font-family: 'DIN Alternate', $uni-font-family;
  }

  &__reward-symbol {
    font-size: $uni-font-size-lg;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
    margin-right: 2px;
  }

  &__reward-amount {
    font-size: $uni-font-size-display;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
    line-height: 1;
  }
}

/* ── Section card ── */
.detail-section {
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-xl;
  padding: $uni-spacing-lg;
  margin-bottom: $uni-spacing-md;
  box-shadow: $uni-shadow-card;

  &__label {
    display: block;
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-md;
  }

  &__desc {
    display: block;
    font-size: $uni-font-size-base;
    color: $uni-text-color-secondary;
    line-height: $uni-line-height-loose;
  }
}

/* ── Images grid ── */
.detail-images {
  display: flex;
  flex-wrap: wrap;
  gap: $uni-spacing-sm;
  margin-top: $uni-spacing-md;

  &__item {
    width: calc(33.33% - 6px);
    aspect-ratio: 1;
    border-radius: $uni-border-radius-base;
    background-color: $uni-bg-color-grey;
    overflow: hidden;
  }
}

/* ── Meta info list ── */
.detail-meta {
  display: flex;
  flex-direction: column;
  gap: $uni-spacing-md;

  &__item {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }

  &__icon {
    font-size: 16px;
    line-height: 1;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  &__key {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-grey;
    flex-shrink: 0;
    min-width: 60px;
  }

  &__val {
    font-size: $uni-font-size-sm;
    color: $uni-text-color;
    font-weight: $uni-font-weight-medium;
    flex: 1;
    min-width: 0;
  }
}

/* ── Person card ── */
.detail-person {
  background-color: $uni-bg-color-card;
  border-radius: $uni-border-radius-xl;
  padding: $uni-spacing-lg;
  margin-bottom: $uni-spacing-md;
  box-shadow: $uni-shadow-card;

  &__label {
    display: block;
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;
    margin-bottom: $uni-spacing-md;
  }

  &__card {
    display: flex;
    align-items: center;
    gap: $uni-spacing-md;
    padding: $uni-spacing-md;
    background-color: $uni-bg-color-grey;
    border-radius: $uni-border-radius-lg;
    transition: $uni-transition-fast;
  }

  &__avatar {
    width: 52px;
    height: 52px;
    border-radius: $uni-border-radius-circle;
    background-color: $uni-bg-color-hover;
    flex-shrink: 0;
    border: 2px solid $uni-bg-color;
    box-shadow: $uni-shadow-sm;
  }

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
  }

  &__stats {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
  }

  &__credit {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  &__credit-label {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-grey;
  }

  &__credit-score {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-bold;
    color: $uni-color-primary;
  }

  &__divider {
    font-size: $uni-font-size-xs;
    color: $uni-border-color;
  }

  &__count {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-grey;
  }

  &__arrow {
    font-size: 22px;
    color: $uni-text-color-disable;
    font-weight: $uni-font-weight-medium;
    flex-shrink: 0;
  }

  &__contact {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $uni-spacing-sm;
    margin-top: $uni-spacing-md;
    padding: $uni-spacing-md;
    background-color: $uni-color-primary-pale;
    border: 1px solid $uni-color-primary-lighter;
    border-radius: $uni-border-radius-lg;
    transition: $uni-transition-fast;
  }

  &__contact-icon {
    font-size: 16px;
  }

  &__contact-text {
    font-size: $uni-font-size-sm;
    font-weight: $uni-font-weight-semibold;
    color: $uni-color-primary;
  }
}

/* ── Bottom action bar ── */
.detail-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: $uni-spacing-md;
  padding: $uni-spacing-md $uni-spacing-base;
  padding-bottom: calc(#{$uni-spacing-md} + env(safe-area-inset-bottom));
  background-color: $uni-bg-color;
  box-shadow: 0 -2px 16px rgba(26, 26, 46, 0.06);
  z-index: $uni-z-index-fixed;

  &__btn {
    flex: 1;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $uni-border-radius-pill;
    transition: $uni-transition-base;

    &--primary {
      background: $brand-gradient;
      box-shadow: 0 4px 16px rgba(255, 122, 69, 0.25);
    }

    &--ghost {
      flex: 0 0 auto;
      padding: 0 $uni-spacing-xl;
      background-color: $uni-bg-color-grey;
      border: 1px solid $uni-border-color-light;
    }

    &--loading {
      opacity: $uni-opacity-hover;
      pointer-events: none;
    }

    &:active {
      transform: scale(0.97);
    }
  }

  &__btn-text {
    font-size: $uni-font-size-base;
    font-weight: $uni-font-weight-semibold;
    color: $uni-text-color;

    &--white {
      color: $uni-text-color-inverse;
    }
  }
}
</style>
