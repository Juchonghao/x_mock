require('dotenv').config();
const DMService = require('./src/services/dmService');

async function testCompleteDMSend() {
  console.log('🧪 完整测试私信发送功能 - 包括PIN验证和Passcode处理');
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
    
    // 访问用户页面
    console.log(`🔗 访问用户页面...`);
    const userFound = await dmService.searchUserAndOpenDM(testUser);
    
    if (!userFound) {
      console.log(`❌ 无法访问用户页面`);
      return;
    }
    
    // 拍摄用户页面截图
    await dmService.screenshot('complete-test-user-page.png');
    console.log('✅ 已访问用户页面并截图');
    
    // 打开私信对话框
    console.log('💬 打开私信对话框...');
    const dmOpened = await dmService.openDMDialog();
    
    if (!dmOpened) {
      console.log('❌ 无法打开私信对话框');
      return;
    }
    
    // 拍摄对话框截图
    await dmService.screenshot('complete-test-dm-dialog.png');
    console.log('✅ 私信对话框已打开或尝试打开');
    
    // 检查当前页面状态
    const currentUrl = dmService.page.url();
    console.log(`🌐 当前页面URL: ${currentUrl}`);
    
    // 如果是PIN验证页面，先处理PIN验证
    if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
      console.log('🔐 检测到PIN验证页面，自动处理PIN验证...');
      
      // 使用DMService的自动PIN验证功能
      const pinResult = await dmService.handlePinVerification();
      
      if (pinResult) {
        console.log('✅ PIN验证成功！');
      } else {
        console.log('⚠️ PIN验证可能失败，但继续尝试');
      }
      
      // 重新获取当前URL
      const afterPinUrl = dmService.page.url();
      console.log(`PIN验证后URL: ${afterPinUrl}`);
    }
    
    // 检查是否需要选择用户
    const currentPageUrl = dmService.page.url();
    if (currentPageUrl.includes('/chat') && !currentPageUrl.includes('/conversation/')) {
      console.log('👤 需要选择用户，查找用户选择输入框...');
      
      // 查找用户搜索输入框
      const searchInputs = await dmService.page.$$('input[type="text"]');
      
      if (searchInputs.length > 0) {
        const searchInput = searchInputs[0];
        console.log('✅ 找到用户搜索输入框');
        
        // 点击并输入用户名
        await searchInput.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await dmService.page.keyboard.down('Control');
        await dmService.page.keyboard.press('A');
        await dmService.page.keyboard.up('Control');
        
        await dmService.page.type(searchInput, testUser, { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 拍摄输入用户名后的截图
        await dmService.screenshot('complete-after-username-search.png');
        
        // 尝试点击出现的用户选项
        const userOptions = await dmService.page.$$('div[role="option"], [data-testid*="user"], [data-testid*="User"]');
        if (userOptions.length > 0) {
          console.log(`✅ 找到 ${userOptions.length} 个用户选项，点击第一个...`);
          await userOptions[0].click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 拍摄选择用户后的截图
          await dmService.screenshot('complete-after-user-select.png');
        }
      }
    }
    
    // 发送测试消息
    const testMessage = 'Hello! 这是一条完整的私信功能测试消息。';
    console.log(`📝 发送测试消息: "${testMessage}"`);
    
    const sendResult = await dmService.sendDM(testMessage);
    
    if (sendResult) {
      console.log('✅ 私信发送成功！');
    } else {
      console.log('❌ 私信发送失败');
      
      // 拍摄失败截图
      await dmService.screenshot('complete-test-send-failed.png');
      
      // 检查是否是passcode问题
      console.log('🔐 检查是否需要passcode...');
      const passcodeHandled = await dmService.handlePasscode();
      
      if (passcodeHandled) {
        console.log('✅ Passcode已处理，尝试重新发送...');
        const retryResult = await dmService.sendDM(testMessage);
        
        if (retryResult) {
          console.log('✅ Passcode验证后发送成功！');
        } else {
          console.log('❌ Passcode验证后仍然发送失败');
        }
      } else {
        console.log('❌ 未检测到passcode需求或处理失败');
      }
    }
    
    // 拍摄最终状态截图
    await dmService.screenshot('complete-test-final.png');
    
    console.log('\n📊 测试总结:');
    console.log('- ✅ 服务初始化成功');
    console.log('- ✅ 登录状态检查通过');
    console.log('- ✅ 用户页面访问成功');
    console.log('- ✅ 私信对话框打开流程完成');
    if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
      console.log('- ✅ PIN验证流程处理完成');
    }
    console.log('- ✅ 测试消息发送尝试完成');
    
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

// 运行测试
testCompleteDMSend().catch(console.error);