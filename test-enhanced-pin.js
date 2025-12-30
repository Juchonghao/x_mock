const DMService = require('./src/services/dmService');

/**
 * 增强版PIN验证测试
 * 解决PIN验证后仍在页面的问题
 */

async function testEnhancedPin() {
  console.log('🚀 增强版PIN验证测试');
  console.log('=' * 70);
  
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
    
    console.log('✅ 登录状态检查完成');
    
    // 导航到PIN验证页面
    console.log('🔐 导航到PIN验证页面...');
    await dmService.page.goto('https://x.com/i/chat/pin/recovery', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 拍摄初始状态截图
    await dmService.screenshot('enhanced-pin-initial.png');
    
    // 执行增强版PIN验证
    const pinResult = await enhancedPinVerification(dmService);
    
    console.log(`\n📊 PIN验证结果: ${pinResult ? '成功' : '失败'}`);
    
    if (pinResult) {
      console.log('✅ PIN验证成功，开始处理后续流程...');
      
      // 等待页面跳转
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // 拍摄PIN验证后的截图
      await dmService.screenshot('enhanced-pin-success.png');
      
      // 检查当前URL
      const currentUrl = dmService.page.url();
      console.log(`PIN验证后URL: ${currentUrl}`);
      
      if (!currentUrl.includes('/pin')) {
        console.log('✅ 成功离开PIN验证页面');
        
        // 尝试访问聊天页面
        console.log('💬 尝试访问聊天页面...');
        await dmService.page.goto('https://x.com/i/chat', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot('enhanced-chat-page.png');
        
        console.log('✅ 可以开始私信流程');
        
      } else {
        console.log('⚠️ 仍在PIN页面，尝试其他方法...');
        await enhancedExitPinPage(dmService);
      }
      
    } else {
      console.log('❌ PIN验证失败，尝试备用方案...');
      await enhancedExitPinPage(dmService);
    }
    
    // 拍摄最终状态
    await dmService.screenshot('enhanced-test-final.png');
    
    console.log('\n📊 增强版测试总结:');
    console.log('- ✅ 增强版PIN验证逻辑测试完成');
    console.log('- ✅ 多种确认按钮选择器测试');
    console.log('- ✅ 错误恢复机制测试');
    console.log('- ✅ 页面状态检查优化');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    await dmService.cleanup();
    console.log('✅ 测试完成');
  }
}

/**
 * 增强版PIN验证逻辑
 * 包含更多选择器和更好的错误处理
 */
async function enhancedPinVerification(dmService) {
  console.log('\n🔐 执行增强版PIN验证逻辑...');
  
  try {
    // 1. 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. 查找PIN输入框 - 扩展的选择器列表
    const pinSelectors = [
      'input[data-testid*="pin"]',
      'input[data-testid="pin-input"]',
      'input[placeholder*="PIN"]',
      'input[placeholder*="pin"]',
      'input[placeholder*="Code"]',
      'input[placeholder*="code"]',
      'input[placeholder*="verification"]',
      'input[type="text"]',
      'input[maxlength="6"]',
      'input[maxlength="4"]',
      'input[name*="pin"]',
      'input[id*="pin"]'
    ];
    
    let pinInput = null;
    console.log('🔍 查找PIN输入框...');
    
    for (const selector of pinSelectors) {
      try {
        pinInput = await dmService.page.$(selector);
        if (pinInput) {
          console.log(`✅ 找到PIN输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!pinInput) {
      console.log('❌ 未找到PIN输入框');
      return false;
    }
    
    // 3. 清空并输入PIN码
    console.log('🔐 清空输入框并输入PIN码 0000...');
    await pinInput.click();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 清空内容
    await dmService.page.keyboard.down('Control');
    await dmService.page.keyboard.press('A');
    await dmService.page.keyboard.up('Control');
    await dmService.page.keyboard.press('Backspace');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 输入PIN码
    try {
      await pinInput.focus();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 使用page.type方法
      await dmService.page.type('input[type="text"]', '0000', { delay: 150 });
      console.log('✅ PIN码输入完成');
    } catch (typeError) {
      console.log('使用page.type失败，尝试键盘输入...');
      
      // 键盘输入方法
      await pinInput.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      for (const digit of '0000') {
        await dmService.page.keyboard.press(digit);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('✅ 使用键盘输入PIN码');
    }
    
    // 4. 等待页面处理
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. 查找确认按钮 - 扩展的选择器列表
    const confirmSelectors = [
      // X/Twitter特定的按钮
      'button[data-testid="pin-submit"]',
      'button[data-testid="Continue"]',
      'button[data-testid="Next"]',
      'button[data-testid="Submit"]',
      'button[data-testid="Verify"]',
      'button[data-testid="pin-continue"]',
      
      // 通用选择器
      'button[type="submit"]',
      'button[aria-label*="Continue"]',
      'button[aria-label*="Next"]',
      'button[aria-label*="Verify"]',
      'button[aria-label*="确认"]',
      'button[aria-label*="继续"]',
      
      // 文本匹配
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("Verify")',
      'button:has-text("确认")',
      'button:has-text("继续")',
      'button:has-text("Submit")',
      
      // div按钮
      'div[role="button"]:has-text("Continue")',
      'div[role="button"]:has-text("Next")',
      'div[role="button"]:has-text("Verify")',
      
      // 最后的选项
      'button:last-child',
      'button:not([disabled])'
    ];
    
    let confirmButton = null;
    console.log('🔍 查找确认按钮...');
    
    for (const selector of confirmSelectors) {
      try {
        confirmButton = await dmService.page.$(selector);
        if (confirmButton) {
          // 检查按钮是否可用
          const isDisabled = await confirmButton.evaluate(el => el.disabled);
          if (!isDisabled) {
            console.log(`✅ 找到可用的确认按钮: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // 6. 点击确认按钮
    if (confirmButton) {
      console.log('✅ 点击确认按钮');
      await confirmButton.click();
    } else {
      console.log('⚠️ 未找到确认按钮，尝试按Enter键');
      await dmService.page.keyboard.press('Enter');
    }
    
    // 7. 等待验证处理
    console.log('⏳ 等待PIN验证处理...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 8. 拍摄验证后截图
    await dmService.screenshot('enhanced-pin-after-submit.png');
    
    // 9. 检查页面状态
    const currentUrl = dmService.page.url();
    console.log(`当前URL: ${currentUrl}`);
    
    // 检查是否有错误信息
    try {
      const errorElements = await dmService.page.$$('div, span, p');
      for (const element of errorElements) {
        const text = await element.evaluate(el => el.textContent || el.innerText);
        if (text && (text.includes('Invalid') || text.includes('错误') || text.includes('invalid'))) {
          console.log(`⚠️ 发现错误信息: ${text}`);
        }
      }
    } catch (e) {
      // 忽略错误检查失败
    }
    
    // 10. 判断验证是否成功
    if (currentUrl.includes('/pin') || currentUrl.includes('/verify')) {
      console.log('⚠️ 仍在PIN验证页面');
      return false;
    } else {
      console.log('✅ 成功离开PIN验证页面');
      return true;
    }
    
  } catch (error) {
    console.error('❌ PIN验证过程出错:', error.message);
    await dmService.screenshot('enhanced-pin-error.png');
    return false;
  }
}

/**
 * 增强版退出PIN页面方法
 * 提供多种备用方案
 */
async function enhancedExitPinPage(dmService) {
  console.log('\n🔄 尝试多种方法退出PIN页面...');
  
  try {
    // 方法1: 强制导航到主页
    console.log('方法1: 导航到主页...');
    await dmService.page.goto('https://x.com/home', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('enhanced-exit-method1.png');
    
    // 检查URL
    let currentUrl = dmService.page.url();
    if (!currentUrl.includes('/pin')) {
      console.log('✅ 方法1成功 - 已离开PIN页面');
      return true;
    }
    
    // 方法2: 导航到聊天页面
    console.log('方法2: 导航到聊天页面...');
    await dmService.page.goto('https://x.com/i/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('enhanced-exit-method2.png');
    
    currentUrl = dmService.page.url();
    if (!currentUrl.includes('/pin')) {
      console.log('✅ 方法2成功 - 已离开PIN页面');
      return true;
    }
    
    // 方法3: 刷新页面
    console.log('方法3: 刷新页面...');
    await dmService.page.reload({
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('enhanced-exit-method3.png');
    
    currentUrl = dmService.page.url();
    if (!currentUrl.includes('/pin')) {
      console.log('✅ 方法3成功 - 已离开PIN页面');
      return true;
    }
    
    console.log('❌ 所有方法都失败，仍在PIN页面');
    return false;
    
  } catch (error) {
    console.error('❌ 退出PIN页面时出错:', error.message);
    return false;
  }
}

// 运行测试
testEnhancedPin().catch(console.error);