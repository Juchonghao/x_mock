const PlaywrightFollowService = require('./src/services/playwrightFollowService.js');

async function testSingleFollow() {
  const followService = new PlaywrightFollowService({
    headless: false,
    debug: true
  });

  try {
    console.log('🧪 测试单个用户关注功能');
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
      console.log('❌ 用户未登录，请先手动登录');
      console.log('📝 请在浏览器中完成登录，然后按回车继续...');
      require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      }).question('按回车键继续...', () => {
        testFollow();
      });
    } else {
      await testFollow();
    }

    async function testFollow() {
      try {
        console.log('\n👤 测试关注一个具体用户...');
        
        // 测试用户名列表
        const testUsernames = [
          'elonmusk',
          'BillGates', 
          'sundarpichai',
          'satyanadella',
          'tim_cook'
        ];
        
        for (const username of testUsernames) {
          console.log(`\n🎯 测试关注用户: ${username}`);
          
          // 创建测试用户信息
          const testUser = {
            username: username,
            element: null
          };
          
          // 尝试关注用户
          const followSuccess = await followService.followUser(testUser);
          
          if (followSuccess) {
            console.log(`✅ 成功关注用户: ${username}`);
            break; // 如果成功就停止测试
          } else {
            console.log(`❌ 关注用户 ${username} 失败`);
          }
          
          console.log('⏳ 等待5秒后继续下一个用户...');
          await followService.humanDelay(5000, 8000);
        }
        
        console.log('\n✅ 单个用户关注测试完成！');
        
      } catch (error) {
        console.error('❌ 测试关注功能失败:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 询问是否关闭浏览器
    console.log('\n🤔 是否要关闭浏览器？(输入 y 关闭，其他键保持开启):');
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', async (data) => {
      if (data.toString().trim().toLowerCase() === 'y') {
        if (followService.browser) {
          await followService.browser.close();
          console.log('🔚 浏览器已关闭');
        }
      } else {
        console.log('🔓 浏览器保持开启状态');
      }
    });
  }
}

testSingleFollow();