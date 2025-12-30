#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

const DMService = require('./src/services/dmService');

async function testUserSearchOnly() {
  console.log('🚀 测试用户搜索功能...');
  
  const dmService = new DMService();
  
  try {
    // 初始化
    console.log('🔧 初始化DM服务...');
    await dmService.initialize();
    await dmService.screenshot('search-test-start.png');
    
    // 直接导航到聊天页面并创建新对话
    console.log('🔄 导航到聊天页面...');
    await dmService.page.goto('https://x.com/i/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查是否需要PIN验证
    const currentUrl = dmService.page.url();
    console.log('🔍 当前URL:', currentUrl);
    
    if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
      console.log('🔐 需要PIN验证，处理PIN验证...');
      await dmService.handlePinVerification();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    await dmService.screenshot('chat-page.png');
    
    // 查找并点击新建对话按钮
    console.log('💬 创建新对话...');
    const newChatButton = await dmService.page.$('button[data-testid="dm-empty-conversation-new-chat-button"]');
    if (newChatButton) {
      await newChatButton.click();
      console.log('✅ 点击新建对话按钮');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await dmService.screenshot('after-new-chat-click.png');
      
      // 测试用户搜索
      console.log('🔍 开始用户搜索测试...');
      const username = 'kent236896';
      
      // 查找搜索输入框
      const searchInput = await dmService.page.$('input[data-testid="new-dm-search-input"]');
      if (searchInput) {
        console.log('✅ 找到搜索输入框');
        
        // 点击输入框并输入用户名
        await searchInput.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📝 输入用户名...');
        try {
          // 使用更安全的输入方法
          await searchInput.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 清空输入框
          await dmService.page.keyboard.down('Control');
          await dmService.page.keyboard.press('A');
          await dmService.page.keyboard.up('Control');
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 输入用户名
          await dmService.page.keyboard.type(username, { delay: 100 });
          console.log('✅ 用户名输入成功');
          await new Promise(resolve => setTimeout(resolve, 2000));
          await dmService.screenshot('after-typing-username.png');
        } catch (typeError) {
          console.log('❌ 输入用户名失败，尝试备用方法:', typeError.message);
          
          // 备用输入方法
          try {
            await searchInput.focus();
            await new Promise(resolve => setTimeout(resolve, 500));
            await dmService.page.keyboard.type(username);
            console.log('✅ 使用备用方法输入用户名成功');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await dmService.screenshot('after-typing-username-backup.png');
          } catch (backupError) {
            console.log('❌ 备用输入方法也失败:', backupError.message);
          }
        }
        
        // 查找搜索结果
        console.log('🔍 查找搜索结果...');
        try {
          const searchResults = await dmService.page.$$('div[data-testid*="user"]');
          console.log(`找到 ${searchResults.length} 个用户搜索结果`);
          
          if (searchResults.length > 0) {
            console.log('✅ 找到搜索结果，尝试点击...');
            await searchResults[0].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await dmService.screenshot('after-search-result-click.png');
          }
        } catch (resultError) {
          console.log('❌ 查找搜索结果失败:', resultError.message);
        }
        
      } else {
        console.log('❌ 未找到搜索输入框');
      }
    } else {
      console.log('❌ 未找到新建对话按钮');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    await dmService.screenshot('search-test-error.png');
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    await dmService.cleanup();
    console.log('✅ 测试完成');
  }
}

// 运行测试
testUserSearchOnly().catch(console.error);