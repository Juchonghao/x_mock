const PlaywrightDMService = require('./src/services/playwrightDMService.js');
const service = new PlaywrightDMService();

(async () => {
  try {
    console.log('🚀 初始化 Playwright 私信服务...');
    await service.initialize();
    console.log('✅ 浏览器初始化完成');
    
    console.log('🔗 访问私信页面...');
    await service.page.goto('https://x.com/messages', { 
      waitUntil: 'load',
      timeout: 30000 
    });
    
    await service.humanDelay(5000, 8000);
    
    console.log('📸 页面截图');
    await service.screenshot('simple-comparison-initial.png');
    
    // 等待passcode输入框出现
    console.log('⏳ 等待passcode输入框出现...');
    await service.humanDelay(10000, 15000);
    
    // 查找passcode输入框
    console.log('🔍 查找passcode输入框...');
    const passcodeInput = await service.page.locator('input[name="text"]').first();
    
    if (await passcodeInput.isVisible()) {
      console.log('✅ 找到passcode输入框: input[name="text"]');
      
      console.log('\n🎯 测试方法1: locator.type()...');
      await passcodeInput.fill('');
      await service.humanDelay(500, 1000);
      
      const passcode = '0000';
      for (let i = 0; i < passcode.length; i++) {
        console.log(`输入 "${passcode[i]}"`);
        await passcodeInput.type(passcode[i]);
        await service.humanDelay(200, 400);
        const value = await passcodeInput.inputValue();
        console.log(`  当前值: "${value}" (长度: ${value.length})`);
      }
      const method1Result = await passcodeInput.inputValue();
      console.log(`📊 方法1最终结果: "${method1Result}"`);
      
      await service.screenshot('simple-comparison-method1.png');
      
      console.log('\n🎯 测试方法2: keyboard.press()...');
      await passcodeInput.fill('');
      await service.humanDelay(500, 1000);
      
      for (let i = 0; i < passcode.length; i++) {
        console.log(`输入 "${passcode[i]}"`);
        await service.page.keyboard.press(passcode[i]);
        await service.humanDelay(200, 400);
        const value = await passcodeInput.inputValue();
        console.log(`  当前值: "${value}" (长度: ${value.length})`);
      }
      const method2Result = await passcodeInput.inputValue();
      console.log(`📊 方法2最终结果: "${method2Result}"`);
      
      await service.screenshot('simple-comparison-method2.png');
      
      console.log('\n📊 对比结果:');
      console.log(`方法1 (locator.type()): "${method1Result}" (${method1Result.length}字符)`);
      console.log(`方法2 (keyboard.press()): "${method2Result}" (${method2Result.length}字符)`);
      
      if (method1Result === '0000' && method2Result === '0000') {
        console.log('✅ 两种方法都成功');
      } else {
        console.log('❌ 有方法失败');
      }
      
    } else {
      console.log('❌ 未找到passcode输入框');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await service.close();
    console.log('✅ Playwright 浏览器已关闭');
  }
});