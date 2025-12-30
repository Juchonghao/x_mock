const PlaywrightInteractionService = require('./src/services/playwrightInteractionService.js');

async function testLikeFunction() {
  const interactionService = new PlaywrightInteractionService({
    headless: false, // 可视化模式以便观察
    debug: true
  });

  try {
    console.log('🧪 测试点赞功能');
    console.log('='.repeat(50));

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
      console.log('❌ 用户未登录，请先手动登录');
      console.log('📝 请在浏览器中完成登录，然后按回车继续...');
      require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      }).question('按回车键继续...', () => {
        testLike();
      });
    } else {
      await testLike();
    }

    async function testLike() {
      try {
        console.log('\n👤 测试点赞一个已知用户的帖子...');
        
        // 测试一个活跃用户
        const testUsername = 'elonmusk';
        
        console.log(`🔗 访问用户页面: @${testUsername}`);
        await interactionService.page.goto(`https://x.com/${testUsername}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await interactionService.humanDelay(5000, 8000);
        
        // 拍摄页面截图
        await interactionService.page.screenshot({ 
          path: `sessions/test-like-page-${testUsername}.png`,
          fullPage: true 
        });
        
        console.log('📸 页面截图已保存');
        
        // 查找帖子
        console.log('🔍 查找用户帖子...');
        const tweetSelectors = [
          'article[data-testid="tweet"]',
          '[data-testid="tweet"]',
          'article'
        ];
        
        let tweets = [];
        
        for (const selector of tweetSelectors) {
          try {
            const elements = await interactionService.page.locator(selector).all();
            console.log(`🔍 选择器 "${selector}" 找到 ${elements.length} 个帖子`);
            
            for (const element of elements.slice(0, 3)) { // 只测试前3个帖子
              try {
                if (await element.isVisible()) {
                  const textContent = await element.textContent();
                  if (textContent && textContent.length > 20) {
                    tweets.push(element);
                    console.log(`✅ 找到帖子: "${textContent.substring(0, 50)}..."`);
                    break;
                  }
                }
              } catch (e) {
                continue;
              }
            }
            
            if (tweets.length > 0) break;
          } catch (e) {
            continue;
          }
        }
        
        if (tweets.length === 0) {
          console.log('❌ 未找到帖子');
          return;
        }
        
        // 测试点赞第一个帖子
        console.log('\n👍 测试点赞第一个帖子...');
        const likeSuccess = await interactionService.likeTweet(tweets[0], 'test');
        
        if (likeSuccess) {
          console.log('✅ 点赞测试成功！');
        } else {
          console.log('❌ 点赞测试失败');
        }
        
        // 再次测试点赞（应该显示已点赞）
        console.log('\n🔄 再次测试点赞（应该显示已点赞）...');
        const secondLikeSuccess = await interactionService.likeTweet(tweets[0], 'test');
        
        if (secondLikeSuccess) {
          console.log('✅ 重复点赞测试成功（检测到已点赞状态）！');
        } else {
          console.log('⚠️ 重复点赞测试失败');
        }
        
        console.log('\n✅ 点赞功能测试完成！');
        
      } catch (error) {
        console.error('❌ 点赞测试失败:', error.message);
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
        if (interactionService.browser) {
          await interactionService.browser.close();
          console.log('🔚 浏览器已关闭');
        }
      } else {
        console.log('🔓 浏览器保持开启状态');
      }
    });
  }
}

testLikeFunction();