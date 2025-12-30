const PlaywrightInteractionService = require('./src/services/playwrightInteractionService.js');

async function testSpecificUserLikes() {
  const interactionService = new PlaywrightInteractionService({
    headless: true, // 无头模式
    debug: true
  });

  // 指定的测试用户列表
  const testUsers = [
    'kent236896',
    'allen180929', 
    'fred_0201',
    'Alex09936200'
  ];

  try {
    console.log('🎯 专门测试四个用户的点赞功能');
    console.log('='.repeat(60));
    console.log(`👥 测试用户: ${testUsers.join(', ')}`);
    console.log('='.repeat(60));

    // 1. 初始化服务
    console.log('🚀 初始化服务...');
    const initSuccess = await interactionService.initialize();
    if (!initSuccess) {
      console.log('❌ 服务初始化失败');
      return;
    }

    // 2. 检查登录状态
    console.log('🔐 检查登录状态...');
    const isLoggedIn = await interactionService.checkLoginStatus();
    if (!isLoggedIn) {
      console.log('❌ 用户未登录，无法进行点赞测试');
      return;
    }

    // 3. 对每个用户测试点赞功能
    const results = [];
    
    for (const username of testUsers) {
      try {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`👤 测试用户: @${username} 的点赞功能`);
        console.log(`${'='.repeat(50)}`);
        
        // 访问用户页面
        console.log(`🔗 访问用户页面: @${username}`);
        const visitSuccess = await interactionService.page.goto(`https://x.com/${username}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        if (!visitSuccess) {
          console.log(`❌ 无法访问用户 ${username} 的页面`);
          results.push({ username, likeSuccess: false, reason: '页面访问失败' });
          continue;
        }
        
        await interactionService.humanDelay(3000, 5000);
        
        // 查找帖子
        console.log('🔍 查找用户帖子...');
        const tweets = await interactionService.findTweets();
        
        if (tweets.length === 0) {
          console.log(`⚠️ 用户 ${username} 没有找到可点赞的帖子`);
          results.push({ username, likeSuccess: false, reason: '未找到帖子' });
          continue;
        }
        
        console.log(`✅ 找到 ${tweets.length} 个帖子，尝试点赞第一个...`);
        
        // 测试点赞第一个帖子
        let likeSuccess = false;
        
        for (let i = 0; i < Math.min(3, tweets.length) && !likeSuccess; i++) {
          try {
            const tweet = tweets[i];
            console.log(`\n👍 尝试点赞帖子 ${i + 1}/${Math.min(3, tweets.length)}`);
            console.log(`📄 帖子内容: ${tweet.text.substring(0, 50)}...`);
            
            likeSuccess = await interactionService.likeTweet(tweet.element, tweet.text);
            
            if (likeSuccess) {
              console.log(`✅ 点赞用户 ${username} 的帖子成功！`);
            } else {
              console.log(`❌ 点赞帖子 ${i + 1} 失败，尝试下一个...`);
            }
            
            // 帖子间延迟
            await interactionService.humanDelay(2000, 3000);
            
          } catch (error) {
            console.log(`❌ 点赞帖子 ${i + 1} 时出错: ${error.message}`);
          }
        }
        
        results.push({ 
          username, 
          likeSuccess, 
          postsFound: tweets.length,
          reason: likeSuccess ? '点赞成功' : '点赞失败'
        });
        
        // 用户间延迟
        if (username !== testUsers[testUsers.length - 1]) {
          console.log(`⏳ 等待5秒后处理下一个用户...`);
          await interactionService.humanDelay(5000, 8000);
        }
        
      } catch (error) {
        console.error(`❌ 处理用户 ${username} 失败:`, error.message);
        results.push({ username, likeSuccess: false, reason: error.message });
      }
    }

    // 4. 显示测试结果
    console.log('\n🎉 点赞功能测试完成！');
    console.log('='.repeat(60));
    console.log('📊 测试结果:');
    
    let successCount = 0;
    
    results.forEach(result => {
      const status = result.likeSuccess ? '✅ 成功' : '❌ 失败';
      const reason = result.reason ? ` (${result.reason})` : '';
      console.log(`@${result.username}: ${status}${reason}`);
      
      if (result.likeSuccess) successCount++;
    });
    
    console.log(`\n📈 总体统计: ${successCount}/${testUsers.length} 个用户点赞成功`);
    
    // 5. 保存测试结果
    const testResult = {
      timestamp: new Date().toISOString(),
      testType: '点赞功能测试',
      targetUsers: testUsers,
      totalUsers: testUsers.length,
      successfulUsers: successCount,
      results: results
    };
    
    const fs = require('fs');
    const path = require('path');
    const filename = `like-test-results-${Date.now()}.json`;
    const filepath = path.join(process.cwd(), 'sessions', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(testResult, null, 2));
    console.log(`💾 测试结果已保存: ${filepath}`);

  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
  } finally {
    // 清理资源
    await interactionService.cleanup();
  }
}

// 运行测试
if (require.main === module) {
  testSpecificUserLikes().catch(console.error);
}

module.exports = { testSpecificUserLikes };