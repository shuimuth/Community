export default {
  // Debug mode
  debug: false,
  // Not admin panel
  isAdmin: false,
  loginTypes: [
    // #ifdef MP-WEIXIN
    'weixin',
    // #endif
    // #ifdef APP
    'univerify',
    // #endif
    'smsCode'
  ],
  // Policy agreements
  agreements: {
    serviceUrl: 'https://example.com/service', // User service agreement
    privacyUrl: 'https://example.com/privacy',  // Privacy policy
    scope: ['register', 'login']
  },
  // App IDs for various login services
  appid: {
    weixin: {
      h5: '',
      web: ''
    }
  },
  /**
   * Password strength: medium
   */
  passwordStrength: 'medium',
  /**
   * Allow password setup after login
   */
  setPasswordAfterLogin: false
}
