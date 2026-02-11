
<template>
  <view v-if="visible" class="detail-modal-mask" @tap="close">
    <view class="detail-modal" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">{{ title }}</text>
        <text class="modal-close" @tap="close">×</text>
      </view>
      <scroll-view class="modal-body" scroll-y>
        <slot></slot>
      </scroll-view>
      <view class="modal-footer" v-if="$slots.footer">
        <slot name="footer"></slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  title: string
}>()

const emit = defineEmits(['close'])

function close() {
  emit('close')
}
</script>

<style lang="scss" scoped>
.detail-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.detail-modal {
  width: 90%;
  max-width: 640px;
  max-height: 80vh;
  background-color: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #ebeef5;

    .modal-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .modal-close {
      font-size: 22px;
      color: #909399;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;

      &:hover { color: #333; }
    }
  }

  .modal-body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    max-height: 60vh;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 20px;
    border-top: 1px solid #ebeef5;
  }
}
</style>
