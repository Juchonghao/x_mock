const PlaywrightInteractionService = require('./src/services/playwrightInteractionService.js');

async function testUserInteractions() {
  const interactionService = new PlaywrightInteractionService({
    headless: true, // 无头模式
    debug: true
  });

  // 要测试的用户列表
  const testUsers = [
    'kent236896',
    'allen180929', 
    'fred_0201',
    'Alex09936200'
  ];

  try {
    console.log('🎯 开始测试用户帖子互动功能');
    console.log('='.repeat(60));
    console.log(`👥 测试用户: ${testUsers.join(', ')}`);
    console.log('='.repeat(60));

    // 1. 初始化服务
    console.log('🚀 初始化互动服务...');
    const initSuccess = await interactionService.initialize();
    if (!initSuccess) {
      console.log('❌ 服务初始化失败');
      return;
    }

    // 2. 检查登录状态
    console.log('🔐 检查登录状态...');
    const isLoggedIn = await interactionService.checkLoginStatus();
    if (!isLoggedIn) {
      console.log('❌ 用户未登录，无法进行互动');
      return;
    }

    // 3. 对所有用户进行互动测试
    console.log('🎯 开始批量用户互动测试...');
    const results = await interactionService.interactWithMultipleUsers(testUsers);

    console.log('\n🎉 用户互动测试完成！');
    console.log('='.repeat(60));
    
    // 显示详细结果
    results.forEach(result => {
      const status = result.success ? '✅ 成功' : '❌ 失败';
      console.log(`@${result.username}: ${status}`);
    });

    const successfulCount = results.filter(r => r.success).length;
    console.log(`\n📊 总体结果: ${successfulCount}/${testUsers.length} 个用户互动成功`);

  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
  } finally {
    // 清理资源
    await interactionService.cleanup();
  }
}

// 运行测试
if (require.main === module) {
  testUserInteractions().catch(console.error);
}

module.exports = { testUserInteractions };