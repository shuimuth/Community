import { defineStore } from 'pinia'

interface SystemConfig {
  service_fee_rate: number
  min_withdraw_amount: number
  withdraw_fee_rate: number
  min_reward: number
  max_reward: number
  auto_confirm_hours: number
  task_types: string[]
}

interface AppState {
  systemConfig: SystemConfig
  unreadMessageCount: number
  isConfigLoaded: boolean
}

const defaultConfig: SystemConfig = {
  service_fee_rate: 0.1,
  min_withdraw_amount: 10,
  withdraw_fee_rate: 0,
  min_reward: 5,
  max_reward: 1000,
  auto_confirm_hours: 48,
  task_types: ['取快递', '接送小孩', '陪诊', '陪读', '代扔垃圾', '宠物喂养', '其他']
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    systemConfig: { ...defaultConfig },
    unreadMessageCount: 0,
    isConfigLoaded: false
  }),

  getters: {
    taskTypeOptions(): { label: string; value: string }[] {
      return this.systemConfig.task_types.map(type => ({
        label: type,
        value: type
      }))
    },
    hasUnreadMessage(): boolean {
      return this.unreadMessageCount > 0
    }
  },

  actions: {
    setSystemConfig(config: Partial<SystemConfig>) {
      this.systemConfig = { ...this.systemConfig, ...config }
      this.isConfigLoaded = true
    },

    setUnreadMessageCount(count: number) {
      this.unreadMessageCount = count
    },

    async loadSystemConfig() {
      try {
        const db = uniCloud.database()
        const res = await db.collection('system_config').limit(1).get()
        if (res.result.data && res.result.data.length > 0) {
          this.setSystemConfig(res.result.data[0])
        }
      } catch (e) {
        console.error('Failed to load system config:', e)
      }
    }
  }
})
