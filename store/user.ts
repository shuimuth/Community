import { defineStore } from 'pinia'

interface UserInfo {
  _id: string
  nickname: string
  avatar: string
  real_name: string
  mobile: string
  gender: number
  credit_score: number
  balance: number
  frozen_balance: number
  is_verified: boolean
  points: number
  member_level: number
  is_merchant: boolean
  role: string[]
  status: number
}

interface CommunityInfo {
  _id: string
  name: string
  region: string
  address: string
}

interface UserState {
  token: string
  userInfo: UserInfo | null
  communities: CommunityInfo[]
  isLogin: boolean
  isInfoComplete: boolean
  hasCommunity: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: uni.getStorageSync('uni_id_token') || '',
    userInfo: null,
    communities: [],
    isLogin: false,
    isInfoComplete: false,
    hasCommunity: false
  }),

  getters: {
    userId(): string {
      return this.userInfo?._id || ''
    },
    creditLevel(): string {
      const score = this.userInfo?.credit_score || 0
      if (score >= 90) return 'excellent'
      if (score >= 70) return 'good'
      if (score >= 60) return 'normal'
      return 'poor'
    },
    creditLevelText(): string {
      const score = this.userInfo?.credit_score || 0
      if (score >= 90) return '优秀'
      if (score >= 70) return '良好'
      if (score >= 60) return '一般'
      return '较差'
    },
    canAcceptTask(): boolean {
      return (this.userInfo?.credit_score || 0) >= 60
    },
    canPublishTask(): boolean {
      return (this.userInfo?.credit_score || 0) >= 40
    },
    availableBalance(): number {
      return this.userInfo?.balance || 0
    },
    communityIds(): string[] {
      return this.communities.map(c => c._id)
    }
  },

  actions: {
    setToken(token: string) {
      this.token = token
      this.isLogin = !!token
      uni.setStorageSync('uni_id_token', token)
    },

    setUserInfo(info: UserInfo) {
      this.userInfo = info
      this.isInfoComplete = !!(info.real_name && info.mobile)
    },

    setCommunities(communities: CommunityInfo[]) {
      this.communities = communities
      this.hasCommunity = communities.length > 0
    },

    updateBalance(balance: number, frozenBalance?: number) {
      if (this.userInfo) {
        this.userInfo.balance = balance
        if (frozenBalance !== undefined) {
          this.userInfo.frozen_balance = frozenBalance
        }
      }
    },

    updateCreditScore(score: number) {
      if (this.userInfo) {
        this.userInfo.credit_score = score
      }
    },

    logout() {
      this.token = ''
      this.userInfo = null
      this.communities = []
      this.isLogin = false
      this.isInfoComplete = false
      this.hasCommunity = false
      uni.removeStorageSync('uni_id_token')
    }
  }
})
