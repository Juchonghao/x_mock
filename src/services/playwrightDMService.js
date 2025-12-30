const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 基于 Playwright 的 Twitter/X 私信服务
 * 集成风控规避和异常处理
 */
class PlaywrightDMService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.sessionDir = config.session.dir;
    this.xUrl = 'https://x.com';
    this.currentProxy = null;
    
    // 确保会话目录存在
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  async initialize() {
    try {
      console.log('🚀 初始化 Playwright 私信服务...');
      
      // 获取代理设置
      if (config.proxy.url) {
        this.currentProxy = config.proxy.url;
        console.log(`🌐 使用代理: ${this.currentProxy}`);
      }

      // 启动浏览器配置
      const browserOptions = {
        headless: config.browser.headless || false,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--start-maximized',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
      };

      // 添加代理配置
      if (this.currentProxy) {
        browserOptions.proxy = {
          server: this.currentProxy
        };
      }

      this.browser = await chromium.launch(browserOptions);
      
      // 创建浏览器上下文
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();

      // 禁用图片和视频加载（提速+降风控）
      await this.context.route('**/*', route => {
        if (route.request().resourceType() === 'image' || 
            route.request().resourceType() === 'video') {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log('✅ Playwright 浏览器初始化完成');
      return this;
      
    } catch (error) {
      console.error('❌ Playwright 初始化失败:', error);
      throw error;
    }
  }

  async injectCookies() {
    try {
      if (!config.twitter.cookies) {
        console.warn('⚠️ 未提供 cookies，请更新 .env 文件');
        return;
      }

      console.log('🍪 注入认证 cookies...');
      
      // 解析 cookies
      const cookies = JSON.parse(config.twitter.cookies);
      
      // 注入 cookies
      await this.context.addCookies(cookies);
      console.log('✅ Cookies 注入成功');
      
      // 验证登录状态
      await this.page.goto(this.xUrl, { 
        waitUntil: 'load',
        timeout: 30000 
      });
      
      console.log('✅ 成功访问 X (Twitter)');
      
    } catch (error) {
      console.error('❌ 注入 cookies 失败:', error);
      throw error;
    }
  }

  async checkLoginStatus() {
    try {
      console.log('🔍 检查登录状态...');
      
      // 访问主页
      await this.page.goto(this.xUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.humanDelay(3000, 5000);
      
      // 检查是否出现登录按钮（未登录的标志）
      const loginButton = await this.page.locator('a[href="/login"]').first();
      const signUpButton = await this.page.locator('a[href="/i/flow/signup"]').first();
      
      // 检查是否有用户菜单（已登录的标志）
      const userMenu = await this.page.locator('div[data-testid="AppTabBar_More_Menu"]').first();
      
      const isNotLoggedIn = await loginButton.isVisible() || await signUpButton.isVisible();
      const isLoggedIn = await userMenu.isVisible();
      
      if (isLoggedIn && !isNotLoggedIn) {
        console.log('✅ 用户已登录');
        return true;
      } else if (isNotLoggedIn) {
        console.log('❌ 用户未登录');
        return false;
      } else {
        // 不确定状态，尝试检查页面内容
        const pageContent = await this.page.content();
        const hasLoginElements = pageContent.includes('/login') || pageContent.includes('Sign in');
        const hasUserElements = pageContent.includes('Profile') || pageContent.includes('Home');
        
        if (hasUserElements && !hasLoginElements) {
          console.log('✅ 基于页面内容判断：用户已登录');
          return true;
        } else {
          console.log('❌ 基于页面内容判断：用户未登录');
          return false;
        }
      }
      
    } catch (error) {
      console.error('❌ 检查登录状态失败:', error.message);
      return false;
    }
  }

  async autoLogin(username, password) {
    try {
      console.log('🔑 执行自动登录...');
      
      // 访问登录页面
      await this.page.goto('https://x.com/login', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.humanDelay(2000, 3000);
      
      // 输入用户名
      const usernameInput = await this.page.locator('input[name="text"]').first();
      await usernameInput.waitFor({ timeout: 10000 });
      await usernameInput.fill(username);
      
      // 点击下一步
      const nextButton = await this.page.locator('button:has-text("下一步")').first();
      await nextButton.click();
      
      await this.humanDelay(2000, 4000);
      
      // 如果需要输入用户名（用户名验证）
      const usernameInput2 = await this.page.locator('input[name="text"]').first();
      if (await usernameInput2.isVisible()) {
        await usernameInput2.fill(username.replace('@', ''));
        await nextButton.click();
        await this.humanDelay(2000, 3000);
      }
      
      // 输入密码
      const passwordInput = await this.page.locator('input[name="password"]').first();
      await passwordInput.fill(password);
      
      // 点击登录
      const loginButton = await this.page.locator('button:has-text("登录")').first();
      await loginButton.click();
      
      // 等待页面响应
      await this.humanDelay(3000, 5000);
      
      // 检查是否需要2FA验证码
      const passcodeInput = await this.page.locator('input[name="text"], input[data-testid="ocfEnterTextInput"], input[placeholder*="code"], input[placeholder*="验证"]').first();
      if (await passcodeInput.isVisible()) {
        console.log('🔐 检测到需要2FA验证码');
        await passcodeInput.fill('0000');
        
        // 查找并点击确认按钮
        const confirmButton = await this.page.locator('button:has-text("确认"), button:has-text("验证"), button[type="submit"]').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        await this.humanDelay(3000, 5000);
      }
      
      // 等待登录完成
      await this.page.waitForURL('**/home', { timeout: 20000 });
      
      console.log('✅ 登录成功');
      
      // 保存 cookies 供下次使用
      await this.saveCookies();
      
      return true;
      
    } catch (error) {
      console.error('❌ 自动登录失败:', error.message);
      throw error;
    }
  }

  async saveCookies() {
    try {
      const cookies = await this.context.cookies();
      const cookiesPath = path.join(this.sessionDir, 'playwright_cookies.json');
      
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('✅ Cookies 已保存到:', cookiesPath);
      
    } catch (error) {
      console.error('❌ 保存 cookies 失败:', error.message);
    }
  }

  async loadCookies() {
    try {
      const cookiesPath = path.join(this.sessionDir, 'playwright_cookies.json');
      
      if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        await this.context.addCookies(cookies);
        console.log('✅ 已加载保存的 cookies');
        return true;
      }
      
      console.log('ℹ️ 未找到保存的 cookies 文件');
      return false;
      
    } catch (error) {
      console.error('❌ 加载 cookies 失败:', error.message);
      return false;
    }
  }

  async sendDirectMessage(targetUsername, message) {
    try {
      console.log(`💬 开始私信 @${targetUsername}...`);
      
      // 进入私信页面
      await this.page.goto('https://x.com/messages', { 
        waitUntil: 'load',
        timeout: 30000 
      });
      
      await this.humanDelay(3000, 5000);
      
      // 🚨 重要：在搜索之前先检查passcode
      console.log('🔐 进入私信页面后立即检查passcode...');
      await this.handlePasscode();
      
      // 等待passcode处理完成后，再尝试搜索
      await this.humanDelay(3000, 5000);
      
      // 尝试不同的私信发送策略
      
      // 策略1: 尝试点击"新私信"按钮
      let dmDialogOpened = false;
      const newChatSelectors = [
        'button[data-testid="NewChat_Button"]',
        'a[href*="/messages/compose"]',
        'button[aria-label*="New Message"]',
        'button[aria-label*="新建私信"]',
        '[data-testid="newMessageButton"]'
      ];
      
      for (const selector of newChatSelectors) {
        try {
          const newChatButton = await this.page.locator(selector).first();
          if (await newChatButton.isVisible()) {
            console.log(`✅ 找到新私信按钮: ${selector}`);
            await newChatButton.click();
            await this.humanDelay(2000, 3000);
            dmDialogOpened = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 策略2: 如果没有找到新私信按钮，直接在当前页面搜索用户
      if (!dmDialogOpened) {
        console.log('⚠️ 未找到新私信按钮，尝试直接搜索');
        const searchResult = await this.searchAndOpenDirectMessage(targetUsername);
        dmDialogOpened = searchResult;
        console.log(`🔍 搜索结果: ${searchResult ? '成功' : '失败'}`);
      }
      
      if (!dmDialogOpened) {
        console.log('❌ 所有打开私信对话框的策略都失败了');
        throw new Error('无法打开私信对话框');
      }
      
      // 再次检查是否需要passcode验证（可能在搜索过程中又出现）
      console.log('🔐 搜索后再次检查passcode...');
      await this.handlePasscode();
      
      // 输入并发送私信
      const messageSent = await this.typeAndSendMessage(message);
      
      if (messageSent) {
        console.log(`✅ 私信发送成功: ${message}`);
        await this.screenshot(`dm-sent-${targetUsername}-${Date.now()}.png`);
        return true;
      } else {
        throw new Error('发送私信失败');
      }
      
    } catch (error) {
      console.error(`❌ 私信发送失败: ${error.message}`);
      await this.screenshot(`dm-error-${targetUsername}-${Date.now()}.png`);
      return false;
    }
  }

  async searchAndOpenDirectMessage(targetUsername) {
    try {
      console.log(`🔍 在私信页面搜索用户: ${targetUsername}`);
      
      // 查找私信页面的搜索框
      const searchSelectors = [
        'input[placeholder*="Search messages"]',
        'input[placeholder*="搜索私信"]',
        'input[placeholder*="Search"]',
        'div[contenteditable="true"][placeholder*="Search"]',
        'div[contenteditable="true"][placeholder*="搜索"]',
        'input[data-testid="SearchBox_Search_Input"]',
        'div[data-testid="SearchBox_Search_Input"]'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          const input = await this.page.locator(selector).first();
          if (await input.isVisible()) {
            searchInput = input;
            console.log(`✅ 找到私信搜索框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!searchInput) {
        console.log('❌ 未找到私信搜索框');
        return false;
      }
      
      // 点击搜索框并输入用户名
      await searchInput.click();
      await this.humanDelay(1000, 2000);
      
      const searchQuery = targetUsername.startsWith('@') ? targetUsername : `@${targetUsername}`;
      await searchInput.fill(searchQuery);
      await this.humanDelay(2000, 3000);
      
      // 等待搜索结果 - 增加等待时间
      console.log('⏳ 等待搜索结果出现...');
      await this.page.waitForTimeout(5000);
      
      // 拍摄搜索状态截图
      await this.screenshot(`search-state-${targetUsername.replace('@', '')}.png`);
      
      // 专门查找dropdown中的搜索结果选项
      const dropdownUserSelectors = [
        // Dropdown中的用户选项
        'div[role="option"]',
        'li[role="option"]',
        'div[role="listbox"] > div',
        'div[role="listbox"] > li',
        
        // 用户建议项
        '[data-testid="TypeaheadUserItem"]',
        '[data-testid="UserCell"]',
        '[data-testid="UserPreview"]',
        
        // 包含@的用户项
        `div:has-text("@${targetUsername.replace('@', '')}")`,
        `li:has-text("@${targetUsername.replace('@', '')}")`,
        
        // 搜索建议容器中的用户项
        'div[aria-expanded="true"] div[role="button"]',
        'div[aria-expanded="true"] li[role="button"]',
        'div[aria-haspopup="listbox"] div[role="button"]',
        
        // 通用dropdown选项
        '[data-testid="dropdown"] [role="option"]',
        '[data-testid="typeahead"] [role="option"]',
        'div[class*="dropdown"] [role="option"]'
      ];
      
      console.log('🔍 查找dropdown中的搜索结果...');
      
      let foundUser = false;
      for (const selector of dropdownUserSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          console.log(`🔍 找到 ${elements.length} 个 ${selector} 元素`);
          
          for (let i = 0; i < elements.length; i++) {
            try {
              const element = elements[i];
              if (await element.isVisible()) {
                const text = await element.textContent();
                const innerHTML = await element.innerHTML();
                
                console.log(`📋 检查元素 ${i + 1}/${elements.length}: ${text?.substring(0, 50)}...`);
                
                // 检查是否包含目标用户名
                const cleanUsername = targetUsername.replace('@', '').toLowerCase();
                const isMatch = text?.toLowerCase().includes(cleanUsername) || 
                               text?.includes('@') || 
                               innerHTML?.includes('@');
                
                if (isMatch) {
                  console.log(`✅ 找到匹配的用户选项: ${selector}`);
                  console.log(`   匹配文本: ${text?.substring(0, 100)}...`);
                  
                  // 点击该用户选项
                  await element.click();
                  await this.humanDelay(2000, 3000);
                  
                  // 验证是否真正进入私信对话界面
                  const isInDM = await this.verifyInDirectMessage();
                  if (isInDM) {
                    console.log('✅ 成功进入私信对话界面');
                    foundUser = true;
                    break;
                  } else {
                    console.log('⚠️ 点击后未进入私信对话，尝试寻找发送按钮...');
                    // 尝试寻找"开始对话"或"发送私信"按钮
                    await this.findAndClickSendMessageButton();
                    
                    // 再次验证
                    const isInDM2 = await this.verifyInDirectMessage();
                    if (isInDM2) {
                      console.log('✅ 通过发送按钮进入私信对话界面');
                      foundUser = true;
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              console.log(`❌ 检查元素 ${i} 时出错: ${e.message}`);
              continue;
            }
          }
          
          if (foundUser) break;
          
        } catch (e) {
          console.log(`❌ 选择器 ${selector} 查找失败: ${e.message}`);
          continue;
        }
      }
      
      // 如果dropdown方法失败，尝试传统方法
      if (!foundUser) {
        console.log('🔄 dropdown方法失败，尝试传统搜索方法...');
        
        const userSelectors = [
          // 用户链接（包含用户名）
          `a[href*="/${targetUsername.replace('@', '')}"]`,
          `a[href*="/${targetUsername.replace('@', '').toLowerCase()}"]`,
          
          // 通用用户相关元素
          'div[data-testid="UserCell"]',
          'div[data-testid="UserName"]',
          'div[data-testid="DMThreadItem"]',
          'div[data-testid="typeaheadUser"]',
          
          // 可点击的用户容器
          'button[role="button"]',
          'div[role="button"]',
          
          // 搜索结果项
          '[data-testid="TypeaheadUserItem"]',
          '[data-testid="UserPreview"]',
          
          // 包含@符号的元素（搜索建议）
          `div:has-text("@${targetUsername.replace('@', '')}")`,
          'div:has-text("Search results")',
          'div:has-text("搜索结果")',
          
          // 通用搜索结果
          'div[role="button"]:has-text("@")',
          'div[role="button"]:has-text("用户")'
        ];
        
        for (const selector of userSelectors) {
          try {
            const userElement = await this.page.locator(selector).first();
            if (await userElement.isVisible()) {
              // 检查元素是否包含相关文本
              const text = await userElement.textContent();
              const innerHTML = await userElement.innerHTML();
              
              console.log(`✅ 找到可能的用户元素: ${selector}`);
              console.log(`   文本内容: ${text?.substring(0, 100)}...`);
              
              // 如果是通用按钮，检查是否包含@符号或用户名
              if (selector.includes('button') || selector.includes('div[role="button"]')) {
                const cleanUsername = targetUsername.replace('@', '').toLowerCase();
                if (text?.toLowerCase().includes(cleanUsername) || 
                    text?.includes('@') || 
                    innerHTML?.includes('@')) {
                  console.log(`✅ 用户元素匹配条件，点击: ${selector}`);
                  await userElement.click();
                  await this.humanDelay(2000, 3000);
                  
                  // 验证是否真正进入私信对话界面
                  const isInDM = await this.verifyInDirectMessage();
                  if (isInDM) {
                    console.log('✅ 真正进入私信对话界面');
                    foundUser = true;
                    break;
                  } else {
                    console.log('⚠️ 未进入真正私信对话，继续寻找发送按钮...');
                    // 尝试寻找"开始对话"或"发送私信"按钮
                    await this.findAndClickSendMessageButton();
                    
                    // 再次验证
                    const isInDM2 = await this.verifyInDirectMessage();
                    if (isInDM2) {
                      console.log('✅ 通过发送按钮进入私信对话界面');
                      foundUser = true;
                      break;
                    }
                  }
                } else {
                  console.log(`⚠️ 用户元素不匹配，继续查找下一个...`);
                  continue;
                }
              } else {
                // 其他选择器直接点击
                console.log(`✅ 直接点击用户元素: ${selector}`);
                await userElement.click();
                await this.humanDelay(2000, 3000);
                
                // 验证是否真正进入私信对话界面
                const isInDM = await this.verifyInDirectMessage();
                if (isInDM) {
                  console.log('✅ 真正进入私信对话界面');
                  foundUser = true;
                  break;
                } else {
                  console.log('⚠️ 未进入真正私信对话，继续寻找发送按钮...');
                  // 尝试寻找"开始对话"或"发送私信"按钮
                  await this.findAndClickSendMessageButton();
                  
                  // 再次验证
                  const isInDM2 = await this.verifyInDirectMessage();
                  if (isInDM2) {
                    console.log('✅ 通过发送按钮进入私信对话界面');
                    foundUser = true;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.log(`❌ 选择器 ${selector} 查找失败: ${e.message}`);
            continue;
          }
        }
      }
      
      if (!foundUser) {
        console.log('❌ 未找到用户搜索结果');
        
        // 尝试直接通过用户名搜索URL访问
        const username = targetUsername.replace('@', '');
        console.log(`🔗 尝试直接访问用户页面...`);
        try {
          await this.page.goto(`https://x.com/${username}`, { 
            waitUntil: 'load',
            timeout: 15000 
          });
          await this.humanDelay(2000, 3000);
          
          // 尝试找到私信按钮
          const dmButtonSelectors = [
            'a[href*="/messages/compose"]',
            'button[data-testid="DM_Button"]',
            'button[data-testid="DmButton"]',
            'button:has-text("Message")',
            'button:has-text("私信")',
            'a[aria-label*="Message"]',
            'div[role="button"]:has-text("Message")',
            'div[role="button"]:has-text("私信")'
          ];
          
          for (const dmSelector of dmButtonSelectors) {
            try {
              const dmButton = await this.page.locator(dmSelector).first();
              if (await dmButton.isVisible()) {
                console.log(`✅ 找到私信按钮: ${dmSelector}`);
                await dmButton.click();
                await this.humanDelay(2000, 3000);
                console.log('✅ 通过用户页面打开私信对话框');
                return true;
              }
            } catch (e) {
              continue;
            }
          }
          
          console.log('❌ 在用户页面未找到私信按钮');
        } catch (e) {
          console.log(`❌ 直接访问用户页面失败: ${e.message}`);
        }
        
        return false;
      }
      return true;
      
    } catch (error) {
      console.error(`❌ 搜索用户失败: ${error.message}`);
      return false;
    }
  }

  // 验证是否真正进入私信对话界面
  async verifyInDirectMessage() {
    try {
      console.log('🔍 验证是否真正进入私信对话界面...');
      
      // 查找私信对话界面的特征元素
      const dmIndicators = [
        'div[aria-label*="Message"]',
        'div[aria-label*="消息"]',
        'div[data-testid*="DM"]',
        'div[data-testid*="MessageThread"]',
        'div[data-testid*="conversation"]',
        'input[placeholder*="Message"]',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"][placeholder*="Message"]',
        'div[role="textbox"][placeholder*="Message"]',
        // 聊天消息区域
        'div[data-testid="message"]',
        'div[data-testid="dmMessage"]',
        'div[data-testid*="MessageBubble"]',
        'div[data-testid*="DMThreadItem"]'
      ];
      
      for (const indicator of dmIndicators) {
        try {
          const element = await this.page.locator(indicator).first();
          if (await element.isVisible()) {
            console.log(`✅ 找到私信对话界面特征: ${indicator}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('❌ 未找到私信对话界面特征');
      return false;
      
    } catch (error) {
      console.error('❌ 验证私信对话界面失败:', error.message);
      return false;
    }
  }

  // 寻找并点击发送私信按钮
  async findAndClickSendMessageButton() {
    try {
      console.log('🔍 寻找发送私信按钮...');
      
      const sendButtonSelectors = [
        'button[data-testid="DM_Button"]',
        'button[data-testid="DmButton"]',
        'button[data-testid="messageButton"]',
        'button:has-text("Message")',
        'button:has-text("私信")',
        'button:has-text("发送")',
        'button:has-text("Send")',
        'div[role="button"]:has-text("Message")',
        'div[role="button"]:has-text("私信")',
        'div[role="button"]:has-text("发送")',
        'div[role="button"]:has-text("Send")',
        'a[href*="/messages/compose"]',
        'button[aria-label*="Message"]',
        'button[aria-label*="私信"]',
        'button[aria-label*="Send"]',
        'div[aria-label*="Message"]',
        'div[aria-label*="私信"]',
        'div[aria-label*="Send"]'
      ];
      
      for (const selector of sendButtonSelectors) {
        try {
          const button = await this.page.locator(selector).first();
          if (await button.isVisible()) {
            console.log(`✅ 找到发送按钮: ${selector}`);
            await button.click();
            await this.humanDelay(2000, 3000);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('❌ 未找到发送按钮');
      return false;
      
    } catch (error) {
      console.error('❌ 寻找发送按钮失败:', error.message);
      return false;
    }
  }

  async handlePasscode() {
    try {
      console.log('🔐 持续监控passcode出现...');
      
      // 查找passcode输入框 - 优先检查name="text"
      const passcodeSelectors = [
        'input[name="text"]',
        'input[placeholder*="Passcode"]',
        'input[placeholder*="passcode"]',
        'input[placeholder*="Code"]',
        'input[placeholder*="code"]',
        'input[placeholder*="验证码"]',
        'input[placeholder*="验证"]',
        'input[data-testid*="Passcode"]',
        'input[data-testid*="Code"]',
        'input[data-testid*="EnterText"]',
        'input[data-testid="ocfEnterTextInput"]',
        'input[type="text"]',
        'input[type="tel"]',
        'input[inputmode="numeric"]',
        'div[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]'
      ];
      
      // 持续监控passcode输入框的出现（最多等待30秒）
      let passcodeInput = null;
      let attempts = 0;
      const maxAttempts = 30; // 最多尝试30次，每次1秒
      
      while (!passcodeInput && attempts < maxAttempts) {
        for (const selector of passcodeSelectors) {
          try {
            const input = await this.page.locator(selector).first();
            const visible = await input.isVisible();
            if (visible) {
              passcodeInput = input;
              console.log(`✅ 找到passcode输入框: ${selector} (尝试 ${attempts + 1}/${maxAttempts})`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!passcodeInput) {
          attempts++;
          if (attempts % 5 === 0) {
            console.log(`⏳ 继续监控passcode... (${attempts}/${maxAttempts})`);
          }
          if (attempts < maxAttempts) {
            await this.humanDelay(1000, 1500); // 等待1秒再检查
          }
        }
      }
      
      if (passcodeInput) {
        console.log('🔐 检测到passcode输入需求，输入0000...');
        
        await passcodeInput.click();
        await this.humanDelay(1000, 1500);
        
        // 清空输入框
        await passcodeInput.fill('');
        await this.humanDelay(500, 1000);
        
        // 改进的passcode输入方法 - 使用keyboard.press()逐字符输入
        const passcode = '0000';
        for (let i = 0; i < passcode.length; i++) {
          await this.page.keyboard.press(passcode[i]);
          await this.humanDelay(200, 400); // 每个字符之间的延迟
          
          // 实时检查输入结果
          const currentValue = await passcodeInput.inputValue();
          console.log(`  输入字符 ${i + 1}: "${passcode[i]}", 当前值: "${currentValue}"`);
        }
        
        console.log('✅ 完成passcode输入');
        
        // 等待一下让系统处理
        await this.humanDelay(2000, 3000);
        
        // 查找确认按钮（可选）
        const confirmSelectors = [
          'button[data-testid*="Continue"]',
          'button[type="submit"]',
          'button:has-text("Continue")',
          'button:has-text("继续")',
          'button:has-text("确认")',
          'button:has-text("验证")',
          'button[aria-label*="Continue"]',
          'button[aria-label*="继续"]'
        ];
        
        let confirmFound = false;
        for (const selector of confirmSelectors) {
          try {
            const confirmButton = await this.page.locator(selector).first();
            if (await confirmButton.isVisible()) {
              console.log(`✅ 找到确认按钮: ${selector}`);
              await confirmButton.click();
              await this.humanDelay(2000, 3000);
              confirmFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!confirmFound) {
          console.log('ℹ️ 未找到确认按钮，等待自动处理...');
          // 等待X自动处理passcode验证
          await this.humanDelay(3000, 5000);
        }
        
        console.log('✅ passcode处理完成');
      } else {
        console.log('ℹ️ 监控期结束，未检测到passcode输入需求');
      }
      
    } catch (error) {
      console.error(`❌ passcode处理失败: ${error.message}`);
    }
  }

  async searchAndSelectUser(targetUsername) {
    try {
      console.log(`🔍 搜索用户: ${targetUsername}`);
      
      // 尝试在私信页面直接搜索
      let searchInput = null;
      
      // 方法1: 查找私信页面的搜索框
      const searchSelectors = [
        'input[placeholder*="Search"]',
        'input[placeholder*="搜索"]',
        'input[data-testid="SearchBox_Search_Input"]',
        'input[type="search"]',
        'input[name="q"]',
        'div[contenteditable="true"][data-testid="SearchBox_Search_Input"]'
      ];
      
      for (const selector of searchSelectors) {
        try {
          const input = await this.page.locator(selector).first();
          if (await input.isVisible()) {
            searchInput = input;
            console.log(`✅ 找到搜索框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (searchInput) {
        // 点击搜索框并输入用户名
        await searchInput.click();
        await this.humanDelay(1000, 2000);
        
        const searchQuery = targetUsername.startsWith('@') ? targetUsername : `@${targetUsername}`;
        await searchInput.fill(searchQuery);
        await this.humanDelay(2000, 3000);
        
        // 等待搜索结果
        await this.page.waitForTimeout(3000);
        
        // 查找搜索结果
        const searchResults = await this.page.locator('a[href*="/' + targetUsername.replace('@', '') + '"], div[data-testid="UserCell"], div[data-testid="UserName"]').first();
        if (await searchResults.isVisible()) {
          await searchResults.click();
          await this.humanDelay(2000, 3000);
          console.log('✅ 成功找到并点击用户');
          return true;
        }
      }
      
      // 方法2: 如果搜索失败，尝试直接访问用户页面
      console.log('⚠️ 搜索失败，尝试直接访问用户页面');
      return await this.directUserAccess(targetUsername);
      
    } catch (error) {
      console.error(`❌ 搜索用户失败: ${error.message}`);
      return false;
    }
  }

  async directUserAccess(username) {
    try {
      console.log(`🔗 直接访问用户页面: @${username}`);
      
      // 直接访问用户页面
      await this.page.goto(`https://x.com/${username}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.humanDelay(3000, 4000);
      
      // 查找私信按钮
      const dmButton = await this.page.locator('a[href*="/messages"], button[aria-label*="Message"], div[data-testid="DM_Button"]').first();
      
      if (await dmButton.isVisible()) {
        await dmButton.click();
        await this.humanDelay(2000, 3000);
        console.log('✅ 成功打开私信对话框');
        return true;
      } else {
        throw new Error('未找到私信按钮');
      }
      
    } catch (error) {
      console.error(`❌ 直接访问用户失败: ${error.message}`);
      return false;
    }
  }

  async typeAndSendMessage(message) {
    try {
      console.log('📝 开始输入消息...');
      
      // 拍摄消息输入前的截图
      await this.screenshot('before-message-input.png');
      
      // 查找消息输入框 - 扩展选择器列表
      const inputSelectors = [
        // 具体的选择器
        'div[aria-label="输入消息"]',
        'div[data-testid="dmComposerTextInput"]',
        'div[data-testid="DMComposerInput"]',
        'div[data-testid="MessageInput"]',
        'div[data-testid="messageComposer"]',
        'div[data-testid="composer"]',
        'div[data-testid="DMComposer"]',
        
        // 通用输入框
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="消息"]',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="私信"]',
        
        // 占位符文本
        'div[placeholder*="Message"]',
        'div[placeholder*="消息"]',
        'div[placeholder*="message"]',
        'div[placeholder*="私信"]',
        'div[placeholder*="输入"]',
        'div[placeholder*="type"]',
        
        // 属性选择器
        '[contenteditable="true"]',
        'textarea[data-testid*="Input"]',
        'textarea[data-testid*="Message"]',
        'textarea[data-testid*="Composer"]',
        
        // 通用div输入框
        'div[contenteditable="true"][placeholder*="Message"]',
        'div[contenteditable="true"][placeholder*="消息"]'
      ];
      
      let messageInput = null;
      let foundSelector = '';
      
      console.log('🔍 查找消息输入框...');
      for (const selector of inputSelectors) {
        try {
          const input = await this.page.locator(selector).first();
          const isVisible = await input.isVisible();
          console.log(`  检查 ${selector}: 可见=${isVisible}`);
          
          if (isVisible) {
            messageInput = input;
            foundSelector = selector;
            console.log(`✅ 找到消息输入框: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`  选择器 ${selector} 错误: ${e.message}`);
          continue;
        }
      }
      
      if (!messageInput) {
        console.log('❌ 所有消息输入框选择器都未找到');
        
        // 拍摄当前页面状态
        await this.screenshot('no-message-input-found.png');
        
        throw new Error(`未找到消息输入框，已检查 ${inputSelectors.length} 个选择器`);
      }
      
      // 点击输入框
      console.log(`🎯 点击消息输入框: ${foundSelector}`);
      await messageInput.click();
      await this.humanDelay(1000, 1500);
      
      // 清空输入框内容
      console.log('🧹 清空输入框...');
      await messageInput.fill('');
      await this.humanDelay(500, 1000);
      
      // 模拟逐字输入（更像真人，防风控）
      console.log(`⌨️ 开始输入消息: "${message}"`);
      for (let i = 0; i < message.length; i++) {
        const char = message[i];
        await messageInput.type(char);
        await this.humanDelay(150, 400);
        
        // 每输入5个字符显示进度
        if ((i + 1) % 5 === 0 || i === message.length - 1) {
          console.log(`  输入进度: ${i + 1}/${message.length} 字符`);
        }
      }
      
      console.log('✅ 消息输入完成');
      await this.humanDelay(1000, 2000);
      
      // 拍摄输入完成后的截图
      await this.screenshot('message-input-completed.png');
      
      // 尝试点击发送按钮 - 扩展选择器列表
      const sendButtonSelectors = [
        'button[data-testid="sendButton"]',
        'button[data-testid="DM_Send"]',
        'button[data-testid="DmSend"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        'button[aria-label*="Message"]',
        'button[type="submit"]',
        'div[aria-label*="Send"]',
        'div[aria-label*="发送"]',
        'div[data-testid*="send"]',
        'button:has-text("Send")',
        'button:has-text("发送")',
        'div[role="button"]:has-text("Send")',
        'div[role="button"]:has-text("发送")'
      ];
      
      let sendButton = null;
      let foundSendButtonSelector = '';
      
      console.log('🔍 查找发送按钮...');
      for (const selector of sendButtonSelectors) {
        try {
          const button = await this.page.locator(selector).first();
          const isVisible = await button.isVisible();
          console.log(`  检查 ${selector}: 可见=${isVisible}`);
          
          if (isVisible) {
            sendButton = button;
            foundSendButtonSelector = selector;
            console.log(`✅ 找到发送按钮: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`  选择器 ${selector} 错误: ${e.message}`);
          continue;
        }
      }
      
      if (sendButton) {
        console.log(`📤 点击发送按钮: ${foundSendButtonSelector}`);
        await sendButton.click();
      } else {
        console.log('⌨️ 未找到发送按钮，尝试多种发送方法...');
        
        // 方法1: 尝试按回车键发送
        console.log('🔄 尝试方法1: 按回车键发送');
        await this.page.keyboard.press('Enter');
        await this.humanDelay(1000, 2000);
        
        // 检查是否发送成功，如果不成功尝试其他方法
        const checkResult = await this.checkMessageSent();
        if (!checkResult) {
          // 方法2: 尝试按Ctrl+Enter发送
          console.log('🔄 尝试方法2: 按Ctrl+Enter发送');
          await this.page.keyboard.press('Control+Enter');
          await this.humanDelay(1000, 2000);
          
          const checkResult2 = await this.checkMessageSent();
          if (!checkResult2) {
            // 方法3: 尝试按Shift+Enter发送
            console.log('🔄 尝试方法3: 按Shift+Enter发送');
            await this.page.keyboard.press('Shift+Enter');
            await this.humanDelay(1000, 2000);
            
            const checkResult3 = await this.checkMessageSent();
            if (!checkResult3) {
              // 方法4: 尝试聚焦后按Enter
              console.log('🔄 尝试方法4: 聚焦后按Enter发送');
              await messageInput.focus();
              await this.humanDelay(500, 1000);
              await this.page.keyboard.press('Enter');
              await this.humanDelay(1000, 2000);
              
              const checkResult4 = await this.checkMessageSent();
              if (!checkResult4) {
                console.log('❌ 所有发送方法都失败');
              }
            }
          }
        }
      }
      
      await this.humanDelay(2000, 3000);
      
      // 拍摄发送后的截图
      await this.screenshot('after-message-sent.png');
      
      // 检查是否发送成功
      console.log('🔍 检查消息是否发送成功...');
      const isSent = await this.checkMessageSent();
      
      if (isSent) {
        console.log('✅ 消息发送成功');
        return true;
      } else {
        console.log('❌ 消息发送失败');
        return false;
      }
      
    } catch (error) {
      console.error(`❌ 输入和发送消息失败: ${error.message}`);
      return false;
    }
  }

  async checkMessageSent() {
    try {
      console.log('🔍 精确检查消息发送状态...');
      
      // 1. 检查是否有错误提示
      const errorSelectors = [
        'div[role="alert"]',
        '[data-testid*="error"]',
        'div:has-text("Error")',
        'div:has-text("error")',
        'div:has-text("失败")',
        'div:has-text("Error")'
      ];
      
      for (const errorSelector of errorSelectors) {
        try {
          const errorElements = await this.page.locator(errorSelector);
          for (let i = 0; i < await errorElements.count(); i++) {
            const errorElement = errorElements.nth(i);
            if (await errorElement.isVisible()) {
              const errorText = await errorElement.textContent();
              if (errorText && (errorText.includes('error') || errorText.includes('Error') || errorText.includes('失败'))) {
                console.log(`⚠️ 检测到错误: ${errorText}`);
                return false;
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 2. 检查发送按钮是否还存在（如果发送成功，发送按钮应该消失）
      const sendButtonSelectors = [
        'button[data-testid="sendButton"]',
        'button[data-testid="DM_Send"]',
        'button[data-testid="DmSend"]',
        'button[aria-label*="Send"]',
        'div[role="button"][aria-label*="Send"]',
        'div[data-testid*="send"]'
      ];
      
      let sendButtonFound = false;
      for (const sendSelector of sendButtonSelectors) {
        try {
          const sendButton = await this.page.locator(sendSelector).first();
          if (await sendButton.isVisible()) {
            sendButtonFound = true;
            console.log(`⚠️ 发送按钮仍然存在: ${sendSelector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 3. 检查消息输入框是否清空
      const messageInputSelectors = [
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        'input[placeholder*="Message"]',
        'input[placeholder*="消息"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="消息"]'
      ];
      
      let inputCleared = false;
      for (const inputSelector of messageInputSelectors) {
        try {
          const messageInput = await this.page.locator(inputSelector).first();
          if (await messageInput.isVisible()) {
            const inputText = await messageInput.textContent();
            if (!inputText || inputText.trim() === '') {
              inputCleared = true;
              console.log('✅ 消息输入框已清空');
              break;
            } else {
              console.log(`⚠️ 输入框仍有内容: "${inputText}"`);
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 4. 检查是否有消息气泡出现（消息已发送到对话中）
      const messageBubbleSelectors = [
        'div[data-testid="message"]',
        'div[data-testid="dmMessage"]',
        'div[data-testid*="MessageBubble"]',
        'div[data-testid*="DMThreadItem"]',
        'div[aria-label*="message"]',
        'div[aria-label*="Message"]'
      ];
      
      let newMessageFound = false;
      for (const bubbleSelector of messageBubbleSelectors) {
        try {
          const messageBubbles = await this.page.locator(bubbleSelector);
          const count = await messageBubbles.count();
          if (count > 0) {
            // 检查最新的消息气泡
            const latestBubble = messageBubbles.last();
            const bubbleText = await latestBubble.textContent();
            const bubbleTime = await latestBubble.locator('time').first();
            const hasTime = await bubbleTime.isVisible();
            
            if (bubbleText && hasTime) {
              newMessageFound = true;
              console.log(`✅ 检测到新消息气泡: "${bubbleText.substring(0, 50)}..."`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 5. 综合判断发送状态
      console.log('📊 发送状态检查结果:');
      console.log(`   - 错误提示: 无`);
      console.log(`   - 发送按钮存在: ${sendButtonFound}`);
      console.log(`   - 输入框清空: ${inputCleared}`);
      console.log(`   - 新消息气泡: ${newMessageFound}`);
      
      // 判断条件：
      // - 没有错误提示
      // - 输入框已清空 OR 没有发送按钮存在 OR 检测到新消息气泡
      const isSent = (!sendButtonFound || inputCleared || newMessageFound);
      
      if (isSent) {
        console.log('✅ 消息发送验证通过');
        return true;
      } else {
        console.log('❌ 消息发送验证失败');
        return false;
      }
      
    } catch (error) {
      console.error('❌ 检查消息发送状态失败:', error.message);
      return false;
    }
  }

  async sendBatchMessages(targetUsers, message, delayBetweenUsers = 300000) { // 5分钟间隔
    try {
      console.log(`📤 开始批量私信 ${targetUsers.length} 个用户...`);
      
      const results = [];
      
      for (let i = 0; i < targetUsers.length; i++) {
        const username = targetUsers[i];
        console.log(`\n🎯 处理用户 ${i + 1}/${targetUsers.length}: @${username}`);
        
        try {
          // 发送私信
          const success = await this.sendDirectMessage(username, message);
          
          results.push({
            username,
            success,
            timestamp: new Date().toISOString()
          });
          
          if (success) {
            console.log(`✅ 私信成功: @${username}`);
          } else {
            console.log(`❌ 私信失败: @${username}`);
          }
          
        } catch (userError) {
          console.error(`❌ 处理用户 ${username} 时出错:`, userError.message);
          results.push({
            username,
            success: false,
            error: userError.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // 用户间隔延时（除最后一个用户）
        if (i < targetUsers.length - 1) {
          console.log(`⏳ 等待 ${delayBetweenUsers / 1000} 秒后处理下一个用户...`);
          await this.humanDelay(delayBetweenUsers, delayBetweenUsers + 60000);
        }
      }
      
      console.log(`\n📊 批量私信完成`);
      console.log(`✅ 成功: ${results.filter(r => r.success).length}`);
      console.log(`❌ 失败: ${results.filter(r => !r.success).length}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ 批量私信失败:', error.message);
      throw error;
    }
  }

  async screenshot(filename) {
    try {
      const filePath = path.join(this.sessionDir, filename);
      await this.page.screenshot({ path: filePath, fullPage: true });
      console.log('📸 截图已保存:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ 截图失败:', error.message);
      return null;
    }
  }

  // 真人行为模拟延时
  async humanDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 生成带随机后缀的消息（防风控）
  generateMessageWithRandomSuffix(baseMessage) {
    const suffixes = [
      '🤖',
      '✨',
      '💫',
      '🌟',
      '🚀',
      ` ${Math.floor(Math.random() * 1000)}`
    ];
    
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return baseMessage + randomSuffix;
  }

  // 检查今日发送限制
  checkDailyLimit(sentCount, maxDaily = 10) {
    if (sentCount >= maxDaily) {
      console.log(`⚠️ 达到每日发送限制 (${maxDaily})`);
      return false;
    }
    return true;
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Playwright 浏览器已关闭');
      }
    } catch (error) {
      console.error('❌ 关闭浏览器失败:', error.message);
    }
  }

  // 获取服务状态
  getStatus() {
    return {
      browserInitialized: !!this.browser,
      pageLoaded: !!this.page,
      proxyUsed: this.currentProxy,
      sessionDir: this.sessionDir
    };
  }
}

module.exports = PlaywrightDMService;