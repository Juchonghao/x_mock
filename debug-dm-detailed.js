const DMService = require('./src/services/dmService');

async function debugDMDetailed() {
  console.log('🔍 详细调试私信功能...');
  
  const dmService = new DMService();
  
  try {
    await dmService.initialize();
    await dmService.checkLoginStatus();
    
    console.log('\n--- 测试用户: @kent236896 ---');
    
    // 导航到用户页面
    console.log('🔍 导航到用户页面...');
    await dmService.page.goto('https://x.com/kent236896', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('debug-detailed-user-page.png');
    
    // 详细分析页面元素
    console.log('\n📋 详细分析页面元素...');
    console.log('当前URL:', dmService.page.url());
    
    // 1. 查找消息按钮
    console.log('\n🔍 查找消息按钮...');
    const messageButton = await dmService.page.$('a[aria-label*="Message"]');
    if (messageButton) {
      console.log('✅ 找到消息按钮');
      await messageButton.click();
      console.log('✅ 点击消息按钮');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await dmService.screenshot('debug-detailed-after-click.png');
    } else {
      console.log('❌ 未找到消息按钮');
    }
    
    // 2. 详细分析点击后的页面
    console.log('\n📋 点击后页面分析...');
    console.log('当前URL:', dmService.page.url());
    
    // 检查页面是否发生了变化
    const currentUrl = dmService.page.url();
    if (currentUrl.includes('/chat')) {
      console.log('✅ 成功导航到聊天页面');
    } else if (currentUrl.includes('/pin/') || currentUrl.includes('/verify')) {
      console.log('🔐 检测到PIN验证页面');
      await dmService.handlePinVerification();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await dmService.screenshot('debug-detailed-after-pin.png');
    } else {
      console.log('⚠️ 页面可能没有发生变化或导航到了其他页面');
    }
    
    // 3. 分析页面中的所有元素
    console.log('\n🔍 分析页面中的所有元素...');
    
    // 查找所有按钮
    const allButtons = await dmService.page.$$('button');
    console.log(`找到 ${allButtons.length} 个按钮:`);
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      try {
        const text = await allButtons[i].evaluate(el => el.textContent || '');
        const ariaLabel = await allButtons[i].evaluate(el => el.getAttribute('aria-label') || '');
        const dataTestId = await allButtons[i].evaluate(el => el.getAttribute('data-testid') || '');
        console.log(`  ${i + 1}. 按钮 - text: "${text}", aria-label: "${ariaLabel}", data-testid: "${dataTestId}"`);
      } catch (e) {
        console.log(`  ${i + 1}. 按钮 - 获取信息失败`);
      }
    }
    
    // 查找所有链接
    const allLinks = await dmService.page.$$('a');
    console.log(`\n找到 ${allLinks.length} 个链接:`);
    for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
      try {
        const href = await allLinks[i].evaluate(el => el.getAttribute('href') || '');
        const ariaLabel = await allLinks[i].evaluate(el => el.getAttribute('aria-label') || '');
        const text = await allLinks[i].evaluate(el => el.textContent || '');
        console.log(`  ${i + 1}. 链接 - href: "${href}", aria-label: "${ariaLabel}", text: "${text}"`);
      } catch (e) {
        console.log(`  ${i + 1}. 链接 - 获取信息失败`);
      }
    }
    
    // 查找所有输入框
    const allInputs = await dmService.page.$$('input, textarea, div[contenteditable="true"]');
    console.log(`\n找到 ${allInputs.length} 个输入框:`);
    for (let i = 0; i < Math.min(allInputs.length, 10); i++) {
      try {
        const type = await allInputs[i].evaluate(el => el.tagName || '');
        const placeholder = await allInputs[i].evaluate(el => el.placeholder || '');
        const ariaLabel = await allInputs[i].evaluate(el => el.getAttribute('aria-label') || '');
        const dataTestId = await allInputs[i].evaluate(el => el.getAttribute('data-testid') || '');
        const className = await allInputs[i].evaluate(el => el.className || '');
        console.log(`  ${i + 1}. ${type} - placeholder: "${placeholder}", aria-label: "${ariaLabel}", data-testid: "${dataTestId}", class: "${className}"`);
      } catch (e) {
        console.log(`  ${i + 1}. 输入框 - 获取信息失败`);
      }
    }
    
    // 4. 尝试找到聊天相关的元素
    console.log('\n🔍 查找聊天相关元素...');
    
    // 查找包含"New"、"Message"、"Chat"等关键词的元素
    const chatRelatedSelectors = [
      '*[data-testid*="Message"]',
      '*[data-testid*="Chat"]',
      '*[data-testid*="DM"]',
      '*[aria-label*="Message"]',
      '*[aria-label*="Chat"]',
      '*[aria-label*="New"]',
      '*:contains("New Message")',
      '*:contains("Start a message")',
      '*:contains("New conversation")'
    ];
    
    for (const selector of chatRelatedSelectors) {
      try {
        const element = await dmService.page.$(selector);
        if (element) {
          const tagName = await element.evaluate(el => el.tagName || '');
          const text = await element.evaluate(el => el.textContent || '');
          const ariaLabel = await element.evaluate(el => el.getAttribute('aria-label') || '');
          const dataTestId = await element.evaluate(el => el.getAttribute('data-testid') || '');
          console.log(`✅ 找到聊天相关元素: ${selector} - tag: ${tagName}, text: "${text}", aria-label: "${ariaLabel}", data-testid: "${dataTestId}"`);
        }
      } catch (e) {
        // 忽略不支持的选择器
      }
    }
    
    // 5. 检查是否有modal或overlay
    console.log('\n🔍 检查modal和overlay...');
    const modals = await dmService.page.$$('[role="dialog"], .modal, .overlay, [data-testid*="modal"]');
    console.log(`找到 ${modals.length} 个modal/overlay元素:`);
    for (let i = 0; i < Math.min(modals.length, 5); i++) {
      try {
        const role = await modals[i].evaluate(el => el.getAttribute('role') || '');
        const className = await modals[i].evaluate(el => el.className || '');
        console.log(`  ${i + 1}. Modal - role: "${role}", class: "${className}"`);
      } catch (e) {
        console.log(`  ${i + 1}. Modal - 获取信息失败`);
      }
    }
    
    console.log('\n✅ 详细调试完成');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error.message);
  } finally {
    await dmService.cleanup();
  }
}

// 运行调试
debugDMDetailed().catch(console.error);