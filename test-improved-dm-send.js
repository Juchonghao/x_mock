const DMService = require('./src/services/dmService');

async function testImprovedDMSend() {
  console.log('🚀 改进版私信发送测试 - 专注PIN验证后流程');
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
    
    // 定义要发送的用户列表
    const targetUsers = [
      'kent236896',
      'allen180929', 
      'fred_0201',
      'Alex09936200'
    ];
    
    // 先处理PIN验证，确保状态干净
    console.log('🔐 先处理PIN验证...');
    await dmService.page.goto('https://x.com/i/chat/pin/recovery', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pinResult = await dmService.handlePinVerification();
    console.log(`PIN验证结果: ${pinResult ? '成功' : '失败'}`);
    
    if (pinResult) {
      // 等待页面跳转完成
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 拍摄PIN验证后状态
      await dmService.screenshot('after-pin-verification-clean.png');
      
      // 检查当前URL
      const currentUrl = dmService.page.url();
      console.log(`PIN验证后URL: ${currentUrl}`);
      
      if (!currentUrl.includes('/pin')) {
        console.log('✅ 成功离开PIN验证页面，开始私信流程');
        
        // 遍历用户列表发送消息
        for (const username of targetUsers) {
          console.log(`\n🎯 测试用户: @${username}`);
          console.log(`🔗 访问用户页面...`);
          
          try {
            // 访问用户页面
            await dmService.page.goto(`https://x.com/${username}`, {
              waitUntil: 'domcontentloaded',
              timeout: 15000
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 拍摄用户页面截图
            await dmService.screenshot(`user-page-${username}.png`);
            console.log('✅ 已访问用户页面并截图');
            
            // 点击消息按钮
            console.log('💬 查找并点击消息按钮...');
            const messageButton = await dmService.page.$('a[aria-label*="Message"]');
            
            if (messageButton) {
              console.log('✅ 找到消息按钮');
              await messageButton.click();
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // 拍摄点击后截图
              await dmService.screenshot(`after-message-click-${username}.png`);
              
              // 检查是否进入聊天界面
              const chatUrl = dmService.page.url();
              console.log(`点击后URL: ${chatUrl}`);
              
              if (chatUrl.includes('/chat') && !chatUrl.includes('/pin')) {
                console.log('✅ 进入聊天界面');
                
                // 发送测试消息
                const testMessage = `Hello @${username}! 这是一条测试私信。`;
                console.log(`📝 发送测试消息: "${testMessage}"`);
                
                const sendResult = await dmService.sendDM(testMessage, username);
                
                if (sendResult) {
                  console.log(`✅ 私信发送成功给 @${username}！`);
                } else {
                  console.log(`❌ 私信发送失败给 @${username}`);
                }
                
                // 拍摄发送结果截图
                await dmService.screenshot(`send-result-${username}.png`);
                
              } else {
                console.log('⚠️ 未进入聊天界面或仍在PIN页面');
              }
              
            } else {
              console.log('❌ 未找到消息按钮');
            }
            
          } catch (userError) {
            console.error(`❌ 处理用户 @${username} 时出错:`, userError.message);
          }
          
          // 等待一段时间再发送下一条消息，避免被限制
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } else {
        console.log('⚠️ PIN验证后仍在PIN页面，尝试直接访问聊天页面');
        
        // 直接访问聊天页面
        await dmService.page.goto('https://x.com/i/chat', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const chatUrl = dmService.page.url();
        console.log(`直接访问聊天页面URL: ${chatUrl}`);
        
        if (!chatUrl.includes('/pin')) {
          console.log('✅ 成功进入聊天界面，尝试发送测试消息');
          
          const testMessage = 'Hello! 这是一条聊天界面测试消息。';
          const sendResult = await dmService.sendDM(testMessage);
          
          if (sendResult) {
            console.log('✅ 聊天界面测试消息发送成功！');
          } else {
            console.log('❌ 聊天界面测试消息发送失败');
          }
        }
      }
      
    } else {
      console.log('⚠️ PIN验证失败，但尝试继续');
      
      // 尝试直接访问聊天页面
      await dmService.page.goto('https://x.com/i/chat', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const chatUrl = dmService.page.url();
      console.log(`尝试访问聊天页面URL: ${chatUrl}`);
      
      if (!chatUrl.includes('/pin')) {
        console.log('✅ 成功进入聊天界面');
        
        const testMessage = 'Hello! 这是一条无PIN验证的测试消息。';
        const sendResult = await dmService.sendDM(testMessage);
        
        if (sendResult) {
          console.log('✅ 无PIN验证测试消息发送成功！');
        } else {
          console.log('❌ 无PIN验证测试消息发送失败');
        }
      }
    }
    
    // 拍摄最终状态截图
    await dmService.screenshot('improved-test-final.png');
    
    console.log('\n📊 改进版测试总结:');
    console.log('- ✅ 服务初始化成功');
    console.log('- ✅ 登录状态检查通过');
    console.log('- ✅ PIN验证流程改进完成');
    console.log('- ✅ 多用户私信发送尝试完成');
    
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

// 如果直接运行此脚本
if (require.main === module) {
  testImprovedDMSend().catch(console.error);
}

module.exports = testImprovedDMSend;