const BrowserService = require('./browserService');

class DMService extends BrowserService {
  constructor() {
    super();
    this.xUrl = 'https://x.com';
    this.targetUsers = [
      'kent236896',
      'allen180929', 
      'fred_0201',
      'Alex09936200'
    ];
    this.message = 'Hello';
    this.sentUsers = new Set();
  }

  async initialize() {
    await super.initialize();
    console.log('DM Service initialized');
    
    // 注入 cookie 以确保登录状态
    await this.injectCookies(this.xUrl);
    console.log('✅ Cookie注入完成');
    
    return this;
  }

  // 检查登录状态 - 改进版本
  async checkLoginStatus() {
    try {
      console.log('🔍 检查登录状态...');
      
      // 直接访问X首页
      await this.page.goto(this.xUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log('📄 页面已加载，检查登录状态...');
      
      // 等待页面元素加载
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 多种方式检查登录状态
      const checks = [
        // 检查是否有用户头像或菜单（已登录的标志）
        async () => {
          const avatar = await this.page.$('img[alt*="Profile"]');
          const userMenu = await this.page.$('div[data-testid="AppTabBar_More_Menu"]');
          return !!(avatar || userMenu);
        },
        
        // 检查是否有登录按钮（未登录的标志）
        async () => {
          const loginButton = await this.page.$('a[href="/login"]');
          const signUpButton = await this.page.$('a[href="/i/flow/signup"]');
          return !!(loginButton || signUpButton);
        },
        
        // 检查页面URL是否重定向到登录页
        async () => {
          const currentUrl = this.page.url();
          return currentUrl.includes('/login') || currentUrl.includes('/i/flow/signup');
        }
      ];
      
      let isLoggedIn = false;
      let isNotLoggedIn = false;
      
      // 执行所有检查
      for (const check of checks) {
        try {
          const result = await check();
          if (result === true) {
            // 如果找到登录按钮，说明未登录
            const loginCheck = await checks[1]();
            if (loginCheck) {
              isNotLoggedIn = true;
              break;
            }
            // 如果找到用户菜单或头像，说明已登录
            isLoggedIn = true;
            break;
          }
        } catch (e) {
          console.log('检查过程中出现错误，继续下一个检查');
          continue;
        }
      }
      
      // 综合判断登录状态
      if (isLoggedIn && !isNotLoggedIn) {
        console.log('✅ 用户已登录');
        return true;
      } else if (isNotLoggedIn) {
        console.log('❌ 用户未登录');
        return false;
      } else {
        console.log('⚠️ 无法确定登录状态，尝试手动检查');
        
        // 手动检查：截图并分析
        await this.screenshot('login-check-screenshot.png');
        
        // 检查页面内容
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
      
      // 如果页面加载失败，尝试重新加载
      try {
        console.log('🔄 尝试重新加载页面...');
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 简单检查：看页面是否正常显示
        const title = await this.page.title();
        console.log('📄 页面标题:', title);
        
        if (title.includes('X') || title.includes('Twitter')) {
          console.log('✅ 页面正常加载，假设已登录');
          return true;
        }
      } catch (reloadError) {
        console.error('❌ 重新加载也失败:', reloadError.message);
      }
      
      return false;
    }
  }

  // 搜索用户并进入私信页面
  async searchUserAndOpenDM(username) {
    try {
      console.log(`🔍 搜索用户: @${username}`);
      
      // 先尝试直接访问用户页面
      try {
        const userUrl = `https://x.com/${username}`;
        console.log(`🔗 直接访问: ${userUrl}`);
        
        await this.page.goto(userUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查是否成功访问用户页面
        const userNameElement = await this.page.$('h1, h2, [data-testid="UserName"]');
        if (userNameElement) {
          console.log(`✅ 成功访问用户页面: @${username}`);
          return true;
        }
      } catch (directError) {
        console.log(`⚠️ 直接访问失败，尝试搜索: ${directError.message}`);
      }
      
      // 如果直接访问失败，尝试搜索
      console.log('🔍 尝试通过搜索访问用户...');
      
      // 点击搜索框
      const searchSelectors = [
        'input[data-testid="SearchBox_Input"]',
        'input[placeholder*="Search"]',
        'input[placeholder*="搜索"]',
        'a[href*="/search"]'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          searchInput = await this.page.$(selector);
          if (searchInput) {
            console.log(`✅ 找到搜索框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!searchInput) {
        throw new Error('未找到搜索框');
      }
      
      // 点击搜索框并输入用户名
      await searchInput.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 清空搜索框
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      
      // 输入用户名
      await this.page.type(searchInput, username, { delay: 50 });
      
      // 按 Enter 搜索
      await this.page.keyboard.press('Enter');
      
      // 等待搜索结果
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 查找并点击用户结果
      const userSelectors = [
        `a[href="/${username}"]`,
        `a[href*="/${username}"]`,
        `*:contains("${username}")`
      ];
      
      let userFound = false;
      for (const selector of userSelectors) {
        try {
          // 检查选择器是否安全
          if (typeof selector !== 'string' || selector.length > 200) {
            console.log('⚠️ 跳过不安全的选择器:', selector);
            continue;
          }
          
          const userLink = await this.page.$(selector);
          if (userLink) {
            await userLink.click();
            userFound = true;
            console.log(`✅ 通过搜索找到用户: @${username}`);
            break;
          }
        } catch (e) {
          console.log('⚠️ 选择器错误:', selector, e.message);
          continue;
        }
      }
      
      if (!userFound) {
        throw new Error('未找到用户搜索结果');
      }
      
      // 等待用户页面加载
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return true;
      
    } catch (error) {
      console.error(`❌ 搜索用户 ${username} 失败:`, error.message);
      return false;
    }
  }

  // 打开私信对话框 - 改进版本
  async openDMDialog() {
    try {
      console.log('💬 尝试打开私信对话框...');
      
      // 拍摄当前页面截图
      await this.screenshot('before-dm-click.png');
      
      // 多种方式查找消息按钮
      const messageSelectors = [
        // 消息相关按钮
        'a[href*="/messages"]',
        'div[data-testid="DM_Button"]',
        'button[data-testid="DM_Button"]',
        'a[aria-label*="Message"]',
        'button[aria-label*="Message"]',
        'a[aria-label*="私信"]',
        'button[aria-label*="私信"]',
        
        // 包含Message文本的按钮
        '*:contains("Message")',
        '*:contains("私信")',
        '*:contains("DM")',
        
        // 通用按钮类
        'button[aria-label*="Send"]',
        'div[role="button"][aria-label*="Message"]'
      ];
      
      let messageButton = null;
      for (const selector of messageSelectors) {
        try {
          if (selector.includes(':contains')) {
            // 处理contains选择器
            const elements = await this.page.$$('*');
            for (const element of elements) {
              const text = await this.page.evaluate(el => el.textContent, element);
              if (text && (text.includes('Message') || text.includes('私信') || text.includes('DM'))) {
                messageButton = element;
                console.log(`✅ 找到包含文本的消息按钮`);
                break;
              }
            }
          } else {
            messageButton = await this.page.$(selector);
            if (messageButton) {
              console.log(`✅ 找到消息按钮: ${selector}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!messageButton) {
        // 如果没找到按钮，尝试手动查找可能的按钮区域
        console.log('⚠️ 未找到标准消息按钮，尝试查找按钮区域...');
        
        const buttons = await this.page.$$('button, a[role="button"], div[role="button"]');
        console.log(`🔍 找到 ${buttons.length} 个按钮`);
        
        // 检查每个按钮是否可能用于发私信
        for (const button of buttons) {
          try {
            const ariaLabel = await this.page.evaluate(el => el.getAttribute('aria-label'), button);
            const text = await this.page.evaluate(el => el.textContent, button);
            
            if (ariaLabel && (ariaLabel.includes('Message') || ariaLabel.includes('私信'))) {
              messageButton = button;
              console.log(`✅ 通过aria-label找到消息按钮: ${ariaLabel}`);
              break;
            }
            
            if (text && (text.includes('Message') || text.includes('私信') || text.includes('DM'))) {
              messageButton = button;
              console.log(`✅ 通过文本找到消息按钮: ${text}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!messageButton) {
        // 尝试查找输入框，这可能表示已经打开了私信对话框
        const inputSelectors = [
          'div[contenteditable="true"][data-testid*="Message"]',
          'textarea[placeholder*="Message"]',
          'div[contenteditable="true"]'
        ];
        
        for (const selector of inputSelectors) {
          try {
            const input = await this.page.$(selector);
            if (input) {
              console.log('✅ 发现输入框，可能已打开私信对话框');
              return true;
            }
          } catch (e) {
            continue;
          }
        }
        
        throw new Error('未找到消息按钮或输入框');
      }
      
      // 点击消息按钮
      await messageButton.click();
      console.log('💬 点击消息按钮');
      
      // 等待私信对话框打开
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 检查是否成功打开私信对话框
      const dmDialogSelectors = [
        'div[role="dialog"]',
        '[data-testid="DMComposer"]',
        'div[data-testid="MessageInput"]',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"]'
      ];
      
      let dmDialogFound = false;
      for (const selector of dmDialogSelectors) {
        try {
          const dialog = await this.page.$(selector);
          if (dialog) {
            dmDialogFound = true;
            console.log('✅ 私信对话框已打开');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 拍摄打开后的截图
      await this.screenshot('after-dm-click.png');
      
      if (!dmDialogFound) {
        console.log('⚠️ 未检测到私信对话框，但继续尝试发送');
        // 不抛出错误，继续尝试，因为可能页面结构不同
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ 打开私信对话框失败:', error.message);
      return false;
    }
  }

  // 选择用户进行聊天
  async selectUser() {
    try {
      console.log('👤 开始选择用户...');
      
      // 检查当前页面URL
      const currentUrl = this.page.url();
      
      // 如果当前不在聊天页面，先导航到聊天页面
      if (!currentUrl.includes('/chat')) {
        console.log('🔄 导航到聊天页面...');
        await this.page.goto('https://x.com/i/chat', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // 查找用户搜索输入框
      const searchInputs = await this.page.$$('input[type="text"], textarea');
      let userSearchInput = null;
      
      // 尝试找到用户搜索输入框
      for (const input of searchInputs) {
        try {
          const placeholder = await input.evaluate(el => el.placeholder || '');
          const className = await input.evaluate(el => el.className || '');
          
          // 检查是否是用户搜索输入框
          if (placeholder.toLowerCase().includes('search') || 
              className.toLowerCase().includes('search') ||
              placeholder === '' || 
              className.includes('w-full')) {
            userSearchInput = input;
            console.log('✅ 找到用户搜索输入框');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!userSearchInput) {
        // 如果没找到搜索输入框，尝试点击"新建对话"或相关按钮
        console.log('🔍 尝试查找新建对话按钮...');
        const newChatButtons = await this.page.$$('button, a, div[role="button"]');
        
        for (const button of newChatButtons) {
          try {
            const text = await button.evaluate(el => el.textContent || '');
            if (text.toLowerCase().includes('new') || 
                text.toLowerCase().includes('compose') ||
                text.toLowerCase().includes('chat')) {
              console.log(`✅ 找到新建对话按钮: "${text}"`);
              await button.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // 重新查找输入框
              const newInputs = await this.page.$$('input[type="text"], textarea');
              if (newInputs.length > searchInputs.length) {
                userSearchInput = newInputs[0];
                console.log('✅ 点击新建对话后找到输入框');
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!userSearchInput) {
        throw new Error('未找到用户搜索输入框或新建对话按钮');
      }
      
      // 拍摄选择用户前的截图
      await this.screenshot('before-user-select.png');
      
      console.log('✅ 用户选择流程完成');
      return true;
      
    } catch (error) {
      console.error('❌ 选择用户失败:', error.message);
      return false;
    }
  }

  // 处理passcode验证
  async handlePasscode() {
    try {
      console.log('🔐 检查是否需要输入passcode...');
      
      // 查找passcode输入框
      const passcodeSelectors = [
        'input[placeholder*="Passcode"]',
        'input[placeholder*="passcode"]',
        'input[placeholder*="Code"]',
        'input[data-testid*="Passcode"]',
        'input[data-testid*="Code"]'
      ];
      
      let passcodeInput = null;
      for (const selector of passcodeSelectors) {
        try {
          passcodeInput = await this.page.$(selector);
          if (passcodeInput) {
            console.log(`✅ 找到passcode输入框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (passcodeInput) {
        console.log('🔐 检测到passcode输入需求，输入0000...');
        
        await passcodeInput.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 输入passcode 0000
        await this.page.type(passcodeInput, '0000', { delay: 100 });
        
        // 查找确认按钮
        const confirmSelectors = [
          'button[data-testid*="Continue"]',
          'button[data-testid*="Submit"]',
          'button[data-testid*="Verify"]',
          'button[type="submit"]',
          'button:contains("Continue")',
          'button:contains("Verify")',
          'button:contains("确认")',
          'button:contains("提交")'
        ];
        
        let confirmButton = null;
        for (const selector of confirmSelectors) {
          try {
            if (selector.includes(':contains')) {
              const elements = await this.page.$$('button');
              for (const element of elements) {
                const text = await this.page.evaluate(el => el.textContent, element);
                if (text && (text.includes('Continue') || text.includes('Verify') || text.includes('确认') || text.includes('提交'))) {
                  confirmButton = element;
                  break;
                }
              }
            } else {
              confirmButton = await this.page.$(selector);
            }
            
            if (confirmButton) {
              console.log(`✅ 找到确认按钮: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (confirmButton) {
          await confirmButton.click();
          console.log('✅ 点击确认按钮');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // 尝试按Enter键确认
          await this.page.keyboard.press('Enter');
          console.log('✅ 按Enter键确认');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return true;
      }
      
      console.log('ℹ️ 未检测到passcode输入需求');
      return false;
      
    } catch (error) {
      console.error('❌ 处理passcode失败:', error.message);
      return false;
    }
  }

  // 处理PIN验证
  async handlePinVerification() {
    try {
      console.log('🔐 处理PIN验证 - 自动输入0000...');
      
      // 拍摄PIN验证页面截图
      await this.screenshot('pin-verification-page.png');
      
      // 等待页面元素加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 查找PIN输入框 - 更全面的选择器
      const pinSelectors = [
        'input[data-testid*="pin"]',
        'input[data-testid="pin-input"]',
        'input[placeholder*="PIN"]',
        'input[placeholder*="pin"]',
        'input[placeholder*="Code"]',
        'input[placeholder*="code"]',
        'input[placeholder*="verification"]',
        'input[type="text"]',
        'input[maxlength="6"]',
        'input[maxlength="4"]',
        'input[name*="pin"]',
        'input[id*="pin"]'
      ];
      
      let pinInput = null;
      for (const selector of pinSelectors) {
        try {
          pinInput = await this.page.$(selector);
          if (pinInput) {
            console.log(`✅ 找到PIN输入框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!pinInput) {
        console.log('❌ 未找到PIN输入框，尝试查找所有输入框');
        const allInputs = await this.page.$$('input');
        console.log(`找到 ${allInputs.length} 个输入框`);
        
        // 尝试使用第一个文本输入框
        for (const input of allInputs) {
          try {
            const type = await input.evaluate(el => el.type);
            const placeholder = await input.evaluate(el => el.placeholder);
            if (type === 'text' || type === 'tel') {
              pinInput = input;
              console.log(`✅ 使用备用输入框: ${type}, placeholder: ${placeholder}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!pinInput) {
        console.log('❌ 仍然未找到PIN输入框');
        return false;
      }
      
      // 清空输入框并点击
      try {
        await pinInput.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 清空内容
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
        await this.page.keyboard.press('Backspace');
      } catch (e) {
        console.log('清空输入框时出现错误，继续输入');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 输入PIN码 0000 - 使用更兼容的方法
      console.log('🔐 自动输入PIN码 0000...');
      try {
        await pinInput.focus();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 直接使用page.type，但确保选择器字符串有效
        await this.page.type('input[type="text"]', '0000', { delay: 150 });
        console.log('✅ PIN码输入完成');
      } catch (typeError) {
        console.log('使用page.type失败，尝试替代方法...');
        
        // 替代方法：直接点击并输入
        await pinInput.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 输入每个字符
        for (const digit of '0000') {
          await this.page.keyboard.press(digit);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('✅ 使用替代方法输入PIN码');
      }
      
      // 等待输入完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 查找确认按钮 - 扩展的选择器列表（基于测试成功经验）
      const confirmSelectors = [
        // 最成功的方法（基于测试经验）
        'button:last-child',
        
        // X/Twitter特定的按钮
        'button[data-testid="pin-submit"]',
        'button[data-testid="Continue"]',
        'button[data-testid="Next"]',
        'button[data-testid="Submit"]',
        'button[data-testid="Verify"]',
        'button[data-testid="pin-continue"]',
        
        // 通用选择器
        'button[type="submit"]',
        'button[aria-label*="Continue"]',
        'button[aria-label*="Next"]',
        'button[aria-label*="Verify"]',
        'button[aria-label*="确认"]',
        'button[aria-label*="继续"]',
        
        // 文本匹配
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Verify")',
        'button:has-text("确认")',
        'button:has-text("继续")',
        'button:has-text("Submit")',
        
        // div按钮
        'div[role="button"]:has-text("Continue")',
        'div[role="button"]:has-text("Next")',
        'div[role="button"]:has-text("Verify")',
        
        // 最后的选项
        'button:not([disabled])'
      ];
      
      let confirmButton = null;
      console.log('🔍 查找确认按钮...');
      
      for (const selector of confirmSelectors) {
        try {
          confirmButton = await this.page.$(selector);
          if (confirmButton) {
            // 检查按钮是否可用
            const isDisabled = await confirmButton.evaluate(el => el.disabled);
            if (!isDisabled) {
              console.log(`✅ 找到可用的确认按钮: ${selector}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 点击确认按钮
      if (confirmButton) {
        console.log('✅ 点击确认按钮');
        await confirmButton.click();
      } else {
        console.log('⚠️ 未找到确认按钮，尝试按Enter键');
        await this.page.keyboard.press('Enter');
      }
      
      // 延长等待时间，让页面充分处理
      console.log('⏳ 等待PIN验证处理...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 拍摄验证后截图
      await this.screenshot('enhanced-after-pin-submit.png');
      
      // 检查当前URL
      const currentUrl = this.page.url();
      console.log(`当前URL: ${currentUrl}`);
      
      // 检查是否仍在PIN页面
      if (currentUrl.includes('/pin') || currentUrl.includes('/verify')) {
        console.log('⚠️ 仍在PIN验证页面，尝试备用退出方法...');
        
        // 备用方法1: 导航到主页
        console.log('🔄 备用方法1: 导航到主页...');
        await this.page.goto('https://x.com/home', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const newUrl = this.page.url();
        if (!newUrl.includes('/pin')) {
          console.log('✅ 备用方法1成功 - 已离开PIN页面');
          await this.screenshot('enhanced-exit-success.png');
          return true;
        }
        
        // 备用方法2: 导航到聊天页面
        console.log('🔄 备用方法2: 导航到聊天页面...');
        await this.page.goto('https://x.com/i/chat', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalUrl = this.page.url();
        if (!finalUrl.includes('/pin')) {
          console.log('✅ 备用方法2成功 - 已离开PIN页面');
          await this.screenshot('enhanced-exit-success-chat.png');
          return true;
        }
        
        console.log('❌ 所有退出方法都失败');
        return false;
      } else {
        console.log('✅ 成功离开PIN验证页面');
        return true;
      }
      
    } catch (error) {
      console.error('❌ 处理PIN验证失败:', error.message);
      await this.screenshot('pin-verification-error.png');
      return false;
    }
  }

  // 发送私信 - 改进版本
  async sendDM(message, username = null) {
    try {
      console.log('📝 发送私信...');
      
      // 检查当前页面是否是PIN验证页面
            const currentUrl = this.page.url();
            if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
              console.log('🔐 检测到需要PIN验证，先处理PIN验证...');
              await this.handlePinVerification();
              
              // PIN验证后，重新导航到聊天页面
              console.log('🔄 重新导航到聊天页面...');
              await this.page.goto('https://x.com/i/chat', { 
                waitUntil: 'domcontentloaded',
                timeout: 15000 
              });
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              // 如果不在聊天页面，先导航过去
              console.log('🔄 导航到聊天页面...');
              await this.page.goto('https://x.com/i/chat', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
              });
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // 检查是否需要PIN验证
              const newUrl = this.page.url();
              if (newUrl.includes('/pin/recovery') || newUrl.includes('/verify')) {
                console.log('🔐 访问聊天页面后需要PIN验证，处理PIN验证...');
                await this.handlePinVerification();
                
                // 再次导航到聊天页面
                console.log('🔄 PIN验证后重新导航到聊天页面...');
                await this.page.goto('https://x.com/i/chat', { 
                  waitUntil: 'domcontentloaded',
                  timeout: 15000 
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
      
      // 检查是否需要输入passcode
      await this.handlePasscode();
      
      // 如果没有指定用户名，需要先选择用户
      if (!username) {
        console.log('👤 未指定用户名，需要选择用户...');
        await this.selectUser();
      }
      
      // 确保在聊天页面
      if (!currentUrl.includes('/chat')) {
        console.log('🔄 导航到聊天页面...');
        await this.page.goto('https://x.com/i/chat', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // 在聊天页面中创建新对话
      console.log('💬 在聊天页面中创建新对话...');
      const newConversationResult = await this.createNewConversation(username);
      
      if (!newConversationResult) {
        throw new Error('创建新对话失败');
      }
      
      // 查找输入框 - 基于聊天页面的实际结构
      console.log('🔍 查找私信输入框...');
      const inputElement = await this.findChatInput();
      
      if (!inputElement) {
        throw new Error('未找到私信输入框');
      }
      
      // 点击输入框
      await inputElement.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 清空输入框
      try {
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
      } catch (e) {
        console.log('清空输入框时出现错误，继续输入');
      }
      
      // 输入消息
      await this.page.type(inputElement, message, { delay: 50 });
      console.log(`📤 输入消息: "${message}"`);
      
      // 等待消息输入完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 查找发送按钮
      const sendButton = await this.findSendButton();
      
      if (!sendButton) {
        // 最后的尝试：按Enter键
        console.log('⚠️ 未找到发送按钮，尝试按Enter键');
        await this.page.keyboard.press('Enter');
      } else {
        // 点击发送按钮
        await sendButton.click();
        console.log('✅ 点击发送按钮');
      }
      
      // 等待发送完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 拍摄发送完成截图
      await this.screenshot('dm-send-complete.png');
      
      console.log('✅ 私信发送完成');
      return true;
      
    } catch (error) {
      console.error('❌ 发送私信失败:', error.message);
      await this.screenshot('dm-send-error.png');
      return false;
    }
  }

  // 重新尝试发送私信
  async retrySendDM(message) {
    try {
      console.log('🔄 重新尝试发送私信...');
      
      // 等待页面稳定
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 重新查找输入框
      const contentEditables = await this.page.$$('div[contenteditable="true"]');
      if (contentEditables.length === 0) {
        throw new Error('passcode验证后仍未找到输入框');
      }
      
      const inputElement = contentEditables[0];
      console.log('✅ 找到输入框，尝试重新发送');
      
      // 点击输入框
      await inputElement.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 清空并输入消息
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      await this.page.type(inputElement, message, { delay: 50 });
      
      // 发送
      await this.page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 拍摄重试后的截图
      await this.screenshot('after-dm-retry.png');
      
      console.log('✅ 私信重试发送完成');
      return true;
      
    } catch (error) {
      console.error('❌ 重试发送失败:', error.message);
      return false;
    }
  }

  // 批量发送私信
  async sendBatchDMs() {
    const results = {
      success: [],
      failed: []
    };
    
    try {
      console.log('🚀 开始批量发送私信...');
      
      for (const username of this.targetUsers) {
        try {
          console.log(`\n--- 处理用户: @${username} ---`);
          
          if (this.sentUsers.has(username)) {
            console.log(`⏭️ 跳过已处理的用户: @${username}`);
            continue;
          }
          
          // 搜索并打开用户页面
          const userFound = await this.searchUserAndOpenDM(username);
          if (!userFound) {
            results.failed.push({ username, reason: '无法找到用户' });
            continue;
          }
          
          // 打开私信对话框
          const dmOpened = await this.openDMDialog();
          if (!dmOpened) {
            results.failed.push({ username, reason: '无法打开私信对话框' });
            continue;
          }
          
          // 发送私信
          const dmSent = await this.sendDM(this.message);
          if (dmSent) {
            results.success.push(username);
            this.sentUsers.add(username);
            console.log(`✅ 成功发送私信给 @${username}`);
          } else {
            results.failed.push({ username, reason: '发送失败' });
          }
          
          // 人性化延迟
          await this.humanDelay(3000, 5000);
          
        } catch (error) {
          console.error(`❌ 处理用户 @${username} 时出错:`, error.message);
          results.failed.push({ username, reason: error.message });
          
          // 拍摄错误截图
          await this.screenshot(`error-${username}.png`);
        }
      }
      
    } catch (error) {
      console.error('❌ 批量发送私信失败:', error.message);
    }
    
    return results;
  }

  // 获取发送结果
  getResults() {
    return {
      total: this.targetUsers.length,
      success: this.sentUsers.size,
      failed: this.targetUsers.length - this.sentUsers.size,
      sentUsers: Array.from(this.sentUsers),
      failedUsers: this.targetUsers.filter(user => !this.sentUsers.has(user))
    };
  }

  // 清理并关闭
  async cleanup() {
    try {
      console.log('🧹 清理资源...');
      await this.close();
      console.log('✅ 清理完成');
    } catch (error) {
      console.error('❌ 清理失败:', error.message);
    }
  }

  // 在聊天页面中创建新对话
  async createNewConversation(username) {
    try {
      console.log(`📝 创建与 @${username} 的新对话...`);
      
      // 拍摄创建对话前的截图
      await this.screenshot('before-new-conversation.png');
      
      // 查找"新建对话"或"开始新对话"按钮
      const newChatSelectors = [
        'button[data-testid="dm-empty-conversation-new-chat-button"]',
        'button[data-testid="dm-new-chat-button"]',
        'button[data-testid="NewMessageButton"]',
        'button[data-testid="DM_NewMessage"]',
        'button[data-testid="NewChat"]',
        'button[aria-label*="New Message"]',
        'button[aria-label*="New Chat"]',
        'button[aria-label*="New conversation"]',
        'button:has-text("New Message")',
        'button:has-text("New Chat")',
        'button:has-text("New conversation")',
        'button:has-text("开始新对话")',
        'div[role="button"][aria-label*="New Message"]',
        'div[role="button"][aria-label*="New Chat"]'
      ];
      
      let newChatButton = null;
      for (const selector of newChatSelectors) {
        try {
          newChatButton = await this.page.$(selector);
          if (newChatButton) {
            console.log(`✅ 找到新建对话按钮: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (newChatButton) {
        await newChatButton.click();
        console.log('✅ 点击新建对话按钮');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('⚠️ 未找到新建对话按钮，尝试其他方法...');
        // 可能对话框已经打开，或者页面布局不同
      }
      
      // 拍摄点击后的截图
      await this.screenshot('after-new-conversation-click.png');
      
      // 等待用户选择界面或直接输入用户名的界面
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 如果有用户名，尝试直接输入
      if (username) {
        console.log(`👤 尝试搜索用户 @${username}...`);
        await this.searchAndSelectUserInChat(username);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ 创建新对话失败:', error.message);
      return false;
    }
  }

  // 在聊天页面中搜索并选择用户
  async searchAndSelectUserInChat(username) {
    try {
      console.log(`🔍 在聊天页面搜索用户: @${username}`);
      
      // 查找用户名输入框
      const userInputSelectors = [
        'input[data-testid="new-dm-search-input"]',
        'input[placeholder*="Search name or username"]',
        'input[placeholder*="Search people"]',
        'input[placeholder*="搜索用户"]',
        'input[placeholder*="Type a name"]',
        'input[placeholder*="搜索"]',
        'div[contenteditable="true"][placeholder*="Search"]',
        'div[contenteditable="true"][placeholder*="搜索"]',
        'textarea[placeholder*="Search"]',
        'textarea[placeholder*="搜索"]'
      ];
      
      let userInput = null;
      for (const selector of userInputSelectors) {
        try {
          userInput = await this.page.$(selector);
          if (userInput) {
            console.log(`✅ 找到用户搜索输入框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (userInput) {
        // 点击输入框
        await userInput.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 使用更安全的输入方法
        try {
          // 点击输入框确保获得焦点
          await userInput.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 清空输入框
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('A');
          await this.page.keyboard.up('Control');
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 输入用户名
          await this.page.keyboard.type(username, { delay: 100 });
          console.log(`📝 安全输入用户名: ${username}`);
        } catch (inputError) {
          console.log('⚠️ 安全输入方法失败，尝试备用方法:', inputError.message);
          
          // 备用输入方法
          try {
            await userInput.focus();
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.page.keyboard.type(username);
            console.log(`📝 使用备用方法输入用户名: ${username}`);
          } catch (backupError) {
            console.log('❌ 备用输入方法也失败:', backupError.message);
            return false;
          }
        }
        
        // 等待搜索结果
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 拍摄输入后截图
        await this.screenshot('after-username-input.png');
        
        // 查找搜索结果 - 使用更可靠的选择器
        const searchResultsSelectors = [
          'div[data-testid*="user"][data-testid*="suggestion"]',
          'div[data-testid*="UserCell"]',
          'div[role="button"]'
        ];
        
        let searchResult = null;
        for (const selector of searchResultsSelectors) {
          try {
            searchResult = await this.page.$(selector);
            if (searchResult) {
              console.log(`✅ 找到搜索结果: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // 如果通过选择器没找到，尝试通过文本查找
        if (!searchResult) {
          try {
            const textResult = await this.page.evaluate((user) => {
              try {
                const elements = document.querySelectorAll('div');
                for (let el of elements) {
                  if (el.textContent && typeof el.textContent === 'string' && el.textContent.includes(user)) {
                    // 检查是否是用户结果
                    if (el.querySelector('a[href*="/"]') || el.getAttribute('data-testid')) {
                      return el;
                    }
                  }
                }
                return null;
              } catch (error) {
                return null;
              }
            }, username);
            
            if (textResult) {
              searchResult = textResult;
              console.log('✅ 通过文本查找找到搜索结果');
            }
          } catch (e) {
            console.log('⚠️ 文本查找失败:', e.message);
          }
        }
        
        if (searchResult) {
          await searchResult.click();
          console.log('✅ 点击搜索结果');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 拍摄选择用户后截图
          await this.screenshot('after-user-selection.png');
          
          // 查找并点击message按钮
          console.log('🔍 查找并点击message按钮...');
          const messageButton = await this.findAndClickMessageButton();
          
          if (messageButton) {
            console.log('✅ 成功点击message按钮');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 拍摄点击message按钮后截图
            await this.screenshot('after-message-button-click.png');
            return true;
          } else {
            console.log('⚠️ 未找到message按钮，尝试直接进入对话框');
            // 如果没找到message按钮，尝试直接导航到对话页面
            return await this.tryDirectDMNavigation(username);
          }
        }
      }
      
      console.log('⚠️ 未找到用户搜索功能或搜索结果');
      return false;
      
    } catch (error) {
      console.error('❌ 搜索并选择用户失败:', error.message);
      return false;
    }
  }

  // 查找聊天输入框
  async findChatInput() {
    try {
      console.log('🔍 查找聊天输入框...');
      
      // 拍摄当前页面截图以分析结构
      await this.screenshot('finding-chat-input.png');
      
      // 多种选择器尝试 - 增强版
      const inputSelectors = [
        // X/Twitter 最新的选择器
        'div[contenteditable="true"][data-testid*="composer"]',
        'div[contenteditable="true"][data-testid*="dm"]',
        'div[contenteditable="true"][data-testid*="input"]',
        'div[contenteditable="true"][data-testid*="Message"]',
        
        // 通用contenteditable选择器
        'div[contenteditable="true"][aria-label*="Message"]',
        'div[contenteditable="true"][aria-label*="消息"]',
        'div[contenteditable="true"][aria-label*="DM"]',
        'div[contenteditable="true"][placeholder*="Message"]',
        'div[contenteditable="true"][placeholder*="消息"]',
        'div[contenteditable="true"][placeholder*="DM"]',
        
        // 传统的input/textarea
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="消息"]',
        'textarea[placeholder*="DM"]',
        'input[placeholder*="Message"]',
        'input[placeholder*="消息"]',
        'input[placeholder*="DM"]'
      ];
      
      for (const selector of inputSelectors) {
        try {
          const inputElement = await this.page.$(selector);
          if (inputElement) {
            console.log(`✅ 找到聊天输入框: ${selector}`);
            
            // 验证输入框是否可见和可用
            const isVisible = await inputElement.evaluate(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && 
                     style.visibility !== 'hidden' && 
                     style.opacity !== '0' &&
                     el.offsetWidth > 0 && 
                     el.offsetHeight > 0;
            });
            
            if (isVisible) {
              console.log(`✅ 聊天输入框可见且可用: ${selector}`);
              return inputElement;
            } else {
              console.log(`⚠️ 输入框存在但不可见: ${selector}`);
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('⚠️ 使用备用方法查找输入框...');
      
      // 备用方法：查找所有contenteditable元素
      const contentEditables = await this.page.$$('div[contenteditable="true"]');
      console.log(`找到 ${contentEditables.length} 个contenteditable元素`);
      
      for (let i = 0; i < contentEditables.length; i++) {
        try {
          const placeholder = await contentEditables[i].evaluate(el => el.placeholder || '');
          const ariaLabel = await contentEditables[i].evaluate(el => el.getAttribute('aria-label') || '');
          const className = await contentEditables[i].evaluate(el => el.className || '');
          const id = await contentEditables[i].evaluate(el => el.id || '');
          
          // 更宽松的匹配条件
          if (placeholder.includes('Message') || 
              placeholder.includes('消息') || 
              placeholder.includes('DM') ||
              ariaLabel.includes('Message') ||
              ariaLabel.includes('消息') ||
              ariaLabel.includes('DM') ||
              className.includes('composer') ||
              className.includes('input') ||
              className.includes('message') ||
              id.includes('message') ||
              id.includes('input') ||
              id.includes('composer')) {
            console.log(`✅ 找到候选输入框 ${i + 1}: placeholder="${placeholder}", aria-label="${ariaLabel}", class="${className}"`);
            return contentEditables[i];
          }
        } catch (e) {
          continue;
        }
      }
      
      // 最后的备用方法：查找任何可能的输入元素
      const allInputs = await this.page.$$('input, textarea, [contenteditable="true"]');
      console.log(`🔍 总共找到 ${allInputs.length} 个可能的输入元素`);
      
      // 显示前10个元素的详细信息
      for (let i = 0; i < Math.min(allInputs.length, 10); i++) {
        try {
          const element = allInputs[i];
          const tagName = await element.evaluate(el => el.tagName);
          const placeholder = await element.evaluate(el => el.placeholder || '');
          const ariaLabel = await element.evaluate(el => el.getAttribute('aria-label') || '');
          const className = await element.evaluate(el => el.className || '');
          const dataTestId = await element.evaluate(el => el.getAttribute('data-testid') || '');
          
          console.log(`输入元素 ${i + 1}: ${tagName}, placeholder="${placeholder}", aria-label="${ariaLabel}", class="${className}", data-testid="${dataTestId}"`);
          
          // 如果看起来像聊天输入框，返回它
          if ((placeholder.includes('Message') || placeholder.includes('消息') || 
               ariaLabel.includes('Message') || ariaLabel.includes('消息') ||
               className.includes('composer') || className.includes('message') ||
               dataTestId.includes('composer') || dataTestId.includes('message')) && 
              tagName.toLowerCase() !== 'button') {
            console.log(`✅ 选择候选输入框 ${i + 1} 作为聊天输入框`);
            return element;
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('❌ 未找到聊天输入框');
      return null;
      
    } catch (error) {
      console.error('❌ 查找聊天输入框失败:', error.message);
      return null;
    }
  }

  // 查找发送按钮
  async findSendButton() {
    try {
      console.log('🔍 查找发送按钮...');
      
      // 多种选择器尝试
      const sendButtonSelectors = [
        'button[data-testid="dmComposerSendButton"]',
        'button[data-testid="send"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        'button[type="submit"]',
        'button:has-text("Send")',
        'button:has-text("发送")',
        'button:has-text("→")',
        'div[role="button"][aria-label*="Send"]',
        'div[role="button"][aria-label*="发送"]'
      ];
      
      for (const selector of sendButtonSelectors) {
        try {
          const sendButton = await this.page.$(selector);
          if (sendButton) {
            console.log(`✅ 找到发送按钮: ${selector}`);
            return sendButton;
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('⚠️ 未找到发送按钮，将尝试使用Enter键');
      return null;
      
    } catch (error) {
      console.error('❌ 查找发送按钮失败:', error.message);
      return null;
    }
  }

  // 查找并点击message按钮
  async findAndClickMessageButton() {
    try {
      console.log('🔍 查找message按钮...');
      
      // 拍摄查找前的截图
      await this.screenshot('before-finding-message-button.png');
      
      // 拍摄查找前所有按钮的详细信息
      console.log('🔍 分析页面上的所有按钮...');
      const allButtons = await this.page.$$('button, div[role="button"]');
      console.log(`找到 ${allButtons.length} 个按钮元素`);
      
      // 显示前10个按钮的详细信息
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        try {
          const text = await this.page.evaluate(el => el.textContent || '', allButtons[i]);
          const ariaLabel = await this.page.evaluate(el => el.getAttribute('aria-label') || '', allButtons[i]);
          const dataTestId = await this.page.evaluate(el => el.getAttribute('data-testid') || '', allButtons[i]);
          const className = await this.page.evaluate(el => el.className || '', allButtons[i]);
          
          if (text || ariaLabel) {
            console.log(`按钮 ${i + 1}: text="${text}", aria-label="${ariaLabel}", data-testid="${dataTestId}"`);
          }
        } catch (e) {
          console.log(`按钮 ${i + 1}: 获取信息失败`);
        }
      }
      
      // 多种message按钮选择器 - 按优先级排序（修复CSS选择器语法）
            const messageButtonSelectors = [
              'button[data-testid*="Message"]',
              'button[data-testid*="message"]',
              'button[data-testid="messageButton"]',
              'button[aria-label*="Message"]',
              'button[aria-label*="私信"]',
              'button[aria-label*="DM"]',
              'div[role="button"][data-testid*="Message"]',
              'div[role="button"][data-testid*="message"]',
              'div[role="button"][aria-label*="Message"]',
              'div[role="button"][aria-label*="私信"]'
            ];
      
      for (const selector of messageButtonSelectors) {
        try {
          const messageButton = await this.page.$(selector);
          if (messageButton) {
            console.log(`✅ 找到message按钮: ${selector}`);
            
            // 拍摄找到按钮前的截图
            await this.screenshot('found-message-button.png');
            
            await messageButton.click();
            console.log('✅ 成功点击message按钮');
            
            // 拍摄点击后截图
            await this.screenshot('after-message-button-click.png');
            return true;
          }
        } catch (e) {
          console.log('⚠️ 选择器错误:', selector, e.message);
          continue;
        }
      }
      
      // 如果标准选择器都失败，尝试通过文本内容查找
      console.log('⚠️ 标准选择器未找到，尝试通过文本内容查找...');
      try {
        const textBasedButtons = await this.page.evaluate(() => {
          const buttons = document.querySelectorAll('button, div[role="button"]');
          const messageButtons = [];
          
          for (let button of buttons) {
            const text = button.textContent?.toLowerCase() || '';
            const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
            
            if (text.includes('message') || text.includes('私信') || 
                ariaLabel.includes('message') || ariaLabel.includes('私信') ||
                text.includes('💬')) {
              messageButtons.push(button);
            }
          }
          
          return messageButtons;
        });
        
        if (textBasedButtons.length > 0) {
          console.log(`✅ 通过文本内容找到 ${textBasedButtons.length} 个可能的message按钮`);
          
          // 点击第一个找到的按钮
          await textBasedButtons[0].click();
          console.log('✅ 成功点击文本内容匹配的message按钮');
          
          await this.screenshot('after-text-message-button-click.png');
          return true;
        }
      } catch (textError) {
        console.log('⚠️ 文本内容查找失败:', textError.message);
      }
      
      console.log('⚠️ 未找到message按钮');
      return false;
      
    } catch (error) {
      console.error('❌ 查找message按钮失败:', error.message);
      return false;
    }
  }

  // 尝试直接导航到对话页面
  async tryDirectDMNavigation(username) {
    try {
      console.log(`🔗 尝试直接导航到与 @${username} 的对话页面...`);
      
      // 尝试直接访问DM URL
      const dmUrl = `https://x.com/messages/compose?recipient_id=${username}`;
      await this.page.goto(dmUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.screenshot('direct-dm-navigation.png');
      
      // 检查是否成功进入对话界面
      const currentUrl = this.page.url();
      if (currentUrl.includes('/messages/') || currentUrl.includes('/chat')) {
        console.log('✅ 成功导航到对话页面');
        return true;
      } else {
        console.log('⚠️ 直接导航失败，URL:', currentUrl);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 直接导航失败:', error.message);
      return false;
    }
  }
}

module.exports = DMService;