#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

const DMService = require('./src/services/dmService');

async function testFixedDMFlow() {
  console.log('🚀 开始测试修复后的私信发送流程...');
  
  const dmService = new DMService();
  
  try {
    // 初始化
    console.log('🔧 初始化DM服务...');
    await dmService.initialize();
    await dmService.screenshot('test-start.png');
    
    // 先检查是否需要PIN验证
    console.log('🔐 检查PIN验证状态...');
    await dmService.screenshot('before-pin-check.png');
    
    // 导航到私信页面检查PIN验证
    await dmService.page.goto('https://x.com/messages', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    await dmService.screenshot('after-navigation-to-messages.png');
    
    // 检查是否出现PIN验证页面
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
      
      // 自动输入PIN 0000
      const pinSuccess = await dmService.handlePinVerification('0000');
      if (!pinSuccess) {
        console.log('❌ PIN验证失败，尝试备用方法...');
        await dmService.fallbackPinInput();
      }
      
      await dmService.screenshot('after-pin-verification.png');
    } else {
      console.log('✅ 无需PIN验证或已验证');
    }
    
    // 目标用户
    const targetUser = 'kent236896';
    const message = `你好 @${targetUser}！这是来自X自动化机器人的测试私信。祝你一切顺利！ 🤖`;
    
    console.log(`\n📝 测试向 @${targetUser} 发送私信...`);
    console.log(`💬 消息内容: "${message}"`);
    
    // 发送私信
    const success = await dmService.sendDM(message, targetUser);
    
    if (success) {
      console.log('✅ 私信发送成功！');
    } else {
      console.log('❌ 私信发送失败');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    await dmService.screenshot('test-error.png');
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    await dmService.cleanup();
    console.log('✅ 测试完成');
  }
}

// 运行测试
testFixedDMFlow().catch(console.error);