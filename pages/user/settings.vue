<template>
  <view class="settings-page">
    <!-- Account Section -->
    <view class="section animate-fade-in-up" style="animation-delay: 0.05s">
      <view class="section__header">
        <text class="section__title">账户设置</text>
      </view>
      <view class="section__card">
        <view class="menu-item" @tap="navigateToUserInfo">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background-color: rgba(255, 122, 69, 0.1)">
              <text class="menu-item__emoji">👤</text>
            </view>
            <text class="menu-item__text">个人资料</text>
          </view>
          <view class="menu-item__right">
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
        <view class="menu-item" @tap="navigateToChangePwd">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background-color: rgba(24, 144, 255, 0.1)">
              <text class="menu-item__emoji">🔑</text>
            </view>
            <text class="menu-item__text">修改密码</text>
          </view>
          <view class="menu-item__right">
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- About Section -->
    <view class="section animate-fade-in-up" style="animation-delay: 0.1s">
      <view class="section__header">
        <text class="section__title">关于</text>
      </view>
      <view class="section__card">
        <view class="menu-item" @tap="showAbout">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background-color: rgba(82, 196, 26, 0.1)">
              <text class="menu-item__emoji">💡</text>
            </view>
            <text class="menu-item__text">关于我们</text>
          </view>
          <view class="menu-item__right">
            <view class="menu-item__badge">v1.0.0</view>
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
        <view class="menu-item" @tap="openAgreement">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background-color: rgba(114, 46, 209, 0.1)">
              <text class="menu-item__emoji">📄</text>
            </view>
            <text class="menu-item__text">用户协议</text>
          </view>
          <view class="menu-item__right">
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
        <view class="menu-item" @tap="openPrivacy">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background-color: rgba(250, 173, 20, 0.1)">
              <text class="menu-item__emoji">🛡️</text>
            </view>
            <text class="menu-item__text">隐私政策</text>
          </view>
          <view class="menu-item__right">
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Cache Section -->
    <view class="section animate-fade-in-up" style="animation-delay: 0.15s">
      <view class="section__header">
        <text class="section__title">其他</text>
      </view>
      <view class="section__card">
        <view class="menu-item" @tap="clearCache">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background-color: rgba(245, 34, 45, 0.08)">
              <text class="menu-item__emoji">🗑️</text>
            </view>
            <text class="menu-item__text">清除缓存</text>
          </view>
          <view class="menu-item__right">
            <text class="menu-item__desc">{{ cacheSize }}</text>
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Logout Button -->
    <view class="logout-section animate-fade-in-up" style="animation-delay: 0.2s">
      <view class="logout-btn" @tap="handleLogout">
        <text class="logout-btn__text">退出登录</text>
      </view>
    </view>

    <!-- Footer -->
    <view class="footer animate-fade-in-up" style="animation-delay: 0.25s">
      <text class="footer__text">社区任务平台 © 2024</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { showConfirm } from '@/utils/common'

const userStore = useUserStore()
const cacheSize = ref('0 KB')

onShow(() => {
  getStorageInfo()
})

function getStorageInfo() {
  try {
    const res = uni.getStorageInfoSync()
    const size = res.currentSize || 0
    if (size >= 1024) {
      cacheSize.value = (size / 1024).toFixed(1) + ' MB'
    } else {
      cacheSize.value = size + ' KB'
    }
  } catch (e) {
    cacheSize.value = '0 KB'
  }
}

function navigateToUserInfo() {
  uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo' })
}

function navigateToChangePwd() {
  uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd' })
}

function showAbout() {
  uni.showModal({
    title: '社区任务平台',
    content: '版本 v1.0.0\n让邻里互助更简单',
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#FF7A45'
  })
}

function openAgreement() {
  // TODO: Navigate to user agreement page
  uni.showToast({ title: '即将上线', icon: 'none' })
}

