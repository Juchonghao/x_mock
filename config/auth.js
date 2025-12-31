// Twitter Auth Token 配置文件
// 使用环境变量来存储敏感信息

const authConfig = {
  twitter: {
    // 有效的认证信息（已验证可正常工作）
    authToken: 'a0e70e3e33feb8e71f2bf751827ef282fe412ea8',
    ct0: 'bf082f5fa878915a307cb5c2cd31c6d8422df48258155bc8687deb89b9a15d0cebbdce0d0add36e7c10d00a86e7c815f4718e661035940133ff85bcdfa8b5e908297354d0ca3e83341c773dda8682c02',
    twid: 'u=555586849', // 已解码的twid值
    
    // 环境变量（如果有的话会覆盖默认值）
    authTokenEnv: process.env.TWITTER_AUTH_TOKEN,
    ct0Env: process.env.TWITTER_CT0,
    twidEnv: process.env.TWITTER_TWID,
    
    // 获取实际使用的认证信息
    getAuthToken() {
      return this.authTokenEnv || this.authToken;
    },
    
    getCt0() {
      return this.ct0Env || this.ct0;
    },
    
    getTwid() {
      return this.twidEnv || this.twid;
    },
    
    // 验证配置
    isConfigured() {
      return !!(this.getAuthToken() && this.getCt0() && this.getTwid());
    },
    
    // 获取认证头信息
    getAuthHeaders() {
      if (!this.isConfigured()) {
        throw new Error('Twitter Auth Token 配置不完整');
      }
      
      return {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'x-csrf-token': this.getCt0(),
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
        `auth_token=${this.getAuthToken()}`,
        `ct0=${this.getCt0()}`,
        `twid=${this.getTwid()}`
      ].join('; ');
    },
    
    // 获取用于 Playwright 的 Cookie 数组
    getPlaywrightCookies() {
      if (!this.isConfigured()) {
        throw new Error('Twitter Auth Token 配置不完整');
      }
      
      const authToken = this.getAuthToken();
      const ct0 = this.getCt0();
      const twid = this.getTwid();
      
      return [
        {
          name: 'auth_token',
          value: authToken,
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'ct0',
          value: ct0,
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'twid',
          value: twid,
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'auth_token',
          value: authToken,
          domain: '.x.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'ct0',
          value: ct0,
          domain: '.x.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'twid',
          value: twid,
          domain: '.x.com',
          path: '/',
          httpOnly: true,
          secure: true
        }
      ];
    }
  },
  
  // 其他社交平台配置（预留）
  platforms: {
    // 可以添加其他平台如 Instagram, LinkedIn 等
  }
};

module.exports = authConfig;