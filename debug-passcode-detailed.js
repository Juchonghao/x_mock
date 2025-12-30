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
    await service.screenshot('detailed-passcode-initial.png');
    
    // 等待passcode输入框出现
    console.log('⏳ 等待passcode输入框...');
    await service.humanDelay(5000, 8000);
    
    // 查找passcode输入框
    console.log('🔍 详细检查passcode输入框...');
    const passcodeSelectors = [
      'input[name="text"]',
      'input[type="text"]',
      'input[placeholder*="Passcode"]',
      'input[placeholder*="passcode"]',
      'input[placeholder*="Code"]',
      'input[placeholder*="code"]',
      'input[type="tel"]'
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
          
          // 获取输入框的详细信息
          const placeholder = await input.getAttribute('placeholder') || '无placeholder';
          const name = await input.getAttribute('name') || '无name';
          const type = await input.getAttribute('type') || '无type';
          const value = await input.inputValue();
          console.log(`   输入框信息: placeholder="${placeholder}", name="${name}", type="${type}", 当前值="${value}"`);
          
          break;
        }
      } catch (e) {
        console.log(`❌ 检查 ${selector} 时出错: ${e.message}`);
        continue;
      }
    }
    
    if (passcodeInput) {
      console.log('\n🔐 开始详细的passcode输入测试...');
      
      // 点击输入框
      console.log('1. 点击输入框...');
      await passcodeInput.click();
      await service.humanDelay(1000, 1500);
      
      // 清空输入框
      console.log('2. 清空输入框...');
      await passcodeInput.fill('');
      await service.humanDelay(1000, 1500);
      
      // 方法1: 尝试使用type方法逐字符输入
      console.log('\n📝 方法1: 使用type()逐字符输入...');
      const passcode = '0000';
      console.log(`输入目标: "${passcode}"`);
      
      for (let i = 0; i < passcode.length; i++) {
        console.log(`输入字符 ${i + 1}: "${passcode[i]}"`);
        await passcodeInput.type(passcode[i]);
        await service.humanDelay(300, 500);
        
        // 检查输入框当前值
        const currentValue = await passcodeInput.inputValue();
        console.log(`   当前输入框值: "${currentValue}"`);
      }
      
      console.log('✅ 完成逐字符输入');
      await service.humanDelay(2000, 3000);
      
      // 检查最终值
      const finalValue = await passcodeInput.inputValue();
      console.log(`\n📊 最终输入框值: "${finalValue}"`);
      
      if (finalValue === '0000') {
        console.log('✅ 逐字符输入成功！');
      } else {
        console.log('❌ 逐字符输入失败！');
        
        // 方法2: 尝试fill方法
        console.log('\n📝 方法2: 使用fill()方法...');
        await passcodeInput.fill('');
        await service.humanDelay(1000, 1500);
        
        console.log('尝试一次性输入完整passcode...');
        await passcodeInput.fill('0000');
        await service.humanDelay(1000, 1500);
        
        const fillValue = await passcodeInput.inputValue();
        console.log(`fill()方法结果: "${fillValue}"`);
        
        // 方法3: 尝试先选择全部再输入
        if (fillValue !== '0000') {
          console.log('\n📝 方法3: 先选择全部再输入...');
          await passcodeInput.click();
          await service.humanDelay(500, 1000);
          
          // 全选
          await service.page.keyboard.press('Control+a');
          await service.humanDelay(500, 1000);
          
          // 输入
          await service.page.keyboard.type('0000');
          await service.humanDelay(1000, 1500);
          
          const selectAllValue = await passcodeInput.inputValue();
          console.log(`selectAll()方法结果: "${selectAllValue}"`);
        }
      }
      
      console.log('\n📸 输入完成后截图');
      await service.screenshot('detailed-passcode-after-input.png');
      
      // 尝试找到确认按钮
      console.log('\n🔍 查找确认按钮...');
      const confirmSelectors = [
        'button[data-testid*="Continue"]',
        'button[type="submit"]',
        'button:has-text("Continue")',
        'button:has-text("继续")',
        'button:has-text("确认")',
        'button:has-text("验证")'
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
      
    } else {
      console.log('❌ 未找到passcode输入框');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await service.screenshot('detailed-passcode-error.png');
  } finally {
    await service.close();
  }
})();