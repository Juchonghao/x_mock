const PlaywrightFollowService = require('./src/services/playwrightFollowService.js');

async function testFollowHeadless() {
  const followService = new PlaywrightFollowService({
    headless: true,  // 使用 headless 模式
    debug: true
  });

  try {
    console.log('🧪 测试关注功能 (Headless模式)');
    console.log('='.repeat(50));

    // 1. 初始化服务
    console.log('🚀 初始化服务...');
    const initSuccess = await followService.initialize();
    if (!initSuccess) {
      console.log('❌ 服务初始化失败');
      return;
    }

    // 2. 检查登录状态
    console.log('🔐 检查登录状态...');
    const isLoggedIn = await followService.checkLoginStatus();
    
    if (!isLoggedIn) {
      console.log('❌ 用户未登录');
      console.log('💡 需要在本地完成登录，然后将 cookies 上传到服务器');
      return;
    }

    // 3. 测试关注功能
    console.log('👤 测试关注用户...');
    
    // 测试用户名列表
    const testUsernames = [
      'elonmusk',
      'BillGates', 
      'sundarpichai',
      'tim_cook'
    ];
    
    let followSuccess = false;
    
    for (const username of testUsernames) {
      console.log(`\n🎯 测试关注用户: ${username}`);
      
      try {
        // 创建测试用户信息
        const testUser = {
          username: username,
          element: null
        };
        
        // 尝试关注用户
        const result = await followService.followUser(testUser);
        
        if (result) {
          console.log(`✅ 成功关注用户: ${username}`);
          followSuccess = true;
          break;
        } else {
          console.log(`❌ 关注用户 ${username} 失败`);
        }
        
        // 等待一段时间再尝试下一个用户
        console.log('⏳ 等待5秒后继续下一个用户...');
        await followService.humanDelay(5000, 8000);
        
      } catch (error) {
        console.log(`❌ 测试用户 ${username} 时出错:`, error.message);
      }
    }

    // 4. 测试随机搜索关注
    if (!followSuccess) {
      console.log('\n🔍 测试随机搜索关注...');
      try {
        const followedUsers = await followService.searchRandomUsers(3);
        console.log(`✅ 随机搜索完成，成功关注 ${followedUsers.length} 个用户`);
      } catch (error) {
        console.log('❌ 随机搜索关注失败:', error.message);
      }
    }

    console.log('\n✅ 关注功能测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 关闭浏览器
    if (followService.browser) {
      await followService.browser.close();
    }
  }
}

testFollowHeadless();