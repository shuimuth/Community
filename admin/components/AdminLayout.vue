
<template>
  <view class="admin-layout">
    <!-- Sidebar -->
    <view class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <view class="sidebar-header">
        <text class="sidebar-title" v-if="!sidebarCollapsed">管理后台</text>
        <text class="sidebar-title-short" v-else>管</text>
      </view>
      <view class="sidebar-menu">
        <view
          v-for="menu in menus"
          :key="menu.key"
          class="menu-item"
          :class="{ active: activeMenu === menu.key }"
          @tap="navigateToMenu(menu)"
        >
          <uni-icons :type="menu.icon" size="18" :color="activeMenu === menu.key ? '#409EFF' : '#909399'"></uni-icons>
          <text class="menu-text" v-if="!sidebarCollapsed">{{ menu.title }}</text>
        </view>
      </view>
    </view>

    <!-- Main content -->
    <view class="main-content">
      <!-- Top bar -->
      <view class="top-bar">
        <view class="top-left">
          <view class="toggle-btn" @tap="toggleSidebar">
            <uni-icons :type="sidebarCollapsed ? 'list' : 'bars'" size="20" color="#333"></uni-icons>
          </view>
          <text class="breadcrumb">{{ currentTitle }}</text>
        </view>
        <view class="top-right">
          <text class="admin-name">{{ adminStore.adminName }}</text>
          <text class="admin-role">{{ adminStore.adminRole }}</text>
          <text class="logout-btn" @tap="handleLogout">退出</text>
        </view>
      </view>

      <!-- Page content slot -->
      <view class="page-content">
        <slot></slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdminStore } from '@/store/admin'
import { adminMenus } from '@/utils/admin'

const props = defineProps<{
  activeKey?: string
}>()

const adminStore = useAdminStore()
const menus = adminMenus
const sidebarCollapsed = computed(() => adminStore.sidebarCollapsed)
const activeMenu = computed(() => props.activeKey || adminStore.activeMenu)

const currentTitle = computed(() => {
  const menu = menus.find(m => m.key === activeMenu.value)
  return menu?.title || '管理后台'
})

function toggleSidebar() {
  adminStore.toggleSidebar()
}

function navigateToMenu(menu: any) {
  adminStore.setActiveMenu(menu.key)
  uni.redirectTo({ url: menu.path })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出管理后台吗？',
    success: (res) => {
      if (res.confirm) {
        adminStore.logout()
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f6f7;
}

.sidebar {
  width: 220px;
  background-color: #fff;
  border-right: 1px solid #e8e8e8;
  flex-shrink: 0;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;

  &.collapsed {
    width: 60px;
  }

  .sidebar-header {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #e8e8e8;

    .sidebar-title {
      font-size: 16px;
      font-weight: 700;
      color: #409EFF;
    }

    .sidebar-title-short {
      font-size: 18px;
      font-weight: 700;
      color: #409EFF;
    }
  }

  .sidebar-menu {
    flex: 1;
    padding: 8px 0;
    overflow-y: auto;

    .menu-item {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      margin: 2px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: #f5f7fa;
      }

      &.active {
        background-color: #ecf5ff;

        .menu-text {
          color: #409EFF;
          font-weight: 500;
        }
      }

      .menu-text {
        font-size: 14px;
        color: #606266;
        margin-left: 10px;
      }
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-bar {
  height: 56px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;

  .top-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .toggle-btn {
      cursor: pointer;
      padding: 4px;
    }

    .breadcrumb {
      font-size: 15px;
      font-weight: 500;
      color: #333;
    }
  }

  .top-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .admin-name {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .admin-role {
      font-size: 12px;
      color: #909399;
      padding: 2px 8px;
      background-color: #f0f2f5;
      border-radius: 10px;
    }

    .logout-btn {
      font-size: 13px;
      color: #F56C6C;
      cursor: pointer;
      padding: 4px 12px;
      border: 1px solid #F56C6C;
      border-radius: 4px;

      &:hover {
        background-color: #fef0f0;
      }
    }
  }
}

.page-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
