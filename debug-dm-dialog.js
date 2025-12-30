const DMService = require('./src/services/dmService');

/**
 * 调试私信对话框页面结构的脚本
 * 检查打开私信对话框后的实际页面元素
 */

async function debugDMDialog() {
  console.log('🔍 调试私信对话框页面结构');
  console.log('=' * 70);
  
  const dmService = new DMService();
  
  try {
    // 初始化服务
    console.log('📡 初始化私信服务...');
    await dmService.initialize();
    
    // 注入cookies
    console.log('🍪 注入认证cookies...');
    await dmService.injectCookies('https://x.com');
    
    // 导航到第一个测试用户
    const testUsername = 'kent236896';
    console.log(`\n👤 导航到用户 @${testUsername}...`);
    await dmService.page.goto(`https://x.com/${testUsername}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('debug-user-page.png');
    
    // 点击消息按钮
    console.log(`💬 查找并点击消息按钮...`);
    const messageSelectors = [
      'a[aria-label*="Message"]',
      'button[aria-label*="Message"]',
      'div[aria-label*="Message"]',
      '*:contains("Message")'
    ];
    
    let messageButton = null;
    for (const selector of messageSelectors) {
      try {
        if (selector.includes(':contains')) {
          const elements = await dmService.page.$$('*');
          for (const element of elements) {
            const text = await dmService.page.evaluate(el => el.textContent, element);
            if (text && text.includes('Message')) {
              messageButton = element;
              console.log(`✅ 找到包含"Message"文本的元素`);
              break;
            }
          }
        } else {
          messageButton = await dmService.page.$(selector);
          if (messageButton) {
            console.log(`✅ 找到消息按钮: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    if (messageButton) {
      await messageButton.click();
      console.log('✅ 点击消息按钮');
      
      // 等待对话框打开
      await new Promise(resolve => setTimeout(resolve, 5000));
      await dmService.screenshot('debug-after-dm-click.png');
      
      // 检查页面URL变化
      const currentUrl = dmService.page.url();
      console.log(`当前URL: ${currentUrl}`);
      
      // 详细检查页面元素
      console.log('\n🔍 检查页面中的所有输入框元素...');
      
      // 1. 查找所有textarea
      const textareas = await dmService.page.$$('textarea');
      console.log(`找到 ${textareas.length} 个textarea:`);
      for (let i = 0; i < textareas.length; i++) {
        try {
          const placeholder = await textareas[i].evaluate(el => el.placeholder || '');
          const className = await textareas[i].evaluate(el => el.className || '');
          const testId = await textareas[i].evaluate(el => el.getAttribute('data-testid') || '');
          console.log(`  ${i + 1}. textarea - placeholder: "${placeholder}", class: "${className}", data-testid: "${testId}"`);
        } catch (e) {
          console.log(`  ${i + 1}. textarea - 获取属性失败`);
        }
      }
      
      // 2. 查找所有contenteditable元素
      const contentEditables = await dmService.page.$$('div[contenteditable="true"]');
      console.log(`找到 ${contentEditables.length} 个contenteditable元素:`);
      for (let i = 0; i < contentEditables.length; i++) {
        try {
          const className = await contentEditables[i].evaluate(el => el.className || '');
          const testId = await contentEditables[i].evaluate(el => el.getAttribute('data-testid') || '');
          const role = await contentEditables[i].evaluate(el => el.getAttribute('role') || '');
          const ariaLabel = await contentEditables[i].evaluate(el => el.getAttribute('aria-label') || '');
          console.log(`  ${i + 1}. contenteditable - class: "${className}", data-testid: "${testId}", role: "${role}", aria-label: "${ariaLabel}"`);
        } catch (e) {
          console.log(`  ${i + 1}. contenteditable - 获取属性失败`);
        }
      }
      
      // 3. 查找所有输入框
      const inputs = await dmService.page.$$('input');
      console.log(`找到 ${inputs.length} 个input元素:`);
      for (let i = 0; i < inputs.length; i++) {
        try {
          const type = await inputs[i].evaluate(el => el.type || '');
          const placeholder = await inputs[i].evaluate(el => el.placeholder || '');
          const className = await inputs[i].evaluate(el => el.className || '');
          const testId = await inputs[i].evaluate(el => el.getAttribute('data-testid') || '');
          console.log(`  ${i + 1}. input[type="${type}"] - placeholder: "${placeholder}", class: "${className}", data-testid: "${testId}"`);
        } catch (e) {
          console.log(`  ${i + 1}. input - 获取属性失败`);
        }
      }
      
      // 4. 查找包含文本的div元素
      console.log('\n🔍 检查可能包含输入框的容器元素...');
      const possibleContainers = await dmService.page.$$('div, span, p');
      let containerCount = 0;
      
      for (let i = 0; i < possibleContainers.length && containerCount < 10; i++) {
        try {
          const text = await possibleContainers[i].evaluate(el => el.textContent || '');
          if (text && (text.toLowerCase().includes('message') || text.toLowerCase().includes('say') || text.toLowerCase().includes('type'))) {
            const className = await possibleContainers[i].evaluate(el => el.className || '');
            const testId = await possibleContainers[i].evaluate(el => el.getAttribute('data-testid') || '');
            console.log(`  包含相关文本的容器: "${text.substring(0, 50)}..." - class: "${className}", data-testid: "${testId}"`);
            containerCount++;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 5. 查找发送按钮
      console.log('\n🔍 检查发送按钮...');
      const buttonSelectors = [
        'button[data-testid*="Send"]',
        'button[data-testid*="Message"]',
        'button[aria-label*="Send"]',
        'div[role="button"]',
        'button[type="submit"]'
      ];
      
      for (const selector of buttonSelectors) {
        try {
          const buttons = await dmService.page.$$(selector);
          if (buttons.length > 0) {
            console.log(`找到 ${buttons.length} 个按钮 (${selector}):`);
            for (let i = 0; i < Math.min(buttons.length, 3); i++) {
              try {
                const text = await buttons[i].evaluate(el => el.textContent || '');
                const ariaLabel = await buttons[i].evaluate(el => el.getAttribute('aria-label') || '');
                console.log(`  ${i + 1}. "${text}" - aria-label: "${ariaLabel}"`);
              } catch (e) {
                console.log(`  ${i + 1}. 无法获取按钮信息`);
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
      
    } else {
      console.log('❌ 未找到消息按钮');
    }
    
    // 拍摄最终状态
    await dmService.screenshot('debug-final-state.png');
    
    console.log('\n📊 调试完成 - 请查看截图和日志来分析私信对话框的结构');
    
  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    await dmService.cleanup();
    console.log('✅ 调试完成');
  }
}

// 运行调试
debugDMDialog().catch(console.error);