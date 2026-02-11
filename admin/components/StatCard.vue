
<template>
  <view class="stat-card" :style="{ borderLeftColor: color }">
    <view class="card-content">
      <text class="card-label">{{ label }}</text>
      <text class="card-value" :style="{ color }">{{ displayValue }}</text>
      <view class="card-trend" v-if="trend !== undefined">
        <text
          class="trend-text"
          :class="{ up: trend > 0, down: trend < 0 }"
        >
          {{ trend > 0 ? '↑' : trend < 0 ? '↓' : '-' }}
          {{ Math.abs(trend).toFixed(1) }}%
        </text>
        <text class="trend-label">较昨日</text>
      </view>
    </view>
    <view class="card-icon" :style="{ backgroundColor: color + '15' }">
      <uni-icons :type="icon" size="24" :color="color"></uni-icons>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: number | string
  icon?: string
  color?: string
  trend?: number
  prefix?: string
  suffix?: string
}>(), {
  icon: 'info',
  color: '#409EFF',
  prefix: '',
  suffix: ''
})

const displayValue = computed(() => {
  return `${props.prefix}${props.value}${props.suffix}`
})
</script>

<style lang="scss" scoped>
.stat-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #409EFF;

  .card-content {
    flex: 1;

    .card-label {
      display: block;
      font-size: 13px;
      color: #909399;
      margin-bottom: 8px;
    }

    .card-value {
      display: block;
      font-size: 28px;
      font-weight: 700;
      color: #333;
      margin-bottom: 8px;
    }

    .card-trend {
      display: flex;
      align-items: center;
      gap: 4px;

      .trend-text {
        font-size: 12px;
        color: #909399;

        &.up { color: #67C23A; }
        &.down { color: #F56C6C; }
      }

      .trend-label {
        font-size: 11px;
        color: #C0C4CC;
      }
    }
  }

  .card-icon {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
}
</style>
