require('dotenv').config();
const DMService = require('./src/services/dmService');

async function debugUserSelection() {
  console.log('🔍 详细调试用户选择和聊天输入框问题');
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
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待更长时间让页面完全加载
    
    // 拍摄初始聊天页面截图
    await dmService.screenshot('debug-chat-initial.png');
    console.log('✅ 已访问聊天页面并截图');
    
    // 分析聊天页面的完整结构
    console.log('\n🔍 分析聊天页面完整结构...');
    
    // 查找所有可能的输入元素
    const allInputs = await dmService.page.$$('input, textarea, div[contenteditable="true"]');
    console.log(`找到 ${allInputs.length} 个输入元素:`);
    
    for (let i = 0; i < allInputs.length; i++) {
      try {
        const input = allInputs[i];
        const type = await input.evaluate(el => el.type || el.tagName);
        const placeholder = await input.evaluate(el => el.placeholder || el.getAttribute('placeholder') || '');
        const contentEditable = await input.evaluate(el => el.contentEditable);
        const ariaLabel = await input.evaluate(el => el.getAttribute('aria-label') || '');
        const className = await input.evaluate(el => el.className || '');
        const id = await input.evaluate(el => el.id || '');
        
        console.log(`  输入元素 ${i + 1}: type="${type}", placeholder="${placeholder}", contentEditable="${contentEditable}", ariaLabel="${ariaLabel}"`);
        console.log(`    class="${className}", id="${id}"`);
      } catch (e) {
        console.log(`  输入元素 ${i + 1}: 获取信息失败`);
      }
    }
    
    // 查找用户搜索功能
    console.log('\n👤 查找用户搜索功能...');
    
    // 查找所有可能用于搜索的输入框
    const searchInputs = await dmService.page.$$('input[type="text"], input[placeholder*=""], input[placeholder]');
    console.log(`找到 ${searchInputs.length} 个文本输入框`);
    
    let userSearchInput = null;
    
    for (let i = 0; i < searchInputs.length; i++) {
      try {
        const input = searchInputs[i];
        const placeholder = await input.evaluate(el => el.placeholder || '');
        const ariaLabel = await input.evaluate(el => el.getAttribute('aria-label') || '');
        const className = await input.evaluate(el => el.className || '');
        
        console.log(`  文本输入框 ${i + 1}: placeholder="${placeholder}", ariaLabel="${ariaLabel}"`);
        console.log(`    class="${className}"`);
        
        // 检查这个输入框是否是用于搜索用户的
        if (placeholder.toLowerCase().includes('search') || 
            placeholder.toLowerCase().includes('find') ||
            placeholder === '' ||
            ariaLabel.toLowerCase().includes('search') ||
            className.toLowerCase().includes('search')) {
          console.log(`  ✅ 可能是用户搜索输入框`);
          userSearchInput = input;
          break;
        }
      } catch (e) {
        console.log(`  文本输入框 ${i + 1}: 检查失败`);
      }
    }
    
    if (!userSearchInput) {
      console.log('❌ 未找到明显的用户搜索输入框');
      
      // 尝试查找所有可点击的元素，看是否有"新建对话"或类似按钮
      console.log('\n🔍 查找新建对话或用户选择相关的按钮...');
      const clickableElements = await dmService.page.$$('button, a, div[role="button"], div[tabindex]');
      
      for (let i = 0; i < clickableElements.length; i++) {
        try {
          const element = clickableElements[i];
          const text = await element.evaluate(el => el.textContent || el.getAttribute('aria-label') || '');
          
          if (text.toLowerCase().includes('new') || 
              text.toLowerCase().includes('compose') ||
              text.toLowerCase().includes('start') ||
              text.toLowerCase().includes('chat') ||
              text.toLowerCase().includes('message')) {
            console.log(`  找到可能的相关按钮: "${text}"`);
            
            // 尝试点击这个按钮
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 拍摄点击后的截图
            await dmService.screenshot(`debug-after-click-${i + 1}.png`);
            
            // 重新检查输入框
            const newInputs = await dmService.page.$$('input, textarea, div[contenteditable="true"]');
            console.log(`  点击后找到 ${newInputs.length} 个输入元素`);
            
            if (newInputs.length > allInputs.length) {
              console.log('✅ 点击后出现了新的输入元素！');
              
              // 尝试在新输入框中输入用户名
              const newInput = newInputs[allInputs.length]; // 假设新出现的输入框是用户搜索框
              if (newInput) {
                await newInput.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await dmService.page.type(newInput, 'kent236896', { delay: 100 });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 拍摄输入用户名后的截图
                await dmService.screenshot('debug-after-username-input.png');
                
                // 检查是否出现了用户列表
                const userListElements = await dmService.page.$$('div[role="option"], [data-testid*="user"], [data-testid*="User"]');
                if (userListElements.length > 0) {
                  console.log(`✅ 找到用户列表选项: ${userListElements.length} 个`);
                  
                  // 点击第一个用户选项
                  await userListElements[0].click();
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  // 拍摄选择用户后的截图
                  await dmService.screenshot('debug-after-user-selection.png');
                  
                  // 检查是否出现了聊天输入框
                  const chatInputs = await dmService.page.$$('input, textarea, div[contenteditable="true"]');
                  console.log(`选择用户后找到 ${chatInputs.length} 个输入元素`);
                  
                  // 尝试发送测试消息
                  if (chatInputs.length > 0) {
                    const chatInput = chatInputs[chatInputs.length - 1]; // 假设最后一个是聊天输入框
                    console.log('✅ 尝试在聊天输入框中输入消息...');
                    
                    await chatInput.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await dmService.page.type(chatInput, 'Hello from automated test!', { delay: 50 });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 拍摄输入消息后的截图
                    await dmService.screenshot('debug-after-message-input.png');
                    
                    // 尝试发送消息
                    await dmService.page.keyboard.press('Enter');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 拍摄发送后的截图
                    await dmService.screenshot('debug-after-message-send.png');
                    
                    console.log('✅ 消息发送尝试完成！');
                  }
                }
              }
              
              break;
            }
          }
        } catch (e) {
          // 忽略错误，继续检查下一个元素
        }
      }
    } else {
      console.log('✅ 找到用户搜索输入框，开始测试流程...');
      
      // 在用户搜索输入框中输入用户名
      await userSearchInput.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 清除现有内容
      await dmService.page.keyboard.down('Control');
      await dmService.page.keyboard.press('A');
      await dmService.page.keyboard.up('Control');
      
      // 输入用户名
      await dmService.page.type(userSearchInput, 'kent236896', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 3000)); // 等待搜索结果出现
      
      // 拍摄输入用户名后的截图
      await dmService.screenshot('debug-search-results.png');
      
      // 检查是否出现了用户选项
      const userOptions = await dmService.page.$$('div[role="option"], [data-testid*="user"], [data-testid*="User"], [aria-label*="user"]');
      console.log(`找到 ${userOptions.length} 个用户选项`);
      
      if (userOptions.length > 0) {
        console.log('✅ 点击第一个用户选项...');
        await userOptions[0].click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 拍摄选择用户后的截图
        await dmService.screenshot('debug-user-selected.png');
        
        // 现在检查聊天输入框
        const finalInputs = await dmService.page.$$('input, textarea, div[contenteditable="true"]');
        console.log(`选择用户后找到 ${finalInputs.length} 个输入元素`);
        
        if (finalInputs.length > searchInputs.length) {
          console.log('✅ 用户选择成功，应该可以聊天了！');
          
          // 尝试发送测试消息
          const chatInput = finalInputs[finalInputs.length - 1];
          await chatInput.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          await dmService.page.type(chatInput, 'Hello! This is a test message.', { delay: 50 });
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 拍摄输入消息后的截图
          await dmService.screenshot('debug-final-message-input.png');
          
          // 发送消息
          await dmService.page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 拍摄发送后的截图
          await dmService.screenshot('debug-final-message-sent.png');
          
          console.log('✅ 完整流程测试完成！');
        }
      }
    }
    
    // 拍摄最终状态截图
    await dmService.screenshot('debug-final-state.png');
    
    // 获取当前URL
    const currentUrl = dmService.page.url();
    console.log(`🌐 最终页面URL: ${currentUrl}`);
    
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
debugUserSelection().catch(console.error);