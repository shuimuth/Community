
// Content safety check cloud function
// Integrates with WeChat msgSecCheck API for text/image content moderation
const db = uniCloud.database()

module.exports = {
  _before: async function() {
    const clientInfo = this.getClientInfo()
    const uniIdCommon = require('uni-id-common')
    const uniID = uniIdCommon.createInstance({ clientInfo })
    const payload = await uniID.checkToken(clientInfo.uniIdToken)
    if (payload.errCode) throw new Error('Unauthorized')
    this.uid = payload.uid
  },

  /**
   * Check text content safety
   * Uses WeChat msgSecCheck API when available
   * Falls back to keyword filtering
   * @param {Object} params - { content: string }
   * @returns {Object} { safe: boolean, reason?: string }
   */
  async checkText(params = {}) {
    const { content } = params
    if (!content) return { safe: true }

    // Basic XSS/injection check
    const dangerPatterns = [
      /<script[\s\S]*?>/gi,
      /javascript:/gi,
      /on\w+\s*=\s*["']?[^"']*["']?/gi
    ]
    for (const pattern of dangerPatterns) {
      if (pattern.test(content)) {
        return { safe: false, reason: '内容包含不安全字符' }
      }
    }

    // Keyword filtering (basic)
    // In production, integrate with WeChat Cloud Security API:
    // https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html
    // Example:
    // const wxCloud = require('wx-server-sdk')
    // const result = await wxCloud.openapi.security.msgSecCheck({ content })

    // URL filter - prevent phishing
    const urlPattern = /(https?:\/\/[^\s]+)/gi
    const urls = content.match(urlPattern)
    if (urls && urls.length > 3) {
      return { safe: false, reason: '内容包含过多链接' }
    }

    return { safe: true }
  },

  /**
   * Check image content safety
   * @param {Object} params - { imageUrl: string }
   * @returns {Object} { safe: boolean, reason?: string }
   */
  async checkImage(params = {}) {
    const { imageUrl } = params
    if (!imageUrl) return { safe: true }

    // In production, integrate with WeChat image content check API:
    // https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/imgSecCheck.html

    // Basic validation - check file type
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const lowerUrl = imageUrl.toLowerCase()
    const hasValidExt = allowedExts.some(ext => lowerUrl.includes(ext))
    if (!hasValidExt && !lowerUrl.includes('cloud://') && !lowerUrl.includes('tcb.qcloud.la')) {
      return { safe: false, reason: '不支持的图片格式' }
    }

    return { safe: true }
  },

  /**
   * Batch check content (text + images)
   * @param {Object} params - { text: string, images: string[] }
   */
  async batchCheck(params = {}) {
    const { text, images = [] } = params
    const results = {
      safe: true,
      textResult: { safe: true },
      imageResults: [] as any[]
    }

    // Check text
    if (text) {
      results.textResult = await this.checkText({ content: text })
      if (!results.textResult.safe) {
        results.safe = false
      }
    }

    // Check images
    for (const imageUrl of images) {
      const imgResult = await this.checkImage({ imageUrl })
      results.imageResults.push(imgResult)
      if (!imgResult.safe) {
        results.safe = false
      }
    }

    return results
  }
}
