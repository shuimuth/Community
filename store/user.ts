import { defineStore } from 'pinia'

interface RealnameAuth {
  type: number               // 0: personal user
  auth_status: number        // 0: not verified, 1: pending, 2: approved, 3: rejected
  real_name: string          // Real name
  identity: string           // ID card number
  id_card_front?: string     // ID card front photo URL
  id_card_back?: string      // ID card back photo URL
  in_hand?: string           // Hand-held ID card photo URL
  auth_date?: number         // Verification approval timestamp
}

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
  realname_auth?: RealnameAuth
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
  currentCommunityId: string  // Current selected community ID for display
  isLogin: boolean
  isInfoComplete: boolean
  hasCommunity: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: uni.getStorageSync('uni_id_token') || '',
    userInfo: null,
    communities: [],
    currentCommunityId: uni.getStorageSync('current_community_id') || '',
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
    },
    currentCommunity(): CommunityInfo | null {
      if (!this.currentCommunityId) return this.communities[0] || null
      return this.communities.find(c => c._id === this.currentCommunityId) || this.communities[0] || null
    },
    currentCommunityName(): string {
      const current = this.currentCommunity
      if (!current) return '请选择小区'
      if (this.communities.length === 1) return current.name
      return current.name
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
      // Auto set current community if not set or invalid
      if (!this.currentCommunityId || !communities.find(c => c._id === this.currentCommunityId)) {
        this.currentCommunityId = communities[0]?._id || ''
        uni.setStorageSync('current_community_id', this.currentCommunityId)
      }
    },

    setCurrentCommunity(communityId: string) {
      this.currentCommunityId = communityId
      uni.setStorageSync('current_community_id', communityId)
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
      this.currentCommunityId = ''
      this.isLogin = false
      this.isInfoComplete = false
      this.hasCommunity = false
      uni.removeStorageSync('uni_id_token')
      uni.removeStorageSync('current_community_id')
    }
  }
})
