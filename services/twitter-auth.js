const { chromium } = require('playwright');
const authConfig = require('../config/auth');

class TwitterAuthService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.authenticated = false;
  }

  // 初始化浏览器
  async initializeBrowser() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      return true;
    } catch (error) {
      console.error('浏览器初始化失败:', error);
      return false;
    }
  }

  // 使用 Auth Token 登录
  async loginWithAuthToken() {
    try {
      if (!authConfig.twitter.isConfigured()) {
        throw new Error('Twitter Auth Token 配置不完整');
      }

      // 检查浏览器是否已初始化
      if (!this.browser || !this.page) {
        const initialized = await this.initializeBrowser();
        if (!initialized) {
          throw new Error('浏览器初始化失败');
        }
      }

      console.log('开始使用 Auth Token 登录...');
      
      // 访问 Twitter 首页
      await this.page.goto('https://twitter.com/home', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 设置 Auth Token Cookie
      await this.page.evaluate((authConfig) => {
        const cookies = [
          `auth_token=${authConfig.twitter.authToken}; domain=.twitter.com; path=/; secure; samesite=none`,
          `ct0=${authConfig.twitter.ct0}; domain=.twitter.com; path=/; secure; samesite=none`,
          `personalization_id=${authConfig.twitter.personalizationId}; domain=.twitter.com; path=/; secure; samesite=none`
        ];
        
        cookies.forEach(cookie => {
          document.cookie = cookie;
        });
      }, authConfig);

      // 等待页面加载并检查登录状态
      await this.page.waitForTimeout(3000);
      
      // 检查是否成功登录
      const currentUrl = this.page.url();
      console.log('当前 URL:', currentUrl);
      
      // 如果 URL 包含 login，说明登录失败
      if (currentUrl.includes('login') || currentUrl.includes('i/flow/login')) {
        this.authenticated = false;
        console.log('Auth Token 认证失败');
        return false;
      }

      // 检查页面是否包含登录用户信息
      try {
        await this.page.waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"], [data-testid="user-menu"], [aria-label="个人资料"]', {
          timeout: 5000
        });
        this.authenticated = true;
        console.log('Auth Token 认证成功');
        return true;
      } catch (error) {
        // 尝试其他登录状态检查方法
        const pageContent = await this.page.content();
        if (pageContent.includes('登录') || pageContent.includes('Log in') || pageContent.includes('Sign in')) {
          this.authenticated = false;
          console.log('Auth Token 认证失败 - 页面显示需要登录');
          return false;
        }
        
        // 如果没有明确显示登录提示，假设认证成功
        this.authenticated = true;
        console.log('Auth Token 认证成功（通过页面内容判断）');
        return true;
      }

    } catch (error) {
      console.error('Auth Token 认证过程出错:', error);
      this.authenticated = false;
      return false;
    }
  }

  // 验证当前认证状态
  async verifyAuthStatus() {
    try {
      if (!this.authenticated || !this.page) {
        return false;
      }

      // 访问用户主页验证认证状态
      await this.page.goto('https://twitter.com/home', {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      await this.page.waitForTimeout(2000);
      
      // 检查是否仍然处于登录状态
      const currentUrl = this.page.url();
      if (currentUrl.includes('login')) {
        this.authenticated = false;
        return false;
      }

      return true;
    } catch (error) {
      console.error('验证认证状态时出错:', error);
      return false;
    }
  }

  // 获取当前页面对象（用于执行自动化操作）
  getPage() {
    return this.page;
  }

  // 检查是否已认证
  isAuthenticated() {
    return this.authenticated;
  }

  // 关闭浏览器
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.authenticated = false;
        console.log('浏览器已关闭');
      }
    } catch (error) {
      console.error('关闭浏览器时出错:', error);
    }
  }

  // 重新认证
  async reAuthenticate() {
    console.log('开始重新认证...');
    await this.close();
    return await this.loginWithAuthToken();
  }
}

module.exports = TwitterAuthService;