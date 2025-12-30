const PlaywrightDMService = require('./src/services/playwrightDMService.js');
const service = new PlaywrightDMService();

(async () => {
  try {
    await service.initialize();
    console.log('✅ 浏览器初始化完成');
    
    // 检查登录状态
    console.log('🔍 检查登录状态...');
    const currentUrl = service.page.url();
    console.log(`🔗 当前URL: ${currentUrl}`);
    
    // 检查是否有登录按钮
    const loginButton = await service.page.locator('a[href="/login"], button:has-text("登录")').first();
    const isLoginVisible = await loginButton.isVisible();
    console.log(`登录按钮可见: ${isLoginVisible}`);
    
    if (isLoginVisible) {
      console.log('❌ 检测到登录按钮，用户未登录');
      
      // 尝试手动登录
      console.log('🔐 开始手动登录流程...');
      await service.page.goto('https://x.com/login', { waitUntil: 'load' });
      await service.humanDelay(2000, 3000);
      
      await service.screenshot('debug-login-page.png');
      
      // 查找用户名输入框
      const usernameInput = await service.page.locator('input[name="text"], input[placeholder*="username"], input[placeholder*="用户名"]').first();
      if (await usernameInput.isVisible()) {
        console.log('✅ 找到用户名输入框');
        // 这里需要手动输入用户名，暂停执行
        console.log('⏸️ 请手动输入用户名并继续...');
        await service.page.waitForTimeout(10000);
      }
      
    } else {
      console.log('✅ 用户已登录');
      
      // 访问用户页面
      const targetUsername = 'kent236896';
      console.log(`🔗 访问用户页面: @${targetUsername}`);
      
      await service.page.goto(`https://x.com/${targetUsername}`, { 
        waitUntil: 'load',
        timeout: 30000 
      });
      
      // 等待页面加载完成
      await service.humanDelay(5000, 8000);
      
      console.log('📸 用户页面截图');
      await service.screenshot('debug-user-page-logged-in.png');
      
      // 重新检查私信按钮
      console.log('🔍 重新查找私信按钮...');
      const dmButton = await service.page.locator('a[href*="/messages"], button[aria-label*="Message"], div[data-testid="DM_Button"]').first();
      const dmButtonVisible = await dmButton.isVisible();
      console.log(`私信按钮可见: ${dmButtonVisible}`);
      
      if (dmButtonVisible) {
        console.log('✅ 找到私信按钮，尝试点击');
        await dmButton.click();
        await service.humanDelay(3000, 5000);
        
        console.log('📸 点击私信按钮后截图');
        await service.screenshot('debug-after-dm-click.png');
      } else {
        console.log('❌ 未找到私信按钮');
        
        // 滚动页面看看是否有私信按钮
        console.log('🔄 滚动页面查找私信按钮...');
        await service.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await service.humanDelay(2000, 3000);
        
        await service.screenshot('debug-user-page-scrolled.png');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await service.screenshot('debug-error.png');
  } finally {
    await service.close();
  }
})();