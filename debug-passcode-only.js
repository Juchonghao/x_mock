const PlaywrightDMService = require('./src/services/playwrightDMService.js');
const service = new PlaywrightDMService();

(async () => {
  try {
    await service.initialize();
    console.log('✅ 浏览器初始化完成');
    
    // 直接访问私信页面
    console.log('🔗 访问私信页面...');
    await service.page.goto('https://x.com/messages', { 
      waitUntil: 'load',
      timeout: 30000 
    });
    
    await service.humanDelay(3000, 5000);
    
    console.log('📸 私信页面初始截图');
    await service.screenshot('passcode-only-initial.png');
    
    // 等待passcode输入框出现
    console.log('⏳ 等待passcode输入框出现...');
    await service.humanDelay(8000, 12000);
    
    // 查找passcode输入框
    console.log('🔍 查找passcode输入框...');
    const passcodeSelectors = [
      'input[name="text"]',
      'input[type="text"]',
      'input[type="tel"]',
      'input[placeholder*="Passcode"]',
      'input[placeholder*="passcode"]'
    ];
    
    let passcodeInput = null;
    for (const selector of passcodeSelectors) {
      try {
        const input = await service.page.locator(selector).first();
        const visible = await input.isVisible();
        console.log(`检查 ${selector}: 可见=${visible}`);
        
        if (visible) {
          passcodeInput = input;
          console.log(`✅ 找到passcode输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (passcodeInput) {
      console.log('\n🎯 专门测试passcode输入方法...');
      
      // 获取输入框详细信息
      const placeholder = await passcodeInput.getAttribute('placeholder') || '无placeholder';
      const name = await passcodeInput.getAttribute('name') || '无name';
      const type = await passcodeInput.getAttribute('type') || '无type';
      const maxlength = await passcodeInput.getAttribute('maxlength') || '无maxlength';
      const value = await passcodeInput.inputValue();
      console.log(`📊 输入框详细信息: placeholder="${placeholder}", name="${name}", type="${type}", maxlength="${maxlength}", 当前值="${value}"`);
      
      console.log('\n🔧 方法A: 先清空，再一次性fill()...');
      
      // 清空输入框
      await passcodeInput.fill('');
      await service.humanDelay(500, 1000);
      
      // 一次性使用fill()
      await passcodeInput.fill('0000');
      await service.humanDelay(1000, 1500);
      
      let resultA = await passcodeInput.inputValue();
      console.log(`📊 方法A结果: "${resultA}" (长度: ${resultA.length})`);
      
      console.log('\n🔧 方法B: 点击后使用keyboard.type()...');
      
      // 清空
      await passcodeInput.fill('');
      await service.humanDelay(500, 1000);
      
      // 点击确保焦点
      await passcodeInput.click();
      await service.humanDelay(500, 1000);
      
      // 使用keyboard.type()
      await service.page.keyboard.type('0000');
      await service.humanDelay(1000, 1500);
      
      let resultB = await passcodeInput.inputValue();
      console.log(`📊 方法B结果: "${resultB}" (长度: ${resultB.length})`);
      
      console.log('\n🔧 方法C: 逐个字符用keyboard.press()...');
      
      // 清空
      await passcodeInput.fill('');
      await service.humanDelay(500, 1000);
      
      // 点击确保焦点
      await passcodeInput.click();
      await service.humanDelay(500, 1000);
      
      // 逐个字符用keyboard.press()
      const passcode = '0000';
      for (let i = 0; i < passcode.length; i++) {
        console.log(`输入字符 ${i + 1}: "${passcode[i]}"`);
        await service.page.keyboard.press(passcode[i]);
        await service.humanDelay(200, 400);
        
        const currentValue = await passcodeInput.inputValue();
        console.log(`   当前值: "${currentValue}" (长度: ${currentValue.length})`);
      }
      
      let resultC = await passcodeInput.inputValue();
      console.log(`📊 方法C结果: "${resultC}" (长度: ${resultC.length})`);
      
      console.log('\n🔧 方法D: 聚焦后发送字符序列...');
      
      // 清空
      await passcodeInput.fill('');
      await service.humanDelay(500, 1000);
      
      // 聚焦
      await passcodeInput.focus();
      await service.humanDelay(500, 1000);
      
      // 发送字符序列
      await service.page.keyboard.insertText('0000');
      await service.humanDelay(1000, 1500);
      
      let resultD = await passcodeInput.inputValue();
      console.log(`📊 方法D结果: "${resultD}" (长度: ${resultD.length})`);
      
      console.log('\n🔧 方法E: 组合方法 - focus + clear + insertText...');
      
      // 清空
      await passcodeInput.fill('');
      await service.humanDelay(500, 1000);
      
      // 确保元素可以交互
      await passcodeInput.scrollIntoViewIfNeeded();
      await service.humanDelay(500, 1000);
      
      // 点击和聚焦
      await passcodeInput.click({ force: true });
      await service.humanDelay(500, 1000);
      
      // 全选并输入
      await service.page.keyboard.press('Control+a');
      await service.humanDelay(300, 500);
      await service.page.keyboard.type('0000');
      await service.humanDelay(1000, 1500);
      
      let resultE = await passcodeInput.inputValue();
      console.log(`📊 方法E结果: "${resultE}" (长度: ${resultE.length})`);
      
      console.log('\n📸 最终输入状态截图');
      await service.screenshot('passcode-only-final.png');
      
      // 尝试找到确认按钮
      console.log('\n🔍 查找确认按钮...');
      const confirmSelectors = [
        'button[data-testid*="Continue"]',
        'button[type="submit"]',
        'button:has-text("Continue")',
        'button:has-text("继续")',
        'button:has-text("确认")'
      ];
      
      for (const selector of confirmSelectors) {
        try {
          const confirmButton = await service.page.locator(selector).first();
          const visible = await confirmButton.isVisible();
          if (visible) {
            console.log(`✅ 找到确认按钮: ${selector}`);
            await confirmButton.click();
            await service.humanDelay(2000, 3000);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('\n📸 确认后截图');
      await service.screenshot('passcode-only-after-confirm.png');
      
    } else {
      console.log('❌ 未找到passcode输入框');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await service.screenshot('passcode-only-error.png');
  } finally {
    await service.close();
  }
})();