function openPrivacy() {
  // TODO: Navigate to privacy policy page
  uni.showToast({ title: '即将上线', icon: 'none' })
}

async function clearCache() {
  const confirmed = await showConfirm('确定要清除本地缓存吗？')
  if (!confirmed) return

  try {
    uni.clearStorageSync()
    cacheSize.value = '0 KB'
    uni.showToast({ title: '清除成功', icon: 'success' })
  } catch (e) {
    console.error('Clear cache error:', e)
  }
}

async function handleLogout() {
  const confirmed = await showConfirm('确定要退出登录吗？')
  if (!confirmed) return

  try {
    uni.showLoading({ title: '退出中...' })
    const uniIdCo = uniCloud.importObject('uni-id-co')
    await uniIdCo.logout()
  } catch (e) {
    console.error('Logout error:', e)
  } finally {
    uni.hideLoading()
  }

  userStore.logout()
  uni.reLaunch({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' })
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background-color: $uni-bg-color-page;
  padding-bottom: calc(env(safe-area-inset-bottom) + 40rpx);
}

// ══════════════════════════════════════════
// Section
// ══════════════════════════════════════════
.section {
  margin-bottom: $uni-spacing-xs;

  &__header {
    padding: $uni-spacing-md $uni-spacing-lg $uni-spacing-xs;
  }

  &__title {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-placeholder;
    font-weight: $uni-font-weight-medium;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  &__card {
    background-color: #fff;
    margin: 0 $uni-spacing-md;
    border-radius: $uni-border-radius-lg;
    overflow: hidden;
    box-shadow: $uni-shadow-sm;
  }
}

// ══════════════════════════════════════════
// Menu Item
// ══════════════════════════════════════════
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $uni-spacing-md;
  position: relative;
  transition: $uni-transition-fast;

  &:active {
    background-color: $uni-bg-color-hover;
  }

  // Divider between items
  & + & {
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 60px;
      right: $uni-spacing-md;
      height: 1rpx;
      background-color: $uni-border-color-light;
    }
  }

  &__left {
    display: flex;
    align-items: center;
    gap: $uni-spacing-sm;
    flex: 1;
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: $uni-border-radius-base;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__emoji {
    font-size: 18px;
    line-height: 1;
  }

  &__text {
    font-size: $uni-font-size-base;
    color: $uni-text-color;
    font-weight: $uni-font-weight-regular;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $uni-spacing-xs;
  }

  &__badge {
    font-size: $uni-font-size-xs;
    color: $uni-color-primary;
    background-color: rgba($uni-color-primary, 0.08);
    padding: 2px 8px;
    border-radius: $uni-border-radius-pill;
    font-weight: $uni-font-weight-medium;
  }

  &__desc {
    font-size: $uni-font-size-sm;
    color: $uni-text-color-placeholder;
  }

  &__arrow {
    font-size: 20px;
    color: $uni-text-color-disabled;
    font-weight: 300;
    line-height: 1;
  }
}

// ══════════════════════════════════════════
// Logout
// ══════════════════════════════════════════
.logout-section {
  padding: $uni-spacing-xl $uni-spacing-lg 0;
}

.logout-btn {
  background-color: #fff;
  border-radius: $uni-border-radius-lg;
  padding: $uni-spacing-md;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $uni-shadow-sm;
  border: 1rpx solid rgba(245, 34, 45, 0.12);
  transition: $uni-transition-fast;

  &:active {
    transform: scale(0.98);
    background-color: rgba(245, 34, 45, 0.04);
  }

  &__text {
    font-size: $uni-font-size-base;
    color: #f5222d;
    font-weight: $uni-font-weight-medium;
  }
}

// ══════════════════════════════════════════
// Footer
// ══════════════════════════════════════════
.footer {
  padding: $uni-spacing-xl 0;
  display: flex;
  justify-content: center;

  &__text {
    font-size: $uni-font-size-xs;
    color: $uni-text-color-disabled;
  }
}
</style>
