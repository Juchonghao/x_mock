const PlaywrightFollowService = require('./src/services/playwrightFollowService.js');

async function debugFollowFlow() {
  const followService = new PlaywrightFollowService({
    headless: false,
    debug: true
  });

  try {
    console.log('🔍 调试关注流程');
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
        testFollowFlow();
      });
    } else {
      await testFollowFlow();
    }

    async function testFollowFlow() {
      try {
        console.log('\n🔍 测试搜索和关注流程...');
        
        // 测试搜索
        console.log('🔍 访问搜索页面...');
        await followService.page.goto('https://x.com/search?q=test&f=user', {
          waitUntil: 'networkidle',
          timeout: 15000
        });
        
        await followService.humanDelay(3000, 5000);
        
        // 拍摄页面截图
        await followService.page.screenshot({ 
          path: 'sessions/debug-search-page.png',
          fullPage: true 
        });
        
        console.log('📸 搜索页面截图已保存');
        
        // 分析页面结构
        console.log('\n🔍 分析页面结构...');
        
        // 检查页面内容
        const pageContent = await followService.page.content();
        console.log('📄 页面内容长度:', pageContent.length);
        
        // 查找用户相关元素
        const userSelectors = [
          '[data-testid="UserCell"]',
          'article[data-testid="tweet"]',
          'a[href*="/"]',
          'div[role="link"]',
          '[data-testid="user-follow"]'
        ];
        
        for (const selector of userSelectors) {
          try {
            const elements = await followService.page.locator(selector).all();
            console.log(`🔍 选择器 "${selector}" 找到 ${elements.length} 个元素`);
            
            if (elements.length > 0) {
              // 检查前3个元素的可见性
              for (let i = 0; i < Math.min(3, elements.length); i++) {
                try {
                  const isVisible = await elements[i].isVisible();
                  const text = await elements[i].textContent();
                  const href = await elements[i].getAttribute('href');
                  
                  console.log(`   元素 ${i + 1}: 可见=${isVisible}, 文本="${text?.substring(0, 50)}...", href="${href}"`);
                } catch (e) {
                  console.log(`   元素 ${i + 1}: 获取信息失败 - ${e.message}`);
                }
              }
            }
          } catch (e) {
            console.log(`⚠️ 选择器 "${selector}" 失败: ${e.message}`);
          }
        }
        
        // 测试一个具体的用户
        console.log('\n👤 测试关注一个具体用户...');
        
        // 先测试一个已知的用户
        const testUsername = 'elonmusk'; // 使用一个知名用户测试
        
        console.log(`🔍 访问用户页面: ${testUsername}`);
        await followService.page.goto(`https://x.com/${testUsername}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });
        
        await followService.humanDelay(3000, 5000);
        
        // 拍摄用户页面截图
        await followService.page.screenshot({ 
          path: `sessions/debug-user-${testUsername}-page.png`,
          fullPage: true 
        });
        
        console.log('📸 用户页面截图已保存');
        
        // 查找关注按钮
        const followButtonSelectors = [
          '[data-testid="follow"]',
          'button[data-testid="follow"]',
          'button:has-text("Follow")',
          'button:has-text("关注")',
          'div[role="button"]:has-text("Follow")',
          'div[role="button"]:has-text("关注")',
          'button:has-text("Following")',
          'button:has-text("已关注")',
          'button:has-text("Unfollow")',
          'button:has-text("取关")'
        ];
        
        for (const selector of followButtonSelectors) {
          try {
            const buttons = await followService.page.locator(selector).all();
            console.log(`🔍 关注按钮选择器 "${selector}" 找到 ${buttons.length} 个按钮`);
            
            for (let i = 0; i < Math.min(2, buttons.length); i++) {
              try {
                const isVisible = await buttons[i].isVisible();
                const text = await buttons[i].textContent();
                
                console.log(`   按钮 ${i + 1}: 可见=${isVisible}, 文本="${text}"`);
                
                if (isVisible && text) {
                  console.log(`✅ 找到可见的关注按钮: "${text}"`);
                  break;
                }
              } catch (e) {
                console.log(`   按钮 ${i + 1}: 获取信息失败 - ${e.message}`);
              }
            }
            
            if (buttons.length > 0) break;
          } catch (e) {
            console.log(`⚠️ 关注按钮选择器 "${selector}" 失败: ${e.message}`);
          }
        }
        
        console.log('\n✅ 调试完成！请检查生成的截图和日志');
        
      } catch (error) {
        console.error('❌ 测试关注流程失败:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    // 关闭浏览器
    if (followService.browser) {
      await followService.browser.close();
    }
  }
}

debugFollowFlow();