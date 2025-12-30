require('dotenv').config();
const DMService = require('./src/services/dmService');

async function testDMWithPasscode() {
  console.log('🧪 测试私信功能 - 重点验证passcode处理流程');
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
    
    // 访问用户页面并测试私信
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
    await dmService.screenshot('test-user-page.png');
    console.log('✅ 已访问用户页面并截图');
    
    // 打开私信对话框
    console.log('💬 打开私信对话框...');
    const dmOpened = await dmService.openDMDialog();
    
    if (!dmOpened) {
      console.log('❌ 无法打开私信对话框');
      return;
    }
    
    // 拍摄对话框截图
    await dmService.screenshot('test-dm-dialog.png');
    console.log('✅ 私信对话框已打开');
    
    // 发送测试消息
    const testMessage = 'Hello! 这是一条测试私信。';
    console.log(`📝 发送测试消息: "${testMessage}"`);
    
    const sendResult = await dmService.sendDM(testMessage);
    
    if (sendResult) {
      console.log('✅ 私信发送成功');
    } else {
      console.log('❌ 私信发送失败，正在检查passcode处理...');
      
      // 拍摄失败后的截图
      await dmService.screenshot('test-dm-send-failed.png');
      
      // 让 handlePasscode 方法自动处理 passcode
      console.log('🔐 检查是否需要passcode...');
      const passcodeHandled = await dmService.handlePasscode();
      
      if (passcodeHandled) {
        console.log('✅ Passcode已处理，重新尝试发送...');
        
        // 重新尝试发送
        console.log('🔄 重新尝试发送私信...');
        const retryResult = await dmService.sendDM(testMessage);
        
        if (retryResult) {
          console.log('✅ Passcode验证后发送成功');
        } else {
          console.log('❌ Passcode验证后仍然发送失败');
        }
        
      } else {
        console.log('❌ 未检测到passcode需求或处理失败');
      }
    }
    
    // 拍摄最终状态截图
    await dmService.screenshot('test-dm-final.png');
    
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
testDMWithPasscode().catch(console.error);