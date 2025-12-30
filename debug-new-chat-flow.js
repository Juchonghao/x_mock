const DMService = require('./src/services/dmService');

async function debugNewChatFlow() {
  console.log('🔍 调试New Chat按钮点击流程...');
  
  const dmService = new DMService();
  
  try {
    await dmService.initialize();
    await dmService.checkLoginStatus();
    
    // 导航到聊天页面
    console.log('💬 导航到聊天页面...');
    await dmService.page.goto('https://x.com/i/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('debug-new-chat-initial.png');
    
    console.log('📋 初始聊天页面分析...');
    console.log('当前URL:', dmService.page.url());
    
    // 1. 查找New Chat按钮
    console.log('\n🔍 查找New Chat按钮...');
    const newChatButton = await dmService.page.$('button[data-testid="dm-empty-conversation-new-chat-button"]');
    if (newChatButton) {
      console.log('✅ 找到New Chat按钮');
      await newChatButton.click();
      console.log('✅ 点击New Chat按钮');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await dmService.screenshot('debug-new-chat-after-click.png');
    } else {
      console.log('❌ 未找到New Chat按钮');
    }
    
    // 2. 分析点击后的页面变化
    console.log('\n📋 点击New Chat后的页面分析...');
    console.log('当前URL:', dmService.page.url());
    
    // 查找所有可能的元素
    console.log('\n🔍 详细分析页面元素...');
    
    // 查找所有按钮
    const allButtons = await dmService.page.$$('button');
    console.log(`找到 ${allButtons.length} 个按钮:`);
    for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
      try {
        const text = await allButtons[i].evaluate(el => el.textContent || '');
        const ariaLabel = await allButtons[i].evaluate(el => el.getAttribute('aria-label') || '');
        const dataTestId = await allButtons[i].evaluate(el => el.getAttribute('data-testid') || '');
        const className = await allButtons[i].evaluate(el => el.className || '');
        console.log(`  ${i + 1}. 按钮 - text: "${text}", aria-label: "${ariaLabel}", data-testid: "${dataTestId}", class: "${className}"`);
      } catch (e) {
        console.log(`  ${i + 1}. 按钮 - 获取信息失败`);
      }
    }
    
    // 查找所有输入框
    const allInputs = await dmService.page.$$('input, textarea, div[contenteditable="true"]');
    console.log(`\n找到 ${allInputs.length} 个输入框:`);
    for (let i = 0; i < Math.min(allInputs.length, 15); i++) {
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
    
    // 3. 查找用户选择相关的元素
    console.log('\n🔍 查找用户选择相关元素...');
    const userSelectionSelectors = [
      '*[data-testid*="user"]',
      '*[data-testid*="User"]',
      '*[placeholder*="Search"]',
      '*[placeholder*="搜索"]',
      '*[aria-label*="Search"]',
      '*[aria-label*="搜索"]',
      '*:contains("Search people")',
      '*:contains("Start a message")',
      '*:contains("Add people")',
      '*:contains("搜索用户")'
    ];
    
    for (const selector of userSelectionSelectors) {
      try {
        const element = await dmService.page.$(selector);
        if (element) {
          const tagName = await element.evaluate(el => el.tagName || '');
          const text = await element.evaluate(el => el.textContent || '');
          const ariaLabel = await element.evaluate(el => el.getAttribute('aria-label') || '');
          const dataTestId = await element.evaluate(el => el.getAttribute('data-testid') || '');
          const placeholder = await element.evaluate(el => el.placeholder || '');
          console.log(`✅ 找到用户选择元素: ${selector} - tag: ${tagName}, text: "${text}", aria-label: "${ariaLabel}", data-testid: "${dataTestId}", placeholder: "${placeholder}"`);
        }
      } catch (e) {
        // 忽略不支持的选择器
      }
    }
    
    // 4. 检查是否有modal或overlay
    console.log('\n🔍 检查modal和overlay...');
    const modals = await dmService.page.$$('[role="dialog"], .modal, .overlay, [data-testid*="modal"]');
    console.log(`找到 ${modals.length} 个modal/overlay元素:`);
    for (let i = 0; i < Math.min(modals.length, 5); i++) {
      try {
        const role = await modals[i].evaluate(el => el.getAttribute('role') || '');
        const className = await modals[i].evaluate(el => el.className || '');
        const dataTestId = await modals[i].evaluate(el => el.getAttribute('data-testid') || '');
        console.log(`  ${i + 1}. Modal - role: "${role}", class: "${className}", data-testid: "${dataTestId}"`);
      } catch (e) {
        console.log(`  ${i + 1}. Modal - 获取信息失败`);
      }
    }
    
    // 5. 尝试直接输入用户名看看会发生什么
    console.log('\n🔍 尝试直接输入用户名...');
    const anyInput = allInputs[0];
    if (anyInput) {
      try {
        await anyInput.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await dmService.page.type(anyInput, 'kent236896', { delay: 100 });
        console.log('📝 输入用户名: kent236896');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await dmService.screenshot('debug-new-chat-after-typing.png');
      } catch (e) {
        console.log('⚠️ 输入用户名失败:', e.message);
      }
    }
    
    console.log('\n✅ New Chat流程调试完成');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error.message);
  } finally {
    await dmService.cleanup();
  }
}

// 运行调试
debugNewChatFlow().catch(console.error);