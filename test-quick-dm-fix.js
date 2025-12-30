#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

const DMService = require('./src/services/dmService');

async function testQuickDMFix() {
  console.log('🚀 测试私信功能快速修复...');
  
  const dmService = new DMService();
  
  try {
    // 初始化
    console.log('🔧 初始化DM服务...');
    await dmService.initialize();
    await dmService.screenshot('quick-test-start.png');
    
    // 目标用户
    const targetUser = 'kent236896';
    
    console.log(`\n📝 测试向 @${targetUser} 发送私信...`);
    
    // 直接导航到私信页面并处理PIN验证
    console.log('🔐 处理PIN验证...');
    await dmService.page.goto('https://x.com/messages', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 检查是否需要PIN验证
    const isOnPinPage = await dmService.page.evaluate(() => {
      const pinPage = document.querySelector('input[name="pin"]') || 
                     document.querySelector('[data-testid="pin"]') ||
                     document.querySelector('input[placeholder*="pin"]') ||
                     document.querySelector('input[placeholder*="PIN"]');
      return !!pinPage;
    });
    
    if (isOnPinPage) {
      console.log('🔐 检测到PIN验证页面，自动输入PIN...');
      await dmService.screenshot('pin-verification-page.png');
      
      const pinSuccess = await dmService.handlePinVerification('0000');
      if (!pinSuccess) {
        console.log('❌ PIN验证失败，尝试备用方法...');
        await dmService.fallbackPinInput();
      }
    }
    
    // 创建新对话
    console.log('💬 创建新对话...');
    const newChatSuccess = await dmService.createNewConversation();
    
    if (newChatSuccess) {
      console.log('✅ 新对话创建成功');
      
      // 搜索并选择用户
      console.log('👤 搜索并选择用户...');
      const userSelected = await dmService.searchAndSelectUserInChat(targetUser);
      
      if (userSelected) {
        console.log('✅ 用户选择成功');
        
        // 尝试直接进入聊天对话框 - 简化的导航方式
        console.log('🔗 尝试直接进入聊天对话框...');
        
        // 重新导航到消息页面并创建新对话
        await dmService.page.goto(`https://x.com/messages`, {
          waitUntil: 'networkidle2',
          timeout: 20000
        });
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot('messages-page.png');
        
        // 查找并点击新建对话按钮
        const newChatButton = await dmService.page.$('button[data-testid="dm-empty-conversation-new-chat-button"], button[data-testid="dm-new-chat-button"]');
        if (newChatButton) {
          await newChatButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          await dmService.screenshot('new-chat-opened.png');
          
          // 搜索用户
          const searchInput = await dmService.page.$('input[data-testid="new-dm-search-input"]');
          if (searchInput) {
            await searchInput.click();
            await dmService.page.keyboard.type(targetUser);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await dmService.screenshot('user-search-typed.png');
            
            // 点击搜索结果
            const searchResults = await dmService.page.$$('div[data-testid*="user"][data-testid*="suggestion"]');
            if (searchResults.length > 0) {
              await searchResults[0].click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              await dmService.screenshot('user-selected.png');
            }
          }
        }
        
        await dmService.screenshot('direct-chat-page.png');
        
        // 查找并测试聊天输入框
        console.log('🔍 测试聊天输入框检测...');
        const chatInput = await dmService.findChatInput();
        
        if (chatInput) {
          console.log('✅ 聊天输入框检测成功！');
          
          // 测试发送消息
          const message = `你好 @${targetUser}！这是修复后的测试私信。🤖`;
          console.log(`📝 发送测试消息: "${message}"`);
          
          // 输入消息
          await chatInput.click();
          await dmService.page.keyboard.type(message);
          await dmService.screenshot('message-typed.png');
          
          // 查找发送按钮
          const sendButton = await dmService.findSendButton();
          if (sendButton) {
            console.log('✅ 找到发送按钮');
            await sendButton.click();
            await dmService.screenshot('after-send-click.png');
            
            console.log('✅ 消息发送成功！');
          } else {
            console.log('⚠️ 未找到发送按钮，但消息已输入');
          }
          
        } else {
          console.log('❌ 聊天输入框检测失败');
        }
        
      } else {
        console.log('❌ 用户选择失败');
      }
      
    } else {
      console.log('❌ 新对话创建失败');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    await dmService.screenshot('quick-test-error.png');
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    await dmService.cleanup();
    console.log('✅ 快速测试完成');
  }
}

// 运行测试
testQuickDMFix().catch(console.error);