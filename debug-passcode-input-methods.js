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
    await service.screenshot('input-methods-initial.png');
    
    // 等待passcode输入框出现
    console.log('⏳ 等待passcode输入框出现...');
    await service.humanDelay(8000, 12000);
    
    // 查找passcode输入框
    console.log('🔍 查找passcode输入框...');
    const passcodeSelectors = [
      'input[name="text"]',
      'input[type="text"]',
      'input[type="tel"]',
      'input[inputmode="numeric"]',
      'input[placeholder*="Passcode"]',
      'input[placeholder*="passcode"]',
      'input[placeholder*="Code"]'
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
      console.log('\n🧪 测试不同的passcode输入方法...');
      
      // 获取输入框信息
      const placeholder = await passcodeInput.getAttribute('placeholder') || '无placeholder';
      const name = await passcodeInput.getAttribute('name') || '无name';
      const type = await passcodeInput.getAttribute('type') || '无type';
      const value = await passcodeInput.inputValue();
      console.log(`📊 输入框信息: placeholder="${placeholder}", name="${name}", type="${type}", 当前值="${value}"`);
      
      console.log('\n📝 方法1: 使用type()方法逐字符输入...');
      
      // 清空输入框
      await passcodeInput.fill('');
      await service.humanDelay(1000, 1500);
      
      // 方法1: 使用type()逐字符输入
      const passcode = '0000';
      console.log(`目标passcode: "${passcode}"`);
      
      for (let i = 0; i < passcode.length; i++) {
        console.log(`输入字符 ${i + 1}: "${passcode[i]}"`);
        await passcodeInput.type(passcode[i]);
        await service.humanDelay(500, 800);
        
        const currentValue = await passcodeInput.inputValue();
        console.log(`   当前输入框值: "${currentValue}" (长度: ${currentValue.length})`);
      }
      
      let finalValue = await passcodeInput.inputValue();
      console.log(`📊 方法1最终结果: "${finalValue}" (长度: ${finalValue.length})`);
      
      if (finalValue !== '0000') {
        console.log('\n📝 方法2: 使用keyboard.type()方法...');
        
        // 清空输入框
        await passcodeInput.fill('');
        await service.humanDelay(1000, 1500);
        
        // 点击输入框确保焦点
        await passcodeInput.click();
        await service.humanDelay(500, 1000);
        
        // 使用keyboard.type()
        await service.page.keyboard.type('0000');
        await service.humanDelay(1000, 1500);
        
        const keyboardValue = await passcodeInput.inputValue();
        console.log(`📊 方法2最终结果: "${keyboardValue}" (长度: ${keyboardValue.length})`);
        
        if (keyboardValue !== '0000') {
          console.log('\n📝 方法3: 使用fill()方法...');
          
          // 清空输入框
          await passcodeInput.fill('');
          await service.humanDelay(1000, 1500);
          
          // 使用fill()
          await passcodeInput.fill('0000');
          await service.humanDelay(1000, 1500);
          
          const fillValue = await passcodeInput.inputValue();
          console.log(`📊 方法3最终结果: "${fillValue}" (长度: ${fillValue.length})`);
          
          if (fillValue !== '0000') {
            console.log('\n📝 方法4: 先选择全部再输入...');
            
            // 点击输入框
            await passcodeInput.click();
            await service.humanDelay(500, 1000);
            
            // 全选
            await service.page.keyboard.press('Control+a');
            await service.humanDelay(500, 1000);
            
            // 输入
            await service.page.keyboard.type('0000');
            await service.humanDelay(1000, 1500);
            
            const selectAllValue = await passcodeInput.inputValue();
            console.log(`📊 方法4最终结果: "${selectAllValue}" (长度: ${selectAllValue.length})`);
            
            if (selectAllValue !== '0000') {
              console.log('\n📝 方法5: 逐字符键盘输入...');
              
              // 清空输入框
              await passcodeInput.fill('');
              await service.humanDelay(1000, 1500);
              
              // 点击输入框
              await passcodeInput.click();
              await service.humanDelay(500, 1000);
              
              // 逐字符键盘输入
              for (let i = 0; i < passcode.length; i++) {
                console.log(`键盘输入字符 ${i + 1}: "${passcode[i]}"`);
                await service.page.keyboard.press(passcode[i]);
                await service.humanDelay(300, 600);
                
                const currentValue = await passcodeInput.inputValue();
                console.log(`   当前输入框值: "${currentValue}" (长度: ${currentValue.length})`);
              }
              
              const finalKeyboardValue = await passcodeInput.inputValue();
              console.log(`📊 方法5最终结果: "${finalKeyboardValue}" (长度: ${finalKeyboardValue.length})`);
            }
          }
        }
      }
      
      console.log('\n📸 输入完成后截图');
      await service.screenshot('input-methods-after-input.png');
      
      // 尝试找到并点击确认按钮
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
      
      console.log('\n📸 确认后截图');
      await service.screenshot('input-methods-after-confirm.png');
      
    } else {
      console.log('❌ 未找到passcode输入框');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await service.screenshot('input-methods-error.png');
  } finally {
    await service.close();
  }
})();