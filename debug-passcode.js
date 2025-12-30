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
    await service.screenshot('debug-messages-initial.png');
    
    // 检查页面上的所有输入元素
    console.log('\n🔍 检查所有输入元素...');
    const allInputs = await service.page.locator('input').count();
    console.log(`📝 找到 ${allInputs} 个input元素`);
    
    for (let i = 0; i < Math.min(allInputs, 15); i++) {
      try {
        const input = service.page.locator('input').nth(i);
        const visible = await input.isVisible();
        if (visible) {
          const placeholder = await input.getAttribute('placeholder') || '无placeholder';
          const name = await input.getAttribute('name') || '无name';
          const type = await input.getAttribute('type') || '无type';
          const ariaLabel = await input.getAttribute('aria-label') || '无aria-label';
          const dataTestid = await input.getAttribute('data-testid') || '无data-testid';
          console.log(`Input ${i}: placeholder="${placeholder}", name="${name}", type="${type}", aria-label="${ariaLabel}", data-testid="${data-testid}"`);
        }
      } catch (e) {
        continue;
      }
    }
    
    // 检查contenteditable元素
    console.log('\n🔍 检查contenteditable元素...');
    const allEditable = await service.page.locator('div[contenteditable="true"]').count();
    console.log(`📝 找到 ${allEditable} 个contenteditable元素`);
    
    for (let i = 0; i < Math.min(allEditable, 10); i++) {
      try {
        const editable = service.page.locator('div[contenteditable="true"]').nth(i);
        const visible = await editable.isVisible();
        if (visible) {
          const role = await editable.getAttribute('role') || '无role';
          const ariaLabel = await editable.getAttribute('aria-label') || '无aria-label';
          const placeholder = await editable.getAttribute('placeholder') || '无placeholder';
          const dataTestid = await editable.getAttribute('data-testid') || '无data-testid';
          console.log(`Editable ${i}: role="${role}", aria-label="${ariaLabel}", placeholder="${placeholder}", data-testid="${dataTestid}"`);
        }
      } catch (e) {
        continue;
      }
    }
    
    // 检查可能的passcode输入框
    console.log('\n🔐 检查passcode输入框...');
    const passcodeSelectors = [
      'input[name="text"]',
      'input[placeholder*="Passcode"]',
      'input[placeholder*="passcode"]',
      'input[placeholder*="Code"]',
      'input[placeholder*="code"]',
      'input[placeholder*="验证码"]',
      'input[placeholder*="验证"]',
      'input[data-testid*="Passcode"]',
      'input[data-testid*="Code"]',
      'input[data-testid*="EnterText"]',
      'input[data-testid="ocfEnterTextInput"]',
      'input[type="text"]',
      'input[type="tel"]',
      'input[inputmode="numeric"]'
    ];
    
    for (const selector of passcodeSelectors) {
      try {
        const input = await service.page.locator(selector).first();
        const visible = await input.isVisible();
        if (visible) {
          const placeholder = await input.getAttribute('placeholder') || '无placeholder';
          const name = await input.getAttribute('name') || '无name';
          const type = await input.getAttribute('type') || '无type';
          const ariaLabel = await input.getAttribute('aria-label') || '无aria-label';
          const dataTestid = await input.getAttribute('data-testid') || '无data-testid';
          console.log(`✅ 找到passcode输入框: ${selector}`);
          console.log(`   placeholder="${placeholder}", name="${name}", type="${type}", aria-label="${ariaLabel}", data-testid="${dataTestid}"`);
          
          // 如果找到passcode输入框，尝试输入0000
          console.log('🔐 输入passcode 0000...');
          await input.click();
          await service.humanDelay(1000, 1500);
          
          // 清空输入框
          await input.fill('');
          await service.humanDelay(500, 1000);
          
          // 改进的passcode输入方法 - 逐字符输入
          const passcode = '0000';
          for (let i = 0; i < passcode.length; i++) {
            await input.type(passcode[i]);
            await service.humanDelay(200, 400); // 每个字符之间的延迟
          }
          
          console.log('✅ 完成passcode输入');
          await service.humanDelay(2000, 3000);
          
          // 查找确认按钮
          const confirmSelectors = [
            'button[data-testid*="Continue"]',
            'button[type="submit"]',
            'button:has-text("Continue")',
            'button:has-text("继续")',
            'button:has-text("确认")',
            'button:has-text("验证")'
          ];
          
          for (const confirmSelector of confirmSelectors) {
            try {
              const confirmButton = await service.page.locator(confirmSelector).first();
              if (await confirmButton.isVisible()) {
                console.log(`✅ 找到确认按钮: ${confirmSelector}`);
                await confirmButton.click();
                await service.humanDelay(2000, 3000);
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          console.log('📸 输入passcode后截图');
          await service.screenshot('debug-after-passcode.png');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await service.screenshot('debug-error.png');
  } finally {
    await service.close();
  }
})();