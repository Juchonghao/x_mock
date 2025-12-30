const DMService = require('./src/services/dmService');

/**
 * 最终完整私信流程测试
 * 包含优化后的PIN验证和给四个用户发送私信
 */

async function testFinalDMFlow() {
  console.log('🚀 最终完整私信流程测试');
  console.log('=' * 80);
  
  const dmService = new DMService();
  
  // 要发送私信的目标用户
  const targetUsers = [
    'kent236896',
    'allen180929', 
    'fred_0201',
    'Alex09936200'
  ];
  
  const testResults = {
    totalUsers: targetUsers.length,
    successCount: 0,
    failedUsers: [],
    pinVerificationSuccess: false
  };
  
  try {
    // 1. 初始化服务
    console.log('📡 步骤1: 初始化私信服务...');
    await dmService.initialize();
    console.log('✅ 服务初始化完成');
    
    // 2. 注入认证cookies
    console.log('\n🍪 步骤2: 注入认证cookies...');
    await dmService.injectCookies('https://x.com');
    console.log('✅ Cookies注入完成');
    
    // 3. 检查登录状态
    console.log('\n🔍 步骤3: 检查登录状态...');
    const isLoggedIn = await dmService.checkLoginStatus();
    
    if (!isLoggedIn) {
      console.log('❌ 用户未登录，终止测试');
      return testResults;
    }
    
    console.log('✅ 登录状态检查完成');
    
    // 4. 导航到聊天页面（可能触发PIN验证）
    console.log('\n💬 步骤4: 导航到聊天页面...');
    await dmService.page.goto('https://x.com/i/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dmService.screenshot('final-chat-initial.png');
    
    // 5. 检查是否需要PIN验证
    console.log('\n🔐 步骤5: 检查PIN验证需求...');
    const currentUrl = dmService.page.url();
    
    if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
      console.log('⚠️ 检测到PIN验证页面，执行优化后的PIN验证...');
      
      const pinResult = await dmService.handlePinVerification();
      testResults.pinVerificationSuccess = pinResult;
      
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
        await dmService.screenshot('final-after-pin-success.png');
        
      } else {
        console.log('❌ PIN验证失败，但尝试继续私信流程...');
        await dmService.screenshot('final-pin-failed-continue.png');
      }
    } else {
      console.log('✅ 无需PIN验证，直接进行私信流程');
      testResults.pinVerificationSuccess = true; // 假设成功
    }
    
    // 6. 给每个用户发送私信
    console.log(`\n📝 步骤6: 开始给 ${targetUsers.length} 个用户发送私信...`);
    
    for (let i = 0; i < targetUsers.length; i++) {
      const username = targetUsers[i];
      console.log(`\n--- 处理用户 ${i + 1}/${targetUsers.length}: @${username} ---`);
      
      try {
        // 导航到用户页面
        console.log(`🔍 导航到用户 @${username} 的页面...`);
        await dmService.page.goto(`https://x.com/${username}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot(`final-user-${username}-page.png`);
        
        // 搜索并点击用户（如果需要）
        console.log(`👤 搜索并选择用户 @${username}...`);
        const searchResult = await dmService.searchUserAndOpenDM(username);
        
        if (!searchResult) {
          console.log(`❌ 搜索用户 @${username} 失败`);
          testResults.failedUsers.push(username);
          continue;
        }
        
        // 打开私信对话框
        console.log(`💬 打开与 @${username} 的私信对话框...`);
        const dmOpened = await dmService.openDMDialog();
        
        if (!dmOpened) {
          console.log(`❌ 无法打开与 @${username} 的私信对话框`);
          testResults.failedUsers.push(username);
          continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot(`final-dm-dialog-${username}.png`);
        
        // 输入私信内容
        const message = `你好 @${username}！这是来自X自动化机器人的测试私信。祝你一切顺利！ 🤖`;
        
        console.log(`📝 输入私信内容...`);
        const messageSent = await dmService.sendDM(message, username);
        
        if (messageSent) {
          console.log(`✅ 成功发送私信给 @${username}`);
          testResults.successCount++;
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          await dmService.screenshot(`final-message-sent-${username}.png`);
          
        } else {
          console.log(`❌ 发送私信给 @${username} 失败`);
          testResults.failedUsers.push(username);
          
          // 检查是否需要passcode
          const passcodeResult = await dmService.handlePasscode();
          if (passcodeResult) {
            console.log(`🔐 尝试用passcode重新发送...`);
            const retryResult = await dmService.sendDM(message, username);
            if (retryResult) {
              console.log(`✅ 使用passcode成功发送私信给 @${username}`);
              testResults.successCount++;
              testResults.failedUsers = testResults.failedUsers.filter(u => u !== username);
            }
          }
        }
        
        // 在下一个用户之间暂停
        if (i < targetUsers.length - 1) {
          console.log('⏳ 在处理下一个用户之前暂停...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.error(`❌ 处理用户 @${username} 时出错:`, error.message);
        testResults.failedUsers.push(username);
      }
    }
    
    // 7. 生成测试报告
    console.log('\n📊 最终测试报告');
    console.log('=' * 50);
    console.log(`📈 总用户数: ${testResults.totalUsers}`);
    console.log(`✅ 成功发送: ${testResults.successCount}`);
    console.log(`❌ 失败用户: ${testResults.failedUsers.length}`);
    console.log(`🔐 PIN验证: ${testResults.pinVerificationSuccess ? '成功' : '失败'}`);
    
    if (testResults.failedUsers.length > 0) {
      console.log(`\n❌ 失败的用户列表:`);
      testResults.failedUsers.forEach(user => {
        console.log(`  - @${user}`);
      });
    }
    
    const successRate = (testResults.successCount / testResults.totalUsers * 100).toFixed(1);
    console.log(`\n🎯 成功率: ${successRate}%`);
    
    if (testResults.successCount === testResults.totalUsers) {
      console.log('🎉 所有私信发送成功！');
    } else if (testResults.successCount > 0) {
      console.log('👍 部分私信发送成功，有改进空间');
    } else {
      console.log('😞 所有私信发送失败，需要进一步调试');
    }
    
    // 拍摄最终状态截图
    await dmService.screenshot('final-test-complete.png');
    
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
testFinalDMFlow().then(results => {
  console.log('\n🏁 测试脚本执行完毕');
  process.exit(0);
}).catch(error => {
  console.error('❌ 测试脚本执行失败:', error);
  process.exit(1);
});