require('dotenv').config();
const DMService = require('./src/services/dmService');

async function debugDMSend() {
  console.log('🔍 调试私信发送功能 - 重点分析对话框打开问题');
  console.log('=' * 60);
  
  const dmService = new DMService();
  
  try {
    // 初始化服务
    console.log('📡 初始化私信服务...');
    await dmService.initialize();
    
    // 注入cookies
    console.log('🍪 注入认证cookies...');
    await dmService.injectCookies('https://x.com');
    
    // 检查登录状态
    console.log('🔍 检查登录状态...');
    const isLoggedIn = await dmService.checkLoginStatus();
    
    if (!isLoggedIn) {
      console.log('❌ 用户未登录，终止测试');
      return;
    }
    
    console.log('✅ 登录状态检查完成，开始测试');
    
    // 只测试第一个用户
    const testUser = 'kent236896';
    console.log(`\n🎯 专门测试用户: @${testUser}`);
    
    // 访问用户页面
    console.log(`🔗 访问用户页面...`);
    const userFound = await dmService.searchUserAndOpenDM(testUser);
    
    if (!userFound) {
      console.log(`❌ 无法访问用户页面`);
      return;
    }
    
    // 拍摄当前页面截图
    console.log('📸 拍摄用户页面截图...');
    await dmService.screenshot('debug-user-page.png');
    
    // 详细分析页面上的所有按钮
    console.log('🔍 分析页面上的所有按钮...');
    const buttons = await dmService.page.$$('button, a[role="button"], div[role="button"]');
    console.log(`找到 ${buttons.length} 个按钮`);
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      try {
        const button = buttons[i];
        const ariaLabel = await dmService.page.evaluate(el => el.getAttribute('aria-label'), button);
        const text = await dmService.page.evaluate(el => el.textContent, button);
        const href = await dmService.page.evaluate(el => el.getAttribute('href'), button);
        
        console.log(`按钮 ${i + 1}:`);
        console.log(`  - aria-label: ${ariaLabel || '无'}`);
        console.log(`  - text: ${text || '无'}`);
        console.log(`  - href: ${href || '无'}`);
        console.log(`  - 可点击: ${await dmService.page.evaluate(el => !el.disabled && el.offsetParent !== null, button)}`);
        console.log('');
      } catch (e) {
        console.log(`按钮 ${i + 1}: 分析失败 - ${e.message}`);
      }
    }
    
    // 尝试点击消息按钮
    console.log('💬 尝试点击消息按钮...');
    const dmOpened = await dmService.openDMDialog();
    
    if (dmOpened) {
      console.log('✅ 私信对话框已打开');
    } else {
      console.log('❌ 私信对话框打开失败');
    }
    
    // 拍摄点击后的截图
    console.log('📸 拍摄点击消息按钮后的截图...');
    await dmService.screenshot('debug-after-dm-click.png');
    
    // 详细分析页面元素
    console.log('🔍 分析当前页面的所有输入元素...');
    const inputs = await dmService.page.$$('input, textarea, div[contenteditable="true"]');
    console.log(`找到 ${inputs.length} 个输入元素`);
    
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      try {
        const input = inputs[i];
        const placeholder = await dmService.page.evaluate(el => el.getAttribute('placeholder'), input);
        const ariaLabel = await dmService.page.evaluate(el => el.getAttribute('aria-label'), input);
        const testId = await dmService.page.evaluate(el => el.getAttribute('data-testid'), input);
        const contenteditable = await dmService.page.evaluate(el => el.getAttribute('contenteditable'), input);
        
        console.log(`输入元素 ${i + 1}:`);
        console.log(`  - placeholder: ${placeholder || '无'}`);
        console.log(`  - aria-label: ${ariaLabel || '无'}`);
        console.log(`  - data-testid: ${testId || '无'}`);
        console.log(`  - contenteditable: ${contenteditable || '无'}`);
        console.log(`  - 可见: ${await dmService.page.evaluate(el => el.offsetParent !== null, input)}`);
        console.log('');
      } catch (e) {
        console.log(`输入元素 ${i + 1}: 分析失败 - ${e.message}`);
      }
    }
    
    // 尝试不同的输入框查找方式
    console.log('🔍 尝试不同的输入框查找方式...');
    
    const inputSelectors = [
      'div[contenteditable="true"]',
      'textarea',
      'input[type="text"]',
      'input[placeholder*="Message"]',
      'input[placeholder*="message"]'
    ];
    
    for (const selector of inputSelectors) {
      try {
        const elements = await dmService.page.$$(selector);
        console.log(`选择器 "${selector}": 找到 ${elements.length} 个元素`);
        
        for (let j = 0; j < Math.min(elements.length, 3); j++) {
          const element = elements[j];
          const isVisible = await dmService.page.evaluate(el => el.offsetParent !== null, element);
          console.log(`  元素 ${j + 1}: 可见=${isVisible}`);
        }
      } catch (e) {
        console.log(`选择器 "${selector}": 失败 - ${e.message}`);
      }
    }
    
    // 尝试手动发送消息
    console.log('📝 尝试手动输入消息...');
    
    // 查找contenteditable元素
    const contentEditables = await dmService.page.$$('div[contenteditable="true"]');
    if (contentEditables.length > 0) {
      const inputElement = contentEditables[0];
      console.log('✅ 找到contenteditable输入框');
      
      try {
        await inputElement.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 输入消息
        await dmService.page.type(inputElement, 'Hello', { delay: 50 });
        console.log('✅ 成功输入消息');
        
        // 拍摄输入后的截图
        await dmService.screenshot('debug-after-message-input.png');
        
        // 尝试发送
        await dmService.page.keyboard.press('Enter');
        console.log('✅ 尝试按Enter发送');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 拍摄发送后的截图
        await dmService.screenshot('debug-after-send.png');
        
      } catch (inputError) {
        console.error('❌ 输入消息失败:', inputError.message);
      }
    } else {
      console.log('❌ 未找到contenteditable输入框');
    }
    
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
debugDMSend().catch(console.error);