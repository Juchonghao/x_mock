const DMService = require('./src/services/dmService');

async function testAutoPINInput() {
  console.log('🧪 测试自动PIN输入功能');
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
    
    console.log('✅ 登录状态检查完成');
    
    // 直接访问PIN验证页面来测试自动输入功能
    console.log('🔐 导航到PIN验证页面测试自动输入...');
    await dmService.page.goto('https://x.com/i/chat/pin/recovery', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 拍摄PIN页面截图
    await dmService.screenshot('pin-test-page.png');
    
    // 测试自动PIN输入
    console.log('🔐 测试自动PIN输入功能...');
    const pinResult = await dmService.handlePinVerification();
    
    if (pinResult) {
      console.log('✅ PIN验证自动输入成功！');
      
      // 等待页面跳转
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 拍摄验证后截图
      await dmService.screenshot('after-auto-pin-test.png');
      
      // 检查当前页面URL
      const currentUrl = dmService.page.url();
      console.log(`🌐 验证后页面URL: ${currentUrl}`);
      
      if (!currentUrl.includes('/pin')) {
        console.log('✅ 成功离开PIN验证页面');
      } else {
        console.log('⚠️ 仍在PIN验证页面，可能需要手动处理');
      }
      
    } else {
      console.log('❌ PIN验证自动输入失败');
      
      // 拍摄失败截图
      await dmService.screenshot('pin-test-failed.png');
    }
    
    console.log('\n📊 PIN自动输入测试总结:');
    console.log('- ✅ 服务初始化成功');
    console.log('- ✅ 登录状态检查通过');
    console.log(pinResult ? '- ✅ 自动PIN输入功能正常' : '- ❌ 自动PIN输入功能异常');
    
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
  testAutoPINInput().catch(console.error);
}

module.exports = testAutoPINInput;