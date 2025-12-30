const PlaywrightDMService = require('./src/services/playwrightDMService.js');

async function completeDMSendTest() {
  const service = new PlaywrightDMService();
  
  try {
    console.log('🚀 启动完整私信发送测试...');
    
    await service.initialize();
    
    // 加载cookies
    console.log('🍪 加载已保存的cookies...');
    const cookiesLoaded = await service.loadCookies();
    if (cookiesLoaded) {
      console.log('✅ cookies加载成功');
    }
    
    // 导航到私信页面
    console.log('💬 导航到私信页面...');
    await service.page.goto('https://x.com/messages', { 
      waitUntil: 'networkidle',
      timeout: 20000 
    });
    
    await service.humanDelay(3000, 5000);
    await service.screenshot('complete-dm-initial.png');
    
    console.log('🔍 分析私信页面...');
    const currentUrl = service.page.url();
    console.log(`🔗 当前URL: ${currentUrl}`);
    
    // 找到并点击新建聊天按钮
    console.log('🆕 寻找新建聊天按钮...');
    let newChatButton = null;
    
    const newChatSelectors = [
      'button:has-text("New chat")',
      'button:has-text("New Chat")',
      '[data-testid="NewChat"]',
      'button[aria-label*="New"]',
      'div[role="button"]:has-text("New")'
    ];
    
    for (const selector of newChatSelectors) {
      try {
        const button = await service.page.locator(selector).first();
        if (await button.isVisible()) {
          newChatButton = button;
          console.log(`✅ 找到新建聊天按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!newChatButton) {
      console.log('❌ 未找到新建聊天按钮');
      return;
    }
    
    // 点击新建聊天按钮
    console.log('👆 点击新建聊天按钮...');
    await newChatButton.click();
    await service.humanDelay(3000, 5000);
    await service.screenshot('complete-dm-new-chat-page.png');
    
    // 查找搜索输入框
    console.log('🔍 查找用户搜索输入框...');
    let searchInput = null;
    
    const searchInputSelectors = [
      'input[placeholder*="Search name or username"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="用户名"]',
      'div[contenteditable="true"]'
    ];
    
    for (const selector of searchInputSelectors) {
      try {
        const inputs = await service.page.locator(selector).all();
        for (const input of inputs) {
          if (await input.isVisible()) {
            searchInput = input;
            console.log(`✅ 找到搜索输入框: ${selector}`);
            break;
          }
        }
        if (searchInput) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!searchInput) {
      console.log('❌ 未找到搜索输入框');
      return;
    }
    
    // 输入用户名进行搜索
    const testUsername = 'elonmusk'; // 使用一个知名的测试用户
    console.log(`📝 输入用户名: @${testUsername}`);
    
    await searchInput.click();
    await service.humanDelay(1000, 2000);
    await searchInput.fill(`@${testUsername}`);
    await service.humanDelay(3000, 5000);
    
    await service.screenshot('complete-dm-search-username.png');
    
    // 等待搜索结果
    console.log('⏳ 等待搜索结果...');
    await service.humanDelay(3000, 6000);
    
    // 查找搜索结果
    console.log('🔍 查找搜索结果...');
    const searchResults = await service.page.evaluate((testUsername) => {
      const results = [];
      
      // 查找用户搜索结果
      const userSelectors = [
        'a[href*="/"]',
        'div[role="button"]',
        '[data-testid*="User"]',
        '[data-testid*="Typeahead"]',
        '[data-testid*="UserResult"]'
      ];
      
      userSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) {
            const text = el.textContent?.trim() || '';
            const href = el.href || '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            
            // 检查是否匹配用户名
            if (text.toLowerCase().includes(testUsername.toLowerCase()) || 
                href.toLowerCase().includes(testUsername.toLowerCase()) ||
                ariaLabel.toLowerCase().includes(testUsername.toLowerCase()) ||
                text.includes('@')) {
              results.push({
                selector: selector,
                text: text.substring(0, 100),
                href: href,
                ariaLabel: ariaLabel
              });
            }
          }
        });
      });
      
      return results;
    }, testUsername);
    
    console.log('📋 搜索结果:', searchResults);
    
    if (searchResults.length === 0) {
      console.log('❌ 未找到搜索结果');
      return;
    }
    
    // 点击第一个搜索结果
    console.log('👆 点击第一个搜索结果...');
    const firstResult = searchResults[0];
    
    try {
      await service.page.locator(firstResult.selector).first().click();
      await service.humanDelay(3000, 5000);
      
      await service.screenshot('complete-dm-user-selected.png');
      
      // 检查是否进入了聊天页面
      console.log('🔍 检查是否进入聊天页面...');
      const isInChat = await service.verifyInDirectMessage();
      
      if (isInChat) {
        console.log('✅ 成功进入聊天页面！');
        
        // 发送测试消息
        const testMessage = `Hello @${testUsername}! 这是一条自动化测试消息。`;
        console.log(`📝 发送测试消息: ${testMessage}`);
        
        const messageSent = await service.sendMessage(testMessage);
        if (messageSent) {
          console.log('✅ 消息发送成功！');
          await service.screenshot('complete-dm-message-sent.png');
        } else {
          console.log('❌ 消息发送失败');
        }
        
      } else {
        console.log('⚠️ 未进入聊天页面，尝试其他方法...');
        
        // 查找发送消息按钮
        const sendButtonFound = await service.findAndClickSendMessageButton();
        if (sendButtonFound) {
          await service.humanDelay(2000, 3000);
          const isInChat2 = await service.verifyInDirectMessage();
          if (isInChat2) {
            console.log('✅ 通过发送按钮进入聊天页面！');
            
            // 发送测试消息
            const testMessage = `Hello @${testUsername}! 这是一条自动化测试消息。`;
            console.log(`📝 发送测试消息: ${testMessage}`);
            
            const messageSent = await service.sendMessage(testMessage);
            if (messageSent) {
              console.log('✅ 消息发送成功！');
              await service.screenshot('complete-dm-message-sent.png');
            } else {
              console.log('❌ 消息发送失败');
            }
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ 点击搜索结果失败: ${error.message}`);
    }
    
    console.log('\n🎯 完整私信发送测试完成！');
    
  } catch (error) {
    console.error('❌ 完整私信发送测试失败:', error);
    await service.screenshot('complete-dm-error.png');
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

// 运行完整测试
if (require.main === module) {
  completeDMSendTest().catch(console.error);
}

module.exports = { completeDMSendTest };