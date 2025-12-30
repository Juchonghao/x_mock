require('dotenv').config();
const DMService = require('./src/services/dmService');

async function debugDMOpenIssue() {
  console.log('🔍 调试私信对话框打开问题 - 详细分析页面结构');
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
    
    // 访问用户页面
    const testUser = 'kent236896';
    console.log(`\n🎯 测试用户: @${testUser}`);
    console.log(`🔗 访问用户页面...`);
    
    const userFound = await dmService.searchUserAndOpenDM(testUser);
    
    if (!userFound) {
      console.log(`❌ 无法访问用户页面`);
      return;
    }
    
    // 拍摄用户页面截图
    await dmService.screenshot('debug-user-page-detailed.png');
    console.log('✅ 已访问用户页面');
    
    // 详细分析页面上的所有按钮
    console.log('\n🔍 分析页面上的所有按钮...');
    const allButtons = await dmService.page.$$('button, a[role="button"], div[role="button"]');
    console.log(`找到 ${allButtons.length} 个按钮元素`);
    
    // 显示前10个按钮的详细信息
    for (let i = 0; i < Math.min(10, allButtons.length); i++) {
      try {
        const button = allButtons[i];
        const text = await button.evaluate(el => el.textContent || el.getAttribute('aria-label') || '');
        const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label') || '');
        const role = await button.evaluate(el => el.getAttribute('role') || '');
        
        console.log(`  按钮 ${i + 1}: text="${text}", aria-label="${ariaLabel}", role="${role}"`);
      } catch (e) {
        console.log(`  按钮 ${i + 1}: 获取信息失败`);
      }
    }
    
    // 专门查找消息相关按钮
    console.log('\n💬 专门查找消息相关按钮...');
    const messageSelectors = [
      'a[href*="/messages"]',
      'div[data-testid="DM_Button"]',
      'button[data-testid="DM_Button"]',
      'a[aria-label*="Message"]',
      'button[aria-label*="Message"]',
      'a[aria-label*="私信"]',
      'button[aria-label*="私信"]'
    ];
    
    for (const selector of messageSelectors) {
      try {
        const elements = await dmService.page.$$(selector);
        console.log(`选择器 "${selector}": 找到 ${elements.length} 个元素`);
        
        if (elements.length > 0) {
          const element = elements[0];
          const text = await element.evaluate(el => el.textContent || el.getAttribute('aria-label') || '');
          console.log(`  - 第一个元素文本: "${text}"`);
          
          // 尝试点击这个按钮
          console.log(`  尝试点击...`);
          await element.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 拍摄点击后的截图
          await dmService.screenshot(`debug-after-click-${selector.replace(/[^\w]/g, '_')}.png`);
          
          // 检查是否打开了私信对话框
          const dialogElements = await dmService.page.$$('div[contenteditable="true"], textarea, input[type="text"]');
          console.log(`  点击后找到 ${dialogElements.length} 个可能的输入框`);
          
          if (dialogElements.length > 0) {
            console.log('✅ 看起来点击后出现了输入框，可能打开了私信对话框');
            break;
          } else {
            console.log('❌ 点击后没有找到输入框');
          }
        }
      } catch (e) {
        console.log(`选择器 "${selector}": 出错 - ${e.message}`);
      }
    }
    
    // 检查页面是否有变化
    console.log('\n📸 拍摄最终页面状态截图...');
    await dmService.screenshot('debug-final-page-state.png');
    
    // 分析页面URL变化
    const currentUrl = dmService.page.url();
    console.log(`🌐 当前页面URL: ${currentUrl}`);
    
    // 检查是否有模态框或弹窗
    console.log('\n🔍 检查是否有模态框或弹窗...');
    const modals = await dmService.page.$$('[role="dialog"], .modal, [data-testid*="modal"], [aria-modal="true"]');
    console.log(`找到 ${modals.length} 个可能的模态框`);
    
    if (modals.length > 0) {
      console.log('✅ 检测到模态框，可能有弹窗出现');
    }
    
    // 检查页面中是否有私信相关的文本
    console.log('\n📝 检查页面中是否有私信相关文本...');
    const pageContent = await dmService.page.content();
    const dmRelatedText = ['message', '私信', 'DM', 'send', '发送'];
    
    for (const text of dmRelatedText) {
      const count = (pageContent.toLowerCase().match(new RegExp(text, 'g')) || []).length;
      if (count > 0) {
        console.log(`  文本 "${text}": 出现 ${count} 次`);
      }
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
debugDMOpenIssue().catch(console.error);