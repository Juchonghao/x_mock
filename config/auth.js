// Twitter Auth Token 配置文件
// 使用环境变量来存储敏感信息

const authConfig = {
  twitter: {
    // 从环境变量获取认证信息
    authToken: process.env.TWITTER_AUTH_TOKEN,
    ct0: process.env.TWITTER_CT0,
    personalizationId: process.env.TWITTER_PERSONALIZATION_ID,
    
    // 验证配置
    isConfigured() {
      return !!(this.authToken && this.ct0 && this.personalizationId);
    },
    
    // 获取认证头信息
    getAuthHeaders() {
      if (!this.isConfigured()) {
        throw new Error('Twitter Auth Token 配置不完整');
      }
      
      return {
        'Authorization': `Bearer ${this.authToken}`,
        'x-csrf-token': this.ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'zh-cn',
        'x-twitter-active-user': 'yes'
      };
    },
    
    // 获取 Cookie 字符串
    getAuthCookies() {
      if (!this.isConfigured()) {
        throw new Error('Twitter Auth Token 配置不完整');
      }
      
      return [
        `auth_token=${this.authToken}`,
        `ct0=${this.ct0}`,
        `personalization_id=${this.personalizationId}`
      ].join('; ');
    }
  },
  
  // 其他社交平台配置（预留）
  platforms: {
    // 可以添加其他平台如 Instagram, LinkedIn 等
  }
};

module.exports = authConfig;