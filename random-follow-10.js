const PlaywrightFollowService = require('./src/services/playwrightFollowService.js');

async function randomFollow3Users() {
  const followService = new PlaywrightFollowService({
    headless: true, // 无头模式
    debug: true
  });

  try {
    console.log('🎯 随机关注3个用户任务启动');
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
      console.log('❌ 用户未登录，无法自动登录');
      return;
    }

    // 3. 执行随机关注
    console.log('🎯 开始随机关注3个用户...');
    const followedUsers = await followService.followRandomUsers(3);

        console.log('\n🎉 随机关注任务完成！');
        console.log('='.repeat(50));
        console.log(`📊 成功关注用户数: ${followedUsers.length}/10`);

        if (followedUsers.length > 0) {
          console.log('\n👥 成功关注的用户:');
          followedUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.username}`);
          });
        } else {
          console.log('❌ 未能成功关注任何用户');
        }

        // 4. 保存最终截图
        await followService.screenshot('final-follow-state.png');

      } catch (error) {
        console.error('❌ 随机关注过程出错:', error.message);
      } finally {
        // 5. 清理资源
        await followService.cleanup();
      }
    }

  } catch (error) {
    console.error('❌ 程序运行出错:', error.message);
    if (followService) {
      await followService.cleanup();
    }
  }
}

// 运行任务
if (require.main === module) {
  randomFollow10Users().catch(console.error);
}

module.exports = { randomFollow10Users };