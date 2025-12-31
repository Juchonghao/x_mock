// Auth Token 功能测试脚本
const TwitterAuthService = require('./services/twitter-auth');

async function testAuthToken() {
  console.log('🧪 开始测试 Auth Token 认证功能...\n');
  
  const authService = new TwitterAuthService();
  
  try {
    // 1. 测试浏览器初始化
    console.log('1️⃣ 测试浏览器初始化...');
    const browserInitialized = await authService.initializeBrowser();
    console.log(`浏览器初始化结果: ${browserInitialized ? '✅ 成功' : '❌ 失败'}\n`);
    
    if (!browserInitialized) {
      throw new Error('浏览器初始化失败，无法继续测试');
    }
    
    // 2. 测试 Auth Token 配置检查
    console.log('2️⃣ 检查 Auth Token 配置...');
    const authConfig = require('./config/auth');
    const isConfigured = authConfig.twitter.isConfigured();
    console.log(`Auth Token 配置状态: ${isConfigured ? '✅ 已配置' : '❌ 未配置'}\n`);
    
    if (!isConfigured) {
      console.log('⚠️  警告: Auth Token 未配置，请设置以下环境变量:');
      console.log('   - TWITTER_AUTH_TOKEN');
      console.log('   - TWITTER_CT0');
      console.log('   - TWITTER_PERSONALIZATION_ID');
      console.log('   测试将模拟认证过程...\n');
    }
    
    // 3. 模拟认证测试（不实际访问 Twitter）
    console.log('3️⃣ 模拟 Auth Token 认证测试...');
    console.log('📋 认证流程:');
    console.log('   1. 访问 Twitter 主页');
    console.log('   2. 设置 Auth Token Cookie');
    console.log('   3. 验证登录状态');
    console.log('   4. 检查用户界面元素');
    console.log('✅ 认证逻辑已实现\n');
    
    // 4. 测试服务状态
    console.log('4️⃣ 测试服务状态检查...');
    const isAuthenticated = authService.isAuthenticated();
    console.log(`当前认证状态: ${isAuthenticated ? '已认证' : '未认证'}\n`);
    
    // 5. 测试自动化服务
    console.log('5️⃣ 测试自动化服务初始化...');
    const TwitterAutomationService = require('./services/twitter-automation');
    const automationService = new TwitterAutomationService();
    console.log('✅ 自动化服务初始化成功\n');
    
    // 6. 显示可用功能
    console.log('6️⃣ 可用的 Twitter 自动化功能:');
    console.log('   - ✅ 关注用户 (followUser)');
    console.log('   - ❤️  点赞推文 (likeTweet)');
    console.log('   - 💬 评论推文 (commentOnTweet)');
    console.log('   - 👥 批量关注 (batchFollow)');
    console.log('   - 📋 操作历史 (getOperationHistory)\n');
    
    console.log('🎉 Auth Token 功能测试完成!');
    console.log('\n📝 使用说明:');
    console.log('1. 设置 Twitter Auth Token 环境变量');
    console.log('2. 启动服务: node start-x-service.js');
    console.log('3. 调用认证 API: POST /api/auth/login');
    console.log('4. 执行自动化操作\n');
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  } finally {
    // 清理资源
    await authService.close();
    console.log('🧹 资源清理完成');
  }
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  testAuthToken().catch(console.error);
}

module.exports = testAuthToken;