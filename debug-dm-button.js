const PlaywrightDMService = require('./src/services/playwrightDMService.js');
const service = new PlaywrightDMService();

(async () => {
  try {
    await service.initialize();
    console.log('✅ 浏览器初始化完成');
    
    // 访问用户页面
    const targetUsername = 'kent236896';
    console.log(`🔗 访问用户页面: @${targetUsername}`);
    
    await service.page.goto(`https://x.com/${targetUsername}`, { 
      waitUntil: 'load',
      timeout: 30000 
    });
    
    // 等待页面加载
    await service.humanDelay(3000, 5000);
    
    console.log('📸 用户页面截图');
    await service.screenshot('debug-user-page.png');
    
    // 检查页面标题和URL
    const title = await service.page.title();
    const url = service.page.url();
    console.log(`📄 页面标题: ${title}`);
    console.log(`🔗 当前URL: ${url}`);
    
    // 检查所有可能的私信相关按钮
    console.log('\n🔍 查找私信相关按钮...');
    
    const buttonSelectors = [
      'a[href*="/messages"]',
      'button[aria-label*="Message"]',
      'button[aria-label*="私信"]',
      'button[aria-label*="Direct"]',
      'div[data-testid="DM_Button"]',
      'div[data-testid="dmButton"]',
      'div[data-testid="SendMessage"]',
      'button[data-testid*="Message"]',
      'button[data-testid*="DM"]',
      'a[data-testid*="Message"]',
      '[role="button"][aria-label*="Message"]',
      '[role="button"][aria-label*="私信"]'
    ];
    
    let foundButtons = [];
    for (const selector of buttonSelectors) {
      try {
        const element = await service.page.locator(selector).first();
        const visible = await element.isVisible();
        if (visible) {
          const ariaLabel = await element.getAttribute('aria-label') || '无aria-label';
          const text = await element.textContent() || '无text';
          const href = await element.getAttribute('href') || '无href';
          const dataTestid = await element.getAttribute('data-testid') || '无data-testid';
          foundButtons.push({ selector, ariaLabel, text, href, dataTestid });
          console.log(`✅ 找到按钮: ${selector}`);
          console.log(`   aria-label: ${ariaLabel}`);
          console.log(`   text: ${text}`);
          console.log(`   href: ${href}`);
          console.log(`   data-testid: ${dataTestid}`);
          console.log('---');
        }
      } catch (e) {
        // 忽略错误，继续查找
      }
    }
    
    if (foundButtons.length === 0) {
      console.log('❌ 未找到任何私信相关按钮');
      
      // 尝试查找所有可见按钮
      console.log('\n🔍 查找所有可见按钮...');
      const allButtons = await service.page.locator('button, [role="button"], a[href]').count();
      console.log(`找到 ${allButtons} 个按钮/链接元素`);
      
      for (let i = 0; i < Math.min(allButtons, 20); i++) {
        try {
          const button = service.page.locator('button, [role="button"], a[href]').nth(i);
          const visible = await button.isVisible();
          if (visible) {
            const text = await button.textContent() || '无text';
            const ariaLabel = await button.getAttribute('aria-label') || '无aria-label';
            const href = await button.getAttribute('href') || '无href';
            console.log(`按钮 ${i}: text="${text}", aria-label="${ariaLabel}", href="${href}"`);
          }
        } catch (e) {
          continue;
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