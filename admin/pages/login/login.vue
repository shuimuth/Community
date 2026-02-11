
<template>
  <view class="login-page">
    <view class="login-card">
      <view class="login-header">
        <text class="login-title">社区任务平台</text>
        <text class="login-subtitle">管理后台</text>
      </view>

      <view class="login-form">
        <view class="form-item">
          <text class="form-label">管理员账号</text>
          <input
            class="form-input"
            v-model="formData.username"
            placeholder="请输入管理员账号"
            maxlength="30"
          />
        </view>
        <view class="form-item">
          <text class="form-label">密码</text>
          <input
            class="form-input"
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            maxlength="30"
            @confirm="handleLogin"
          />
        </view>

        <button
          class="login-btn"
          :disabled="loading"
          @tap="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </view>

      <text class="login-footer">© 2024 社区任务平台 · 管理后台</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAdminStore } from '@/store/admin'

const adminStore = useAdminStore()
const loading = ref(false)

const formData = reactive({
  username: '',
  password: ''
})

async function handleLogin() {
  if (!formData.username || !formData.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // Use uni-id-co for admin login
    const uniIdCo = uniCloud.importObject('uni-id-co')
    const res = await uniIdCo.login({
      username: formData.username,
      password: formData.password
    })

    if (res.errCode) {
      uni.showToast({ title: res.errMsg || '登录失败', icon: 'none' })
      return
    }

    // Check if user has admin role
    const token = res.newToken?.token || res.token
    adminStore.setToken(token)

    // Get admin user info
    const db = uniCloud.database()
    const userRes = await db.collection('uni-id-users')
      .where({ _id: res.uid })
      .field({ nickname: 1, username: 1, avatar: 1, role: 1 })
      .get()

    const user = userRes.result?.data?.[0]
    if (!user || !user.role || (!user.role.includes('admin') && !user.role.includes('super_admin'))) {
      adminStore.logout()
      uni.showToast({ title: '您没有管理员权限', icon: 'none' })
      return
    }

    adminStore.setAdminInfo(user)
    uni.showToast({ title: '登录成功', icon: 'success' })
    uni.reLaunch({ url: '/pages/index/index' })
  } catch (e: any) {
    console.error('Admin login error:', e)
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background-color: #fff;
  border-radius: 12px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);

  .login-header {
    text-align: center;
    margin-bottom: 36px;

    .login-title {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 8px;
    }

    .login-subtitle {
      display: block;
      font-size: 14px;
      color: #909399;
    }
  }

  .login-form {
    .form-item {
      margin-bottom: 20px;

      .form-label {
        display: block;
        font-size: 13px;
        color: #606266;
        margin-bottom: 8px;
      }

      .form-input {
        width: 100%;
        height: 44px;
        padding: 0 14px;
        border: 1px solid #DCDFE6;
        border-radius: 6px;
        font-size: 14px;
        color: #333;
        background-color: #f9f9f9;
        transition: border-color 0.2s;

        &:focus {
          border-color: #409EFF;
          background-color: #fff;
        }
      }
    }
  }

  .login-btn {
    width: 100%;
    height: 44px;
    line-height: 44px;
    background-color: #409EFF;
    color: #fff;
    font-size: 16px;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    margin-top: 12px;

    &:active {
      background-color: #3a8ee6;
    }

    &[disabled] {
      opacity: 0.6;
    }

    &::after {
      border: none;
    }
  }

  .login-footer {
    display: block;
    text-align: center;
    font-size: 12px;
    color: #C0C4CC;
    margin-top: 32px;
  }
}
</style>
