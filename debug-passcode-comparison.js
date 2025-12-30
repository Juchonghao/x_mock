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
    await service.screenshot('passcode-comparison-initial.png');
    
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
    
    if (!passcodeInput) {
      console.log('❌ 未找到passcode输入框');
      return;
    }
    
    console.log('🎯 对比测试两种passcode输入方法...');
    console.log('📊 输入框详细信息:', {
      placeholder: await passcodeInput.getAttribute('placeholder') || '无placeholder',
      name: await passcodeInput.getAttribute('name') || '无name',
      type: await passcodeInput.getAttribute('type') || '无type',
      maxlength: await passcodeInput.getAttribute('maxlength') || '无maxlength'
    });
    
    // 测试方法1: locator.type() (实际服务使用的方法)
    console.log('\n🔧 方法1: locator.type() (实际服务使用的方法)...');
    await passcodeInput.fill('');
    await service.humanDelay(500, 1000);
    
    const passcode = '0000';
    for (let i = 0; i < passcode.length; i++) {
      console.log(`输入字符 ${i + 1}: "${passcode[i]}"`);
      await passcodeInput.type(passcode[i]);
      await service.humanDelay(200, 400);
      const currentValue = await passcodeInput.inputValue();
      console.log(`   当前值: "${currentValue}" (长度: ${currentValue.length})`);
    }
    const method1Result = await passcodeInput.inputValue();
    console.log(`📊 方法1结果: "${method1Result}" (长度: ${method1Result.length})`);
    
    // 清空并测试方法2: keyboard.press() (测试脚本使用的方法)
    console.log('\n🔧 方法2: keyboard.press() (测试脚本使用的方法)...');
    await passcodeInput.fill('');
    await service.humanDelay(500, 1000);
    
    for (let i = 0; i < passcode.length; i++) {
      console.log(`输入字符 ${i + 1}: "${passcode[i]}"`);
      await service.page.keyboard.press(passcode[i]);
      await service.humanDelay(200, 400);
      const currentValue = await passcodeInput.inputValue();
      console.log(`   当前值: "${currentValue}" (长度: ${currentValue.length})`);
    }
    const method2Result = await passcodeInput.inputValue();
    console.log(`📊 方法2结果: "${method2Result}" (长度: ${method2Result.length})`);
    
    // 对比结果
    console.log('\n📊 对比结果:');
    console.log(`方法1 (locator.type()): "${method1Result}" (长度: ${method1Result.length})`);
    console.log(`方法2 (keyboard.press()): "${method2Result}" (长度: ${method2Result.length})`);
    
    if (method1Result === '0000' && method2Result === '0000') {
      console.log('✅ 两种方法都成功输入完整passcode');
    } else if (method1Result !== '0000' && method2Result === '0000') {
      console.log('❌ 方法1 (实际服务使用) 有问题，方法2正常');
    } else if (method1Result === '0000' && method2Result !== '0000') {
      console.log('❌ 方法2 (测试脚本使用) 有问题，方法1正常');
    } else {
      console.log('❌ 两种方法都有问题');
    }
    
    await service.screenshot('passcode-comparison-final.png');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await service.close();
    console.log('✅ Playwright 浏览器已关闭');
  }
});