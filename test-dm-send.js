require('dotenv').config();
const DMService = require('./src/services/dmService');

async function testDMSend() {
  console.log('🚀 开始测试私信发送功能');
  console.log('=' * 50);
  
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
    
    console.log('✅ 登录状态检查完成，开始发送私信');
    
    // 发送私信
    const results = await dmService.sendBatchDMs();
    
    // 显示结果
    console.log('\n📊 私信发送结果:');
    console.log('=' * 30);
    console.log(`总目标用户: ${results.total}`);
    console.log(`成功发送: ${results.success}`);
    console.log(`发送失败: ${results.failed}`);
    
    if (results.success > 0) {
      console.log('\n✅ 成功发送私信的用户:');
      results.sentUsers.forEach(user => {
        console.log(`  - @${user}`);
      });
    }
    
    if (results.failed > 0) {
      console.log('\n❌ 发送失败的用户:');
      results.failedUsers.forEach(user => {
        console.log(`  - @${user}`);
      });
    }
    
    // 拍摄截图记录
    console.log('📸 拍摄最终状态截图...');
    await dmService.screenshot('dm-send-result.png');
    
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
testDMSend().catch(console.error);