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

  // 使用 Auth Token 登录 - 改进版，处理服务器环境差异
  async loginWithAuthToken() {
    try {
      console.log('🚀 开始 Auth Token 认证 (服务器环境优化版)...');
      
      if (!authConfig.twitter.isConfigured()) {
        throw new Error('Twitter Auth Token 配置不完整');
      }

      // 检查浏览器是否已初始化
      if (!this.browser || !this.page) {
        console.log('📱 重新初始化浏览器...');
        const initialized = await this.initializeBrowser();
        if (!initialized) {
          throw new Error('浏览器初始化失败');
        }
      }

      console.log('🔐 准备设置认证 Cookie...');

      // 获取认证数据
      const authData = {
        authToken: authConfig.twitter.authToken,
        ct0: authConfig.twitter.ct0,
        personalizationId: authConfig.twitter.personalizationId
      };
      
      console.log('📊 Auth Token 长度:', authData.authToken.length);
      console.log('📊 CT0 长度:', authData.ct0.length);
      console.log('📊 Personalization ID 长度:', authData.personalizationId.length);
      console.log('🔍 Auth Token 预览:', authData.authToken.substring(0, 20) + '...');
      console.log('🔍 CT0 预览:', authData.ct0.substring(0, 20) + '...');

      // 服务器环境专用：双重Cookie设置策略
      const context = this.page.context();
      
      // 方法1：使用 twitter.com 域
      const twitterCookies = [
        {
          name: 'auth_token',
          value: authData.authToken,
          domain: '.twitter.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'None'
        },
        {
          name: 'ct0',
          value: authData.ct0,
          domain: '.twitter.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'None'
        },
        {
          name: 'personalization_id',
          value: authData.personalizationId,
          domain: '.twitter.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'None'
        }
      ];

      // 方法2：使用 x.com 域（Twitter新域名）
      const xcomCookies = [
        {
          name: 'auth_token',
          value: authData.authToken,
          domain: '.x.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'None'
        },
        {
          name: 'ct0',
          value: authData.ct0,
          domain: '.x.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'None'
        },
        {
          name: 'personalization_id',
          value: authData.personalizationId,
          domain: '.x.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'None'
        }
      ];

      console.log('🍪 设置 twitter.com 域 Cookie...');
      await context.addCookies(twitterCookies);
      console.log('🍪 设置 x.com 域 Cookie...');
      await context.addCookies(xcomCookies);
      console.log('✅ 双重域 Cookie 设置完成');

      // 验证 Cookie 是否设置成功
      const currentCookies = await context.cookies();
      console.log('📊 当前 Cookie 数量:', currentCookies.length);
      
      const authCookies = currentCookies.filter(cookie => 
        cookie.name === 'auth_token' || cookie.name === 'ct0' || cookie.name === 'personalization_id'
      );
      console.log('🔐 认证相关 Cookie 数量:', authCookies.length);
      
      authCookies.forEach(cookie => {
        console.log(`🍪 ${cookie.name} Cookie: ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain})`);
      });

      // 服务器环境专用：智能页面访问策略
      console.log('🌐 开始页面访问测试...');
      
      // 服务器环境专用：智能页面访问策略
      const pageAccessStrategies = [
        { url: 'https://twitter.com/home', desc: 'Twitter主页', timeout: 20000, waitUntil: 'networkidle' },
        { url: 'https://x.com/home', desc: 'X.com主页', timeout: 20000, waitUntil: 'networkidle' },
        { url: 'https://twitter.com/settings/account', desc: 'Twitter设置页面', timeout: 15000, waitUntil: 'domcontentloaded' },
        { url: 'https://x.com/settings/account', desc: 'X.com设置页面', timeout: 15000, waitUntil: 'domcontentloaded' },
        { url: 'https://twitter.com', desc: 'Twitter首页', timeout: 15000, waitUntil: 'domcontentloaded' },
        { url: 'https://x.com', desc: 'X.com首页', timeout: 15000, waitUntil: 'domcontentloaded' }
      ];
      
      let pageAccessSuccess = false;
      let lastError = null;
      
      for (const strategy of pageAccessStrategies) {
        try {
          console.log(`🔄 尝试访问: ${strategy.desc} (${strategy.url})`);
          await this.page.goto(strategy.url, {
            waitUntil: strategy.waitUntil,
            timeout: strategy.timeout
          });
          
          // 访问成功，等待页面稳定
          await this.page.waitForTimeout(3000);
          
          const currentUrl = this.page.url();
          console.log(`✅ 成功访问 ${strategy.desc}, 当前URL: ${currentUrl}`);
          
          // 检查是否被重定向到登录页面
          if (currentUrl.includes('login') || currentUrl.includes('i/flow/login')) {
            console.log(`⚠️ ${strategy.desc} 重定向到登录页面，尝试下一个策略...`);
            lastError = new Error('重定向到登录页面');
            continue;
          }
          
          // 检查是否访问成功（不在登录页面且有内容）
          if (!currentUrl.includes('login') && !currentUrl.includes('i/flow/login')) {
            console.log(`🎉 ${strategy.desc} 访问成功且未重定向到登录！`);
            pageAccessSuccess = true;
            break;
          }
          
        } catch (error) {
          console.log(`❌ ${strategy.desc} 访问失败: ${error.message}`);
          lastError = error;
          continue;
        }
      }
      
      if (!pageAccessSuccess) {
        console.log('❌ 所有页面访问策略都失败');
        throw new Error(`无法成功访问Twitter/X页面: ${lastError?.message || '未知错误'}`);
      }

      // 服务器环境专用：增强认证验证
      console.log('🔍 进行认证状态验证...');
      
      // 等待页面稳定
      await this.page.waitForTimeout(2000);
      
      // 检查当前 URL
      const currentUrl = this.page.url();
      console.log('📍 当前页面 URL:', currentUrl);
      
      // 检查页面内容
      const pageTitle = await this.page.title();
      console.log('📄 页面标题:', pageTitle);
      
      // 重要：检查是否被重定向到登录页面
      if (currentUrl.includes('login') || currentUrl.includes('i/flow/login')) {
        console.log('❌ 被重定向到登录页面，认证失败');
        console.log('🔍 检查页面错误信息...');
        
        try {
          const pageContent = await this.page.content();
          console.log('📊 页面内容长度:', pageContent.length);
          
          // 检查是否有具体的错误信息
          if (pageContent.includes('Invalid') || pageContent.includes('错误') || pageContent.includes('error')) {
            console.log('⚠️ 页面显示错误信息');
          }
        } catch (e) {
          console.log('❌ 无法获取页面内容:', e.message);
        }
        
        this.authenticated = false;
        return false;
      }
      
      // 获取页面内容片段进行调试
      try {
        const pageContent = await this.page.content();
        console.log('页面内容长度:', pageContent.length);
        
        // 检查是否有用户相关的元素
        const hasUserElements = await this.page.evaluate(() => {
          const indicators = [
            '[data-testid="SideNav_AccountSwitcher_Button"]',
            '[data-testid="user-menu"]', 
            '[aria-label="个人资料"]',
            '[data-testid="AccountSwitcher_Button"]',
            '[data-testid="me"]',
            '.css-1dbjc4n.r-1d2f490.r-zl2h9q',
            '[data-testid="AccountSwitcher_Verified_Account"]'
          ];
          
          for (const selector of indicators) {
            const element = document.querySelector(selector);
            if (element) {
              return { found: true, selector: selector, text: element.textContent };
            }
          }
          return { found: false };
        });
        
        console.log('用户界面元素检查:', hasUserElements);
        
        // 检查 URL 是否包含已登录的状态
        const currentUrl = this.page.url();
        console.log('当前完整 URL:', currentUrl);
        
        // 如果在设置页面且能访问，说明认证可能有效
        if (currentUrl.includes('settings/account') && !currentUrl.includes('login')) {
          console.log('✅ 成功访问设置页面且未重定向到登录，认证有效');
          this.authenticated = true;
          return true;
        }
        
      } catch (contentError) {
        console.log('检查页面内容时出错:', contentError.message);
      }
      
      // 检查是否被重定向到登录页面
      if (currentUrl.includes('login') || currentUrl.includes('i/flow/login')) {
        console.log('❌ 被重定向到登录页面，认证失败');
        
        // 尝试获取页面错误信息
        try {
          const pageContent = await this.page.content();
          console.log('页面内容长度:', pageContent.length);
          
          // 检查是否有具体的错误信息
          if (pageContent.includes('Invalid') || pageContent.includes('错误') || pageContent.includes('error')) {
            console.log('页面显示错误信息');
          }
        } catch (e) {
          console.log('无法获取页面内容:', e.message);
        }
        
        this.authenticated = false;
        return false;
      }

      // 检查页面是否包含登录成功的标志
      console.log('检查登录状态标志...');
      
      // 多种方式检查登录状态
      let loginSuccess = false;
      
      try {
        // 方法1：检查用户菜单按钮
        await this.page.waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"]', { timeout: 5000 });
        console.log('✅ 找到用户菜单按钮，认证成功');
        loginSuccess = true;
      } catch (error) {
        console.log('未找到用户菜单按钮，尝试其他检查方式...');
      }
      
      if (!loginSuccess) {
        try {
          // 方法2：检查个人资料链接
          await this.page.waitForSelector('[aria-label="个人资料"], [data-testid="user-menu"]', { timeout: 5000 });
          console.log('✅ 找到个人资料链接，认证成功');
          loginSuccess = true;
        } catch (error) {
          console.log('未找到个人资料链接...');
        }
      }
      
      if (!loginSuccess) {
        try {
          // 方法3：检查页面内容
          const pageContent = await this.page.content();
          const hasLoginIndicators = pageContent.includes('登录') || 
                                   pageContent.includes('Log in') || 
                                   pageContent.includes('Sign in');
          
          if (!hasLoginIndicators) {
            console.log('✅ 页面内容不包含登录提示，假设认证成功');
            loginSuccess = true;
          } else {
            console.log('❌ 页面内容包含登录提示，认证可能失败');
          }
        } catch (error) {
          console.log('检查页面内容时出错:', error.message);
        }
      }
      
      if (loginSuccess) {
        this.authenticated = true;
        console.log('🎉 Auth Token 认证成功');
        return true;
      } else {
        this.authenticated = false;
        console.log('❌ Auth Token 认证失败 - 未能确认登录状态');
        return false;
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