const PlaywrightDMService = require('./src/services/playwrightDMService.js');
const config = require('./src/config');

async function detailedLoginCheck() {
  const service = new PlaywrightDMService();
  
  try {
    console.log('🚀 启动详细登录状态检查...');
    
    await service.initialize();
    
    // 尝试加载 cookies
    console.log('🔍 尝试加载已保存的 cookies...');
    await service.loadCookies();
    
    // 直接访问主页
    console.log('🔗 访问 X.com 主页...');
    await service.page.goto('https://x.com', { 
      waitUntil: 'networkidle',
      timeout: 20000 
    });
    
    await service.humanDelay(5000, 8000);
    
    // 拍摄初始页面状态
    await service.screenshot('login-check-initial.png');
    
    // 获取当前页面信息
    const pageInfo = await service.page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent
      };
    });
    
    console.log(`📄 页面信息:`, pageInfo);
    
    // 详细的元素检查
    const pageAnalysis = await service.page.evaluate(() => {
      const results = {
        loginElements: [],
        userElements: [],
        navigationElements: [],
        dmElements: [],
        allVisibleText: []
      };
      
      // 登录相关元素 - 使用纯CSS选择器
      const loginSelectors = [
        'a[href="/login"]',
        'a[href*="login"]',
        'button',
        'a'
      ];
      
      loginSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) {
            const text = el.textContent?.trim() || '';
            if (text.toLowerCase().includes('log in') || 
                text.toLowerCase().includes('sign in') || 
                text.toLowerCase().includes('login')) {
              results.loginElements.push({
                selector: `${el.tagName.toLowerCase()}[href="${el.getAttribute('href')}"]`,
                text: text.substring(0, 50),
                visible: true
              });
            }
          }
        });
      });
      
      // 用户相关元素（已登录标志）
      const userSelectors = [
        'div[data-testid="AppTabBar_More_Menu"]',
        'a[href="/profile"]',
        'div[aria-label*="Account"]',
        'div[aria-label*="Profile"]',
        '[data-testid="primaryColumn"]',
        '[data-testid="topNavBar"]'
      ];
      
      userSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) {
            results.userElements.push({
              selector,
              text: el.textContent?.trim()?.substring(0, 50),
              visible: true
            });
          }
        });
      });
      
      // 导航元素
      const navSelectors = [
        'a[href="/home"]',
        'a[href="/"]',
        '[data-testid="AppTabBar_Home_Link"]',
        '[data-testid="AppTabBar_Profile_Link"]',
        '[data-testid="AppTabBar_DM_Link"]'
      ];
      
      navSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) {
            results.navigationElements.push({
              selector,
              text: el.textContent?.trim(),
              visible: true
            });
          }
        });
      });
      
      // 私信相关元素
      const dmSelectors = [
        '[data-testid="AppTabBar_DM_Link"]',
        'a[href="/messages"]',
        'div[aria-label*="Messages"]',
        'div[aria-label*="私信"]'
      ];
      
      dmSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) {
            results.dmElements.push({
              selector,
              text: el.textContent?.trim(),
              visible: true
            });
          }
        });
      });
      
      // 页面可见文本片段（查找登录/注册相关）
      const textElements = document.querySelectorAll('*');
      const relevantTexts = [];
      textElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && (
          text.toLowerCase().includes('log in') ||
          text.toLowerCase().includes('sign in') ||
          text.toLowerCase().includes('login') ||
          text.toLowerCase().includes('signup') ||
          text.toLowerCase().includes('sign up') ||
          text.toLowerCase().includes('register')
        )) {
          relevantTexts.push({
            tag: el.tagName,
            text: text.substring(0, 100)
          });
        }
      });
      
      results.allVisibleText = relevantTexts;
      
      return results;
    });
    
    console.log('🔍 页面分析结果:');
    console.log('🚪 登录元素:', pageAnalysis.loginElements);
    console.log('👤 用户元素:', pageAnalysis.userElements);
    console.log('🧭 导航元素:', pageAnalysis.navigationElements);
    console.log('💬 私信元素:', pageAnalysis.dmElements);
    console.log('📝 登录相关文本:', pageAnalysis.allVisibleText);
    
    // 综合判断登录状态
    const hasLoginElements = pageAnalysis.loginElements.length > 0;
    const hasUserElements = pageAnalysis.userElements.length > 0;
    const hasNavigationElements = pageAnalysis.navigationElements.length > 0;
    const hasRelevantText = pageAnalysis.allVisibleText.length > 0;
    
    console.log('\n📊 登录状态判断:');
    console.log(`- 发现登录元素: ${hasLoginElements} (${pageAnalysis.loginElements.length}个)`);
    console.log(`- 发现用户元素: ${hasUserElements} (${pageAnalysis.userElements.length}个)`);
    console.log(`- 发现导航元素: ${hasNavigationElements} (pageAnalysis.navigationElements.length}个)`);
    console.log(`- 发现登录文本: ${hasRelevantText} (${pageAnalysis.allVisibleText.length}个)`);
    
    let loginStatus = false;
    if (hasUserElements && hasNavigationElements && !hasLoginElements && !hasRelevantText) {
      console.log('✅ 状态判断: 用户已登录');
      loginStatus = true;
    } else if (hasLoginElements || hasRelevantText) {
      console.log('❌ 状态判断: 用户未登录');
      loginStatus = false;
    } else {
      console.log('⚠️ 状态不确定，尝试点击私信按钮测试...');
      
      // 尝试点击私信按钮测试
      try {
        const dmButton = await service.page.locator('[data-testid="AppTabBar_DM_Link"]').first();
        if (await dmButton.isVisible()) {
          console.log('💬 发现私信按钮，尝试点击...');
          await dmButton.click();
          await service.humanDelay(3000, 5000);
          
          await service.screenshot('login-check-dm-click.png');
          
          // 检查是否成功进入私信页面
          const currentUrl = service.page.url();
          console.log(`🔗 点击私信后的URL: ${currentUrl}`);
          
          if (currentUrl.includes('/messages') || currentUrl.includes('/dm')) {
            console.log('✅ 成功进入私信页面，确认用户已登录');
            loginStatus = true;
          } else {
            console.log('❌ 无法进入私信页面，可能未登录');
            loginStatus = false;
          }
        } else {
          console.log('❌ 未发现私信按钮');
          loginStatus = false;
        }
      } catch (error) {
        console.log(`❌ 点击私信按钮失败: ${error.message}`);
        loginStatus = false;
      }
    }
    
    console.log(`\n🎯 最终登录状态: ${loginStatus ? '已登录' : '未登录'}`);
    
    return loginStatus;
    
  } catch (error) {
    console.error('❌ 详细登录检查失败:', error);
    return false;
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

// 运行详细检查
if (require.main === module) {
  detailedLoginCheck().then(status => {
    console.log(`\n🏁 检查完成，登录状态: ${status ? '已登录' : '未登录'}`);
    process.exit(status ? 0 : 1);
  }).catch(console.error);
}

module.exports = { detailedLoginCheck };