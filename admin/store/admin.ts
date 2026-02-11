
import { defineStore } from 'pinia'

interface AdminState {
  token: string
  adminInfo: any
  isLogin: boolean
  sidebarCollapsed: boolean
  activeMenu: string
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    token: uni.getStorageSync('admin_token') || '',
    adminInfo: null,
    isLogin: false,
    sidebarCollapsed: false,
    activeMenu: 'dashboard'
  }),

  getters: {
    adminName(): string {
      return this.adminInfo?.nickname || this.adminInfo?.username || '管理员'
    },
    adminRole(): string {
      const roles = this.adminInfo?.role || []
      if (roles.includes('super_admin')) return '超级管理员'
      if (roles.includes('admin')) return '管理员'
      return '操作员'
    }
  },

  actions: {
    setToken(token: string) {
      this.token = token
      this.isLogin = !!token
      uni.setStorageSync('admin_token', token)
    },

    setAdminInfo(info: any) {
      this.adminInfo = info
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    setActiveMenu(menu: string) {
      this.activeMenu = menu
    },

    logout() {
      this.token = ''
      this.adminInfo = null
      this.isLogin = false
      uni.removeStorageSync('admin_token')
      uni.reLaunch({ url: '/pages/login/login' })
    }
  }
})
