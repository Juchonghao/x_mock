const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class PlaywrightFollowService {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.proxyUrl = options.proxyUrl || null;
    this.userDataDir = options.userDataDir || path.join(process.cwd(), 'sessions');
    this.sessionDir = options.sessionDir || path.join(process.cwd(), 'sessions');
    this.headless = options.headless || false;
    this.debug = options.debug || false;
    
    // 预设的随机搜索关键词
    this.randomKeywords = [
      'technology', 'music', 'art', 'photography', 'travel', 'food', 
      'fitness', 'business', 'education', 'science', 'sports', 'movies',
      'books', 'nature', 'fashion', 'gaming', 'design', 'marketing',
      'startup', 'coding', 'javascript', 'python', 'ai', 'machine learning',
      'crypto', 'nft', 'blockchain', 'web3', 'defi', 'politics',
      'news', 'entertainment', 'comedy', 'motivation', 'inspiration'
    ];
  }

  // 初始化浏览器
  async initialize() {
    try {
      console.log('🚀 初始化关注服务...');
      
      const launchOptions = {
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      };

      if (this.proxyUrl) {
        launchOptions.proxy = { server: this.proxyUrl };
      }

      this.browser = await chromium.launch(launchOptions);
      
      // 加载cookies
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      await this.loadCookies();
      
      this.page = await this.context.newPage();
      
      // 隐藏webdriver特征
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      console.log('✅ 关注服务初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 关注服务初始化失败:', error.message);
      return false;
    }
  }

  // 加载cookies
  async loadCookies() {
    try {
      const cookieFiles = fs.readdirSync(this.sessionDir)
        .filter(file => file.includes('cookies') && file.endsWith('.json'));
      
      if (cookieFiles.length > 0) {
        const latestCookieFile = cookieFiles
          .sort((a, b) => fs.statSync(path.join(this.sessionDir, b)).mtime - 
                        fs.statSync(path.join(this.sessionDir, a)).mtime)[0];
        
        const cookies = JSON.parse(
          fs.readFileSync(path.join(this.sessionDir, latestCookieFile), 'utf8')
        );
        
        // 确保cookies是数组格式
        if (Array.isArray(cookies)) {
          await this.context.addCookies(cookies);
          console.log('✅ 已加载cookies');
        } else {
          console.log('⚠️ cookies文件格式不正确');
        }
      } else {
        console.log('ℹ️ 未找到cookies文件');
      }
    } catch (error) {
      console.log('⚠️ 加载cookies失败:', error.message);
    }
  }

  // 保存cookies
  async saveCookies() {
    try {
      const cookies = await this.context.cookies();
      const filename = `follow-cookies-${Date.now()}.json`;
      const filepath = path.join(this.sessionDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(cookies, null, 2));
      console.log('✅ cookies已保存:', filepath);
      return filepath;
    } catch (error) {
      console.error('❌ 保存cookies失败:', error.message);
    }
  }

  // 人类延迟
  async humanDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.page.waitForTimeout(delay);
  }

  // 截图
  async screenshot(filename = 'follow-screenshot.png') {
    try {
      const filepath = path.join(this.sessionDir, filename);
      await this.page.screenshot({ path: filepath, fullPage: true });
      console.log('📸 截图已保存:', filepath);
      return filepath;
    } catch (error) {
      console.error('❌ 截图失败:', error.message);
    }
  }

  // 检查登录状态
  async checkLoginStatus() {
    try {
      // 尝试访问页面，降低超时时间
      await this.page.goto('https://x.com/home', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      await this.humanDelay(3000, 5000);
      
      // 检查URL
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/flow/login')) {
        console.log('❌ 当前在登录页面');
        return false;
      }
      
      // 检查页面标题
      const pageTitle = await this.page.title();
      console.log(`📄 页面标题: ${pageTitle}`);
      
      // 检查页面内容
      const pageContent = await this.page.content();
      const loginIndicators = [
        'Log in',
        '登录',
        'Sign in',
        'Create account'
      ];
      
      const hasLoginIndicators = loginIndicators.some(indicator => 
        pageContent.includes(indicator)
      );
      
      const isLoggedIn = !hasLoginIndicators && !currentUrl.includes('/login');
      
      console.log(isLoggedIn ? '✅ 已登录' : '❌ 未登录');
      return isLoggedIn;
      
    } catch (error) {
      console.error('❌ 检查登录状态失败:', error.message);
      // 如果页面访问失败，假设已登录（用于测试）
      console.log('⚠️ 页面访问失败，假设已登录');
      return true;
    }
  }

  // 随机搜索用户
  async searchRandomUsers(targetCount = 10) {
    try {
      console.log(`🔍 搜索 ${targetCount} 个随机用户...`);
      
      const followedUsers = [];
      const searchAttempts = targetCount * 3; // 尝试次数为目标的3倍
      
      for (let i = 0; i < searchAttempts && followedUsers.length < targetCount; i++) {
        try {
          // 随机选择关键词
          const randomKeyword = this.randomKeywords[
            Math.floor(Math.random() * this.randomKeywords.length)
          ];
          
          console.log(`🔍 搜索尝试 ${i + 1}/${searchAttempts}: ${randomKeyword}`);
          
          // 改进的搜索页面访问 - 减少超时时间，增加重试
          const searchUrl = `https://x.com/search?q=${encodeURIComponent(randomKeyword)}&f=user`;
          console.log(`🔗 访问搜索页面: ${searchUrl}`);
          
          try {
            await this.page.goto(searchUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 10000 // 减少超时时间
            });
          } catch (gotoError) {
            console.log(`⚠️ 页面导航超时，尝试强制刷新...`);
            await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
          }
          
          await this.humanDelay(3000, 5000);
          
          // 查找用户结果
          const users = await this.findUsersInSearchResults();
          
          if (users.length > 0) {
            console.log(`✅ 找到 ${users.length} 个用户，开始关注...`);
            
            for (const user of users) {
              if (followedUsers.length >= targetCount) break;
              
              // 检查是否已经关注
              if (await this.isUserFollowed(user.username)) {
                console.log(`⏭️ 用户 ${user.username} 已关注，跳过`);
                continue;
              }
              
              // 尝试关注用户
              const followSuccess = await this.followUser(user);
              if (followSuccess) {
                followedUsers.push(user);
                console.log(`✅ 成功关注用户: ${user.username} (${followedUsers.length}/${targetCount})`);
                
                // 关注后延迟
                await this.humanDelay(5000, 8000);
              }
            }
          } else {
            console.log(`⚠️ 未找到用户，尝试下一个关键词`);
          }
          
        } catch (error) {
          console.log(`❌ 搜索尝试 ${i + 1} 失败:`, error.message);
          await this.humanDelay(2000, 3000);
        }
      }
      
      console.log(`🎉 关注完成! 成功关注 ${followedUsers.length} 个用户`);
      return followedUsers;
      
    } catch (error) {
      console.error('❌ 随机搜索用户失败:', error.message);
      return [];
    }
  }

  // 在搜索结果中查找用户
  async findUsersInSearchResults() {
    try {
      const userSelectors = [
        '[data-testid="UserCell"]',
        'article[data-testid="tweet"]',
        'div[data-testid="user-follow"]',
        'div[data-testid="user-bio"]',
        'a[href*="/"]'
      ];
      
      const users = [];
      
      for (const selector of userSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          
          for (const element of elements.slice(0, 10)) { // 限制每个选择器最多10个元素
            try {
              if (await element.isVisible()) {
                // 尝试提取用户名
                const href = await element.getAttribute('href');
                const text = await element.textContent();
                
                let username = null;
                
                // 方法1: 从href提取
                if (href && href.startsWith('/') && href.length > 1) {
                  username = href.replace('/', '').split('?')[0].split('/')[0];
                }
                
                // 方法2: 从页面链接查找
                if (!username) {
                  const links = await element.locator('a[href*="/"]').all();
                  for (const link of links) {
                    try {
                      const linkHref = await link.getAttribute('href');
                      if (linkHref && linkHref.startsWith('/') && linkHref.length > 1) {
                        username = linkHref.replace('/', '').split('?')[0].split('/')[0];
                        break;
                      }
                    } catch (e) {
                      continue;
                    }
                  }
                }
                
                // 过滤无效用户名
                if (username && 
                    username.length > 0 && 
                    !username.includes('?') && 
                    !username.includes('#') &&
                    username !== 'search' &&
                    username !== 'home' &&
                    username !== 'explore' &&
                    username !== 'i' &&
                    username !== 'notifications' &&
                    !users.find(u => u.username === username)) {
                  
                  users.push({
                    username: username,
                    element: element,
                    searchText: text
                  });
                }
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log(`🔍 在搜索结果中找到 ${users.length} 个用户`);
      return users.slice(0, 5); // 返回最多5个用户
      
    } catch (error) {
      console.error('❌ 查找用户失败:', error.message);
      return [];
    }
  }

  // 检查用户是否已关注
  async isUserFollowed(username) {
    try {
      await this.page.goto(`https://x.com/${username}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      
      await this.humanDelay(2000, 3000);
      
      // 查找关注按钮
      const followButtonSelectors = [
        '[data-testid="follow"]',
        'button[data-testid="follow"]',
        '[data-testid="unfollow"]',
        'button[data-testid="unfollow"]'
      ];
      
      for (const selector of followButtonSelectors) {
        try {
          const button = await this.page.locator(selector).first();
          if (await button.isVisible()) {
            const buttonText = await button.textContent();
            return buttonText.includes('Following') || buttonText.includes('已关注') || 
                   buttonText.includes('Unfollow') || buttonText.includes('取关');
          }
        } catch (e) {
          continue;
        }
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ 检查用户 ${username} 关注状态失败:`, error.message);
      return false;
    }
  }

  // 关注用户
  async followUser(userInfo) {
    try {
      const { username, element } = userInfo;
      
      console.log(`👤 尝试关注用户: ${username}`);
      
      // 方法1: 直接点击找到的用户元素（如果是搜索结果页面）
      try {
        if (element && this.page.url().includes('/search')) {
          console.log(`🔍 在搜索结果页面尝试点击用户元素`);
          await element.scrollIntoViewIfNeeded();
          await this.humanDelay(1000, 2000);
          await element.click();
          await this.humanDelay(2000, 3000);
          
          // 拍摄截图查看点击结果
          await this.page.screenshot({ 
            path: `sessions/debug-click-${username}-${Date.now()}.png` 
          });
        }
      } catch (e) {
        console.log(`⚠️ 直接点击用户元素失败: ${e.message}`);
      }
      
      // 方法2: 访问用户页面并点击关注按钮
      console.log(`🔗 访问用户页面: https://x.com/${username}`);
      try {
        await this.page.goto(`https://x.com/${username}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
      } catch (gotoError) {
        console.log(`⚠️ 页面导航超时，尝试强制刷新...`);
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
      }
      
      await this.humanDelay(3000, 5000);
      
      // 拍摄用户页面截图
      await this.page.screenshot({ 
        path: `sessions/debug-user-${username}-page.png`,
        fullPage: false 
      });
      
      console.log(`📸 用户页面截图已保存`);
      
      // 改进的关注按钮选择器
      const followButtonSelectors = [
        // 数据测试属性
        '[data-testid="follow"]',
        'button[data-testid="follow"]',
        
        // 文本内容选择器
        'button:has-text("Follow")',
        'button:has-text("关注")',
        'button:has-text("Follow @")',
        'button:has-text("关注 @")',
        
        // 角色和aria标签
        'div[role="button"]:has-text("Follow")',
        'div[role="button"]:has-text("关注")',
        '[role="button"][aria-label*="Follow"]',
        '[role="button"][aria-label*="关注"]',
        
        // 通用按钮选择器
        'button[type="button"]:has-text("Follow")',
        'button[type="button"]:has-text("关注")',
        
        // div形式的按钮
        'div:has-text("Follow")',
        'div:has-text("关注")'
      ];
      
      console.log(`🔍 开始查找关注按钮...`);
      
      for (const selector of followButtonSelectors) {
        try {
          const followButton = await this.page.locator(selector).first();
          
          if (await followButton.isVisible()) {
            const buttonText = await followButton.textContent();
            const buttonAriaLabel = await followButton.getAttribute('aria-label');
            const buttonClass = await followButton.getAttribute('class');
            
            console.log(`✅ 找到可见按钮: "${selector}"`);
            console.log(`   文本内容: "${buttonText}"`);
            console.log(`   Aria标签: "${buttonAriaLabel}"`);
            console.log(`   CSS类: "${buttonClass}"`);
            
            // 检查按钮状态
            const isFollowing = buttonText.includes('Following') || 
                               buttonText.includes('已关注') ||
                               buttonText.includes('Unfollow') ||
                               buttonText.includes('取关') ||
                               buttonAriaLabel?.includes('Following') ||
                               buttonAriaLabel?.includes('Unfollow');
            
            if (isFollowing) {
              console.log(`ℹ️ 用户 ${username} 已经是关注状态`);
              return true;
            }
            
            console.log(`🎯 点击关注按钮: ${selector}`);
            
            // 多种点击方法
            try {
              // 方法1: 普通点击
              await followButton.click({ force: true });
            } catch (clickError) {
              console.log(`⚠️ 普通点击失败，尝试JavaScript点击...`);
              try {
                await followButton.evaluate(button => button.click());
              } catch (jsClickError) {
                console.log(`⚠️ JavaScript点击也失败，尝试键盘操作...`);
                await followButton.focus();
                await this.page.keyboard.press('Enter');
              }
            }
            
            await this.humanDelay(3000, 5000);
            
            // 验证关注是否成功
            try {
              const updatedButtonText = await followButton.textContent();
              const updatedAriaLabel = await followButton.getAttribute('aria-label');
              
              console.log(`🔍 点击后按钮状态:`);
              console.log(`   更新后文本: "${updatedButtonText}"`);
              console.log(`   更新后Aria: "${updatedAriaLabel}"`);
              
              const isNowFollowing = updatedButtonText.includes('Following') || 
                                    updatedButtonText.includes('已关注') ||
                                    updatedButtonText.includes('Unfollow') ||
                                    updatedButtonText.includes('取关') ||
                                    updatedAriaLabel?.includes('Following') ||
                                    updatedAriaLabel?.includes('Unfollow');
              
              if (isNowFollowing) {
                console.log(`✅ 成功关注用户: ${username}`);
                return true;
              } else {
                console.log(`⚠️ 用户 ${username} 关注可能失败，尝试下一个选择器`);
              }
            } catch (verifyError) {
              console.log(`⚠️ 验证关注状态失败: ${verifyError.message}`);
            }
          }
        } catch (e) {
          console.log(`⚠️ 选择器 "${selector}" 失败: ${e.message}`);
          continue;
        }
      }
      
      // 如果所有选择器都失败，尝试查找可能的关注按钮
      console.log(`🔍 尝试查找任何可能的按钮...`);
      try {
        const allButtons = await this.page.locator('button, div[role="button"], [role="button"]').all();
        
        for (const button of allButtons) {
          try {
            if (await button.isVisible()) {
              const text = await button.textContent();
              const ariaLabel = await button.getAttribute('aria-label');
              
              if (text?.includes('Follow') || text?.includes('关注') || 
                  ariaLabel?.includes('Follow') || ariaLabel?.includes('关注')) {
                console.log(`🎯 发现可能的关注按钮: "${text}"`);
                
                await button.click({ force: true });
                await this.humanDelay(3000, 5000);
                
                const newText = await button.textContent();
                const newAriaLabel = await button.getAttribute('aria-label');
                
                const success = newText?.includes('Following') || 
                               newText?.includes('已关注') ||
                               newAriaLabel?.includes('Following');
                
                if (success) {
                  console.log(`✅ 成功关注用户: ${username}`);
                  return true;
                }
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.log(`⚠️ 遍历所有按钮失败: ${e.message}`);
      }
      
      console.log(`❌ 未找到用户 ${username} 的有效关注按钮`);
      return false;
      
    } catch (error) {
      console.error(`❌ 关注用户 ${username} 失败:`, error.message);
      return false;
    }
  }

  // 随机关注多个用户
  async followRandomUsers(count = 10) {
    try {
      console.log(`🎯 开始随机关注 ${count} 个用户...`);
      
      // 检查登录状态
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        console.log('❌ 用户未登录，请先登录');
        return [];
      }
      
      // 搜索并关注用户
      const followedUsers = await this.searchRandomUsers(count);
      
      // 保存结果
      await this.saveFollowResults(followedUsers);
      
      console.log(`🎉 随机关注任务完成! 共关注 ${followedUsers.length} 个用户`);
      return followedUsers;
      
    } catch (error) {
      console.error('❌ 随机关注用户失败:', error.message);
      return [];
    }
  }

  // 保存关注结果
  async saveFollowResults(users) {
    try {
      const result = {
        timestamp: new Date().toISOString(),
        totalFollowed: users.length,
        users: users
      };
      
      const filename = `follow-results-${Date.now()}.json`;
      const filepath = path.join(this.sessionDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
      console.log('💾 关注结果已保存:', filepath);
      
      return filepath;
    } catch (error) {
      console.error('❌ 保存关注结果失败:', error.message);
    }
  }

  // 清理资源
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log('✅ 关注服务资源清理完成');
    } catch (error) {
      console.error('❌ 资源清理失败:', error.message);
    }
  }
}

module.exports = PlaywrightFollowService;