const PlaywrightDMService = require('./src/services/playwrightDMService.js');

async function simpleLoginCheck() {
  const service = new PlaywrightDMService();
  
  try {
    console.log('🚀 启动简单登录检查...');
    
    await service.initialize();
    
    // 访问主页
    await service.page.goto('https://x.com', { 
      waitUntil: 'networkidle',
      timeout: 20000 
    });
    
    await service.humanDelay(5000, 8000);
    
    // 拍摄截图
    await service.screenshot('simple-login-check.png');
    
    // 简单检查登录状态
    const isLoggedIn = await service.checkLoginStatus();
    
    console.log(`🎯 登录状态: ${isLoggedIn ? '已登录' : '未登录'}`);
    
    if (isLoggedIn) {
      // 如果已登录，尝试导航到私信页面
      console.log('💬 尝试导航到私信页面...');
      
      try {
        await service.page.goto('https://x.com/messages', { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        await service.humanDelay(3000, 5000);
        
        await service.screenshot('simple-messages-page.png');
        
        // 检查私信页面关键元素
        const hasSearchBox = await service.page.locator('input[placeholder*="Search"], div[contenteditable="true"]').first().isVisible();
        const hasNewChatButton = await service.page.locator('button, div[role="button"]').first().isVisible();
        
        console.log(`🔍 私信页面检查:`);
        console.log(`- 有搜索框: ${hasSearchBox}`);
        console.log(`- 有聊天按钮: ${hasNewChatButton}`);
        
        // 如果有搜索框，测试搜索功能
        if (hasSearchBox) {
          console.log('🔍 测试用户搜索功能...');
          
          // 查找搜索框
          const searchSelectors = [
            'input[placeholder*="Search messages"]',
            'input[placeholder*="搜索私信"]',
            'input[placeholder*="Search"]',
            'div[contenteditable="true"][placeholder*="Search"]',
            'div[contenteditable="true"][placeholder*="搜索"]'
          ];
          
          let searchInput = null;
          for (const selector of searchSelectors) {
            try {
              const input = await service.page.locator(selector).first();
              if (await input.isVisible()) {
                searchInput = input;
                console.log(`✅ 找到搜索框: ${selector}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (searchInput) {
            // 输入测试用户名
            const testUsername = 'elonmusk';
            await searchInput.click();
            await service.humanDelay(1000, 2000);
            await searchInput.fill(`@${testUsername}`);
            await service.humanDelay(3000, 4000);
            
            await service.screenshot('simple-search-results.png');
            
            // 查找搜索结果
            const userSelectors = [
              `a[href*="/${testUsername}"]`,
              'div[data-testid="UserCell"]',
              'div[data-testid="DMThreadItem"]',
              'div[role="button"]'
            ];
            
            let foundUser = false;
            for (const selector of userSelectors) {
              try {
                const userElement = await service.page.locator(selector).first();
                if (await userElement.isVisible()) {
                  console.log(`✅ 找到用户元素: ${selector}`);
                  
                  // 点击用户元素
                  await userElement.click();
                  await service.humanDelay(2000, 3000);
                  
                  await service.screenshot('simple-user-click.png');
                  
                  // 检查是否进入聊天页面
                  const isInChat = await service.verifyInDirectMessage();
                  if (isInChat) {
                    console.log('✅ 成功进入聊天页面！');
                    foundUser = true;
                    break;
                  } else {
                    // 尝试寻找发送消息按钮
                    const sendButtonFound = await service.findAndClickSendMessageButton();
                    if (sendButtonFound) {
                      await service.humanDelay(2000, 3000);
                      const isInChat2 = await service.verifyInDirectMessage();
                      if (isInChat2) {
                        console.log('✅ 通过发送按钮进入聊天页面！');
                        foundUser = true;
                        break;
                      }
                    }
                  }
                }
              } catch (e) {
                continue;
              }
            }
            
            if (!foundUser) {
              console.log('❌ 未找到用户搜索结果或无法进入聊天页面');
            }
          } else {
            console.log('❌ 未找到可用的搜索框');
          }
        }
        
      } catch (error) {
        console.log(`❌ 私信页面测试失败: ${error.message}`);
      }
    }
    
    console.log('\n🎯 简单登录检查完成！');
    return isLoggedIn;
    
  } catch (error) {
    console.error('❌ 简单登录检查失败:', error);
    return false;
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

// 运行简单检查
if (require.main === module) {
  simpleLoginCheck().then(status => {
    console.log(`\n🏁 检查完成，登录状态: ${status ? '已登录' : '未登录'}`);
    process.exit(status ? 0 : 1);
  }).catch(console.error);
}

module.exports = { simpleLoginCheck };