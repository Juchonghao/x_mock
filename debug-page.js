const PlaywrightDMService = require('./src/services/playwrightDMService.js');
const service = new PlaywrightDMService();

(async () => {
  try {
    await service.initialize();
    console.log('✅ 浏览器初始化完成');
    
    // 按照现有私信逻辑逐步执行
    const targetUsername = 'kent236896';
    
    console.log('🔗 步骤1: 访问私信页面');
    await service.page.goto('https://x.com/messages', { 
      waitUntil: 'load',
      timeout: 30000 
    });
    await service.humanDelay(3000, 5000);
    
    console.log('📸 私信页面截图');
    await service.screenshot('debug-messages-page.png');
    
    // 检查私信页面元素
    console.log('🔍 检查私信页面元素...');
    const newChatElements = await service.page.locator('button[data-testid="NewChat_Button"], a[href*="/messages/compose"]').first();
    if (await newChatElements.isVisible()) {
      console.log('✅ 检测到私信页面主要元素');
    } else {
      console.log('⚠️ 未检测到预期元素');
    }
    
    console.log('🔍 步骤2: 搜索用户');
    const searchFound = await service.searchAndSelectUser(targetUsername);
    console.log(`搜索结果: ${searchFound ? '成功' : '失败'}`);
    
    if (searchFound) {
      console.log('📸 用户搜索后截图');
      await service.screenshot('debug-after-search.png');
      
      // 检查passcode
      console.log('🔐 步骤3: 检查passcode');
      await service.handlePasscode();
      
      // 检查消息输入框
      console.log('📝 步骤4: 检查消息输入框');
      const inputSelectors = [
        'div[aria-label="输入消息"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="消息"]',
        'div[data-testid="DMComposer"]',
        'div[data-testid="dmComposerTextInput"]',
        'div[data-testid="DMComposerInput"]',
        '[contenteditable="true"]'
      ];
      
      for (const selector of inputSelectors) {
        const input = await service.page.locator(selector).first();
        const visible = await input.isVisible();
        if (visible) {
          console.log(`✅ 找到消息输入框: ${selector}`);
          const placeholder = await input.getAttribute('placeholder') || '无placeholder';
          const role = await input.getAttribute('role') || '无role';
          const ariaLabel = await input.getAttribute('aria-label') || '无aria-label';
          console.log(`  placeholder: ${placeholder}, role: ${role}, aria-label: ${ariaLabel}`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await service.screenshot('debug-error.png');
  } finally {
    await service.close();
  }
})();