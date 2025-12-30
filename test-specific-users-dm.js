#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

const DMService = require('./src/services/dmService');

/**
 * 测试给特定用户发送私信
 * 目标用户: kent236896, allen180929, fred_0201, Alex09936200
 */
async function testSpecificUsersDM() {
  console.log('🚀 开始测试给特定用户发送私信');
  console.log('🎯 目标用户: kent236896, allen180929, fred_0201, Alex09936200');
  console.log('=' .repeat(70));

  const dmService = new DMService();
  
  // 设置目标用户
  dmService.targetUsers = [
    'kent236896',
    'allen180929', 
    'fred_0201',
    'Alex09936200'
  ];
  
  // 设置自定义消息
  dmService.message = '你好！这是一条来自X自动化机器人的测试私信。希望你一切顺利！🤖';

  const testResults = {
    totalUsers: dmService.targetUsers.length,
    successCount: 0,
    failedUsers: [],
    successUsers: []
  };

  try {
    // 初始化服务
    console.log('📡 初始化私信服务...');
    await dmService.initialize();
    console.log('✅ 服务初始化完成');
    
    // 注入认证cookies
    console.log('\n🍪 注入认证cookies...');
    await dmService.injectCookies('https://x.com');
    console.log('✅ Cookies注入完成');
    
    // 检查登录状态
    console.log('\n🔍 检查登录状态...');
    const isLoggedIn = await dmService.checkLoginStatus();
    
    if (!isLoggedIn) {
      console.log('❌ 用户未登录，终止测试');
      return testResults;
    }
    
    console.log('✅ 登录状态检查完成');
    
    // 导航到聊天页面（可能触发PIN验证）
    console.log('\n💬 导航到聊天页面...');
    await dmService.page.goto('https://x.com/i/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('specific-users-chat-initial.png');
    
    // 检查是否需要PIN验证
    console.log('\n🔐 检查PIN验证需求...');
    const currentUrl = dmService.page.url();
    
    if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
      console.log('⚠️ 检测到PIN验证页面，执行PIN验证...');
      
      const pinResult = await dmService.handlePinVerification();
      
      if (pinResult) {
        console.log('✅ PIN验证成功，继续私信流程...');
        
        // 等待页面跳转完成
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 重新导航到聊天页面
        await dmService.page.goto('https://x.com/i/chat', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot('specific-users-after-pin-success.png');
        
      } else {
        console.log('❌ PIN验证失败，但尝试继续私信流程...');
        await dmService.screenshot('specific-users-pin-failed-continue.png');
      }
    } else {
      console.log('✅ 无需PIN验证，直接进行私信流程');
    }
    
    // 给每个用户发送私信
    console.log(`\n📝 开始给 ${dmService.targetUsers.length} 个用户发送私信...`);

    for (let i = 0; i < dmService.targetUsers.length; i++) {
      const username = dmService.targetUsers[i];
      console.log(`\n--- 处理用户 ${i + 1}/${dmService.targetUsers.length}: @${username} ---`);
      
      try {
        // 导航到用户页面
        console.log(`🔗 访问用户 @${username} 的页面...`);
        await dmService.page.goto(`https://x.com/${username}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot(`specific-user-${username}-page.png`);
        
        // 检查用户是否存在
        const pageContent = await dmService.page.content();
        if (pageContent.includes('Sorry, this page does not exist') || 
            pageContent.includes('抱歉，此页面不存在') ||
            dmService.page.url().includes('/i/flow/login')) {
          console.log(`❌ 用户 @${username} 不存在或页面无法访问`);
          testResults.failedUsers.push({ username, reason: '用户不存在或页面无法访问' });
          continue;
        }
        
        // 搜索并点击用户（如果需要）
        console.log(`👤 搜索并选择用户 @${username}...`);
        const searchResult = await dmService.searchUserAndOpenDM(username);
        
        if (!searchResult) {
          console.log(`❌ 搜索用户 @${username} 失败`);
          testResults.failedUsers.push({ username, reason: '无法找到用户' });
          continue;
        }
        
        // 打开私信对话框
        console.log(`💬 打开与 @${username} 的私信对话框...`);
        const dmOpened = await dmService.openDMDialog();
        
        if (!dmOpened) {
          console.log(`❌ 无法打开与 @${username} 的私信对话框`);
          testResults.failedUsers.push({ username, reason: '无法打开私信对话框' });
          continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot(`specific-dm-dialog-${username}.png`);
        
        // 准备个性化消息
        const message = `你好 @${username}！这是一条来自X自动化机器人的测试私信。希望你一切顺利！🤖`;
        
        console.log(`📝 发送私信内容: "${message}"`);
        const messageSent = await dmService.sendDM(message, username);
        
        if (messageSent) {
          console.log(`✅ 成功发送私信给 @${username}`);
          testResults.successCount++;
          testResults.successUsers.push(username);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          await dmService.screenshot(`specific-message-sent-${username}.png`);
          
        } else {
          console.log(`❌ 发送私信给 @${username} 失败`);
          testResults.failedUsers.push({ username, reason: '发送失败' });
          
          // 检查是否需要passcode
          const passcodeResult = await dmService.handlePasscode();
          if (passcodeResult) {
            console.log(`🔐 检测到passcode验证，尝试重新发送...`);
            const retryResult = await dmService.sendDM(message, username);
            if (retryResult) {
              console.log(`✅ Passcode验证后成功发送私信给 @${username}`);
              testResults.successCount++;
              testResults.successUsers.push(username);
              // 从失败列表中移除该用户
              testResults.failedUsers = testResults.failedUsers.filter(u => u.username !== username);
            } else {
              console.log(`❌ Passcode验证后仍然发送失败`);
            }
          }
        }
        
        // 在下一个用户之间暂停，避免被限制
        if (i < dmService.targetUsers.length - 1) {
          console.log('⏳ 在处理下一个用户之前暂停5秒...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.error(`❌ 处理用户 @${username} 时出错:`, error.message);
        testResults.failedUsers.push({ username, reason: error.message });
      }
    }
    
    // 生成测试报告
    console.log('\n📊 测试结果报告');
    console.log('=' .repeat(50));
    console.log(`📈 总用户数: ${testResults.totalUsers}`);
    console.log(`✅ 成功发送: ${testResults.successCount}`);
    console.log(`❌ 发送失败: ${testResults.failedUsers.length}`);
    
    if (testResults.successUsers.length > 0) {
      console.log(`\n✅ 成功发送私信的用户:`);
      testResults.successUsers.forEach(user => {
        console.log(`  - @${user}`);
      });
    }
    
    if (testResults.failedUsers.length > 0) {
      console.log(`\n❌ 发送失败的用户:`);
      testResults.failedUsers.forEach(userObj => {
        console.log(`  - @${userObj.username} (原因: ${userObj.reason})`);
      });
    }
    
    const successRate = (testResults.successCount / testResults.totalUsers * 100).toFixed(1);
    console.log(`\n🎯 成功率: ${successRate}%`);
    
    if (testResults.successCount === testResults.totalUsers) {
      console.log('🎉 所有私信发送成功！');
    } else if (testResults.successCount > 0) {
      console.log('👍 部分私信发送成功！');
    } else {
      console.log('😞 所有私信发送失败，需要进一步调试');
    }
    
    // 拍摄最终状态截图
    await dmService.screenshot('specific-users-test-complete.png');
    
  } catch (error) {
    console.error('❌ 测试过程中出现严重错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    await dmService.cleanup();
    console.log('✅ 测试完成');
  }
  
  return testResults;
}

// 运行测试
testSpecificUsersDM().then(results => {
  console.log('\n🏁 测试脚本执行完毕');
  process.exit(0);
}).catch(error => {
  console.error('❌ 测试脚本执行失败:', error);
  process.exit(1);
});