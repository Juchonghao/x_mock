require('dotenv').config();
const DMService = require('./src/services/dmService');

async function debugChatPage() {
  console.log('🔍 调试聊天页面 - 详细分析聊天页面结构');
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
    
    console.log('✅ 登录状态检查完成');
    
    // 直接访问聊天页面
    console.log('💬 直接访问聊天页面...');
    await dmService.page.goto('https://x.com/i/chat', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 拍摄聊天页面截图
    await dmService.screenshot('debug-chat-page.png');
    console.log('✅ 已访问聊天页面');
    
    // 分析聊天页面的结构
    console.log('\n🔍 分析聊天页面结构...');
    
    // 查找所有可能的输入框
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      'div[contenteditable="true"]',
      'input[placeholder*="Message"]',
      'textarea[placeholder*="Message"]',
      'div[placeholder*="Message"]'
    ];
    
    for (const selector of inputSelectors) {
      try {
        const inputs = await dmService.page.$$(selector);
        console.log(`选择器 "${selector}": 找到 ${inputs.length} 个输入框`);
        
        if (inputs.length > 0) {
          const input = inputs[0];
          const placeholder = await input.evaluate(el => el.placeholder || el.getAttribute('placeholder') || '');
          const text = await input.evaluate(el => el.textContent || '');
          console.log(`  - 占位符: "${placeholder}", 文本: "${text}"`);
        }
      } catch (e) {
        console.log(`选择器 "${selector}": 出错 - ${e.message}`);
      }
    }
    
    // 查找搜索或用户选择相关的元素
    console.log('\n👤 查找用户选择相关的元素...');
    const userSearchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="Find"]',
      'input[placeholder*="find"]',
      'div[placeholder*="Search"]',
      'div[placeholder*="search"]',
      '[data-testid="SearchBox_Input"]',
      'input[type="text"][placeholder*=""]'  // 查找所有有占位符的文本输入框
    ];
    
    for (const selector of userSearchSelectors) {
      try {
        const inputs = await dmService.page.$$(selector);
        console.log(`搜索选择器 "${selector}": 找到 ${inputs.length} 个输入框`);
        
        if (inputs.length > 0) {
          const input = inputs[0];
          const placeholder = await input.evaluate(el => el.placeholder || el.getAttribute('placeholder') || '');
          console.log(`  - 占位符: "${placeholder}"`);
          
          // 尝试在这个输入框中输入用户名
          if (placeholder.toLowerCase().includes('search') || placeholder.toLowerCase().includes('find') || placeholder === '') {
            console.log('  尝试在这个输入框中输入用户名...');
            
            await input.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 清除现有内容并输入用户名
            await dmService.page.keyboard.down('Control');
            await dmService.page.keyboard.press('A');
            await dmService.page.keyboard.up('Control');
            
            await dmService.page.type(input, 'kent236896', { delay: 100 });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 拍摄输入后的截图
            await dmService.screenshot('debug-after-username-input.png');
            
            // 检查是否出现了用户列表
            const userListSelectors = [
              'div[role="listbox"]',
              'div[role="option"]',
              '[data-testid*="user"]',
              '[data-testid*="User"]',
              'div[aria-label*="user"]'
            ];
            
            let foundUserList = false;
            for (const userSelector of userListSelectors) {
              const userElements = await dmService.page.$$(userSelector);
              if (userElements.length > 0) {
                console.log(`  ✅ 找到用户列表: ${userSelector} (${userElements.length} 个元素)`);
                foundUserList = true;
                
                // 点击第一个用户
                const firstUser = userElements[0];
                await firstUser.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 拍摄选择用户后的截图
                await dmService.screenshot('debug-after-user-select.png');
                
                // 检查是否出现了聊天输入框
                const chatInputs = await dmService.page.$$('div[contenteditable="true"], textarea, input[type="text"]');
                console.log(`  选择用户后找到 ${chatInputs.length} 个可能的聊天输入框`);
                
                if (chatInputs.length > 0) {
                  console.log('✅ 用户选择成功，应该可以输入消息了');
                  foundUserList = true;
                }
                
                break;
              }
            }
            
            if (!foundUserList) {
              console.log('  ❌ 输入用户名后没有找到用户列表');
            }
            
            break;  // 只尝试第一个符合条件的输入框
          }
        }
      } catch (e) {
        console.log(`搜索选择器 "${selector}": 出错 - ${e.message}`);
      }
    }
    
    // 分析页面上的所有链接和按钮
    console.log('\n🔗 分析页面上的所有链接...');
    const links = await dmService.page.$$('a');
    console.log(`找到 ${links.length} 个链接`);
    
    // 查找可能指向用户页面的链接
    const userLinks = [];
    for (let i = 0; i < Math.min(20, links.length); i++) {
      try {
        const link = links[i];
        const href = await link.evaluate(el => el.href || '');
        const text = await link.evaluate(el => el.textContent || '');
        
        if (href.includes('/') && !href.includes('x.com') && text) {
          userLinks.push({ href, text });
          console.log(`  链接 ${i + 1}: ${text} -> ${href}`);
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    // 拍摄最终状态截图
    console.log('\n📸 拍摄最终聊天页面状态截图...');
    await dmService.screenshot('debug-chat-final.png');
    
    // 获取当前URL
    const currentUrl = dmService.page.url();
    console.log(`🌐 当前页面URL: ${currentUrl}`);
    
    // 检查页面是否有聊天相关的元素
    const chatElements = await dmService.page.$$('[data-testid*="chat"], [data-testid*="Chat"], [data-testid*="message"], [data-testid*="Message"]');
    console.log(`📝 找到 ${chatElements.length} 个聊天相关的元素`);
    
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
debugChatPage().catch(console.error);