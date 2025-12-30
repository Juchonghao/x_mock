#!/usr/bin/env node

/**
 * 详细调试cookies配置的脚本
 */

const BrowserService = require('./src/services/browserService');

async function debugCookies() {
  console.log('🔍 详细调试cookies配置');
  console.log('=' * 50);

  let browserService;
  
  try {
    // 初始化浏览器服务
    console.log('🚀 初始化浏览器服务...');
    browserService = new BrowserService();
    await browserService.initialize();
    console.log('✅ 浏览器初始化成功');
    console.log('');

    // 检查环境变量中的cookies
    const envCookies = process.env.TWITTER_COOKIES;
    console.log('📋 环境变量中的cookies:');
    if (envCookies) {
      try {
        const parsedCookies = JSON.parse(envCookies);
        console.log(`   ✅ 成功解析: ${parsedCookies.length} 个cookies`);
        console.log('   🔍 Cookies详情:');
        parsedCookies.forEach((cookie, index) => {
          console.log(`      ${index + 1}. ${cookie.name}: ${cookie.value.substring(0, 20)}... (${cookie.domain})`);
        });
      } catch (parseError) {
        console.log(`   ❌ 解析失败: ${parseError.message}`);
      }
    } else {
      console.log('   ❌ 未找到TWITTER_COOKIES环境变量');
    }
    console.log('');

    // 注入cookies
    console.log('🍪 注入cookies...');
    await browserService.injectCookies('https://x.com');
    console.log('✅ cookies注入完成');
    console.log('');

    // 检查注入后的cookies
    console.log('🔍 检查注入后的cookies...');
    const pageCookies = await browserService.page.cookies();
    console.log(`   获取到 ${pageCookies.length} 个页面cookies`);
    
    // 检查关键cookies
    const keyCookies = ['auth_token', 'ct0', 'twid', 'personalization_id'];
    keyCookies.forEach(cookieName => {
      const found = pageCookies.find(c => c.name === cookieName);
      if (found) {
        console.log(`   ✅ ${cookieName}: ${found.value.substring(0, 20)}...`);
      } else {
        console.log(`   ❌ ${cookieName}: 未找到`);
      }
    });
    console.log('');

    // 导航到主页检查登录状态
    console.log('🌐 导航到X主页检查登录状态...');
    await browserService.page.goto('https://x.com', { waitUntil: 'networkidle2', timeout: 30000 });
    await browserService.humanDelay(3000, 5000);
    
    const loginStatus = await browserService.page.evaluate(() => {
      const bodyText = document.body.textContent.toLowerCase();
      return {
        isLoggedIn: !bodyText.includes('login') && !bodyText.includes('sign up'),
        hasLoginButton: !!document.querySelector('a[href*="/login"], button[data-testid="loginButton"]'),
        pageTitle: document.title,
        currentUrl: window.location.href
      };
    });
    
    console.log('📊 登录状态检查结果:');
    console.log(`   页面标题: ${loginStatus.pageTitle}`);
    console.log(`   当前URL: ${loginStatus.currentUrl}`);
    console.log(`   登录状态: ${loginStatus.isLoggedIn ? '已登录' : '未登录'}`);
    console.log(`   有登录按钮: ${loginStatus.hasLoginButton ? '是' : '否'}`);
    console.log('');

    // 尝试搜索页面
    if (loginStatus.isLoggedIn) {
      console.log('🔍 测试搜索页面...');
      const searchQuery = 'AI native';
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(searchQuery)}&src=typed_query&f=live`;
      
      await browserService.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await browserService.humanDelay(5000, 8000);
      
      const searchStatus = await browserService.page.evaluate(() => {
        const bodyText = document.body.textContent.toLowerCase();
        return {
          isSearchPage: !bodyText.includes('login') && !bodyText.includes('sign up'),
          hasSearchResults: !!document.querySelector('[data-testid="tweet"], [role="article"]'),
          pageTitle: document.title,
          currentUrl: window.location.href
        };
      });
      
      console.log('📊 搜索页面状态:');
      console.log(`   页面标题: ${searchStatus.pageTitle}`);
      console.log(`   当前URL: ${searchStatus.currentUrl}`);
      console.log(`   搜索页面: ${searchStatus.isSearchPage ? '成功' : '失败'}`);
      console.log(`   有搜索结果: ${searchStatus.hasSearchResults ? '是' : '否'}`);
    } else {
      console.log('❌ 未登录状态，无法测试搜索功能');
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
  } finally {
    if (browserService) {
      await browserService.close();
      console.log('🧹 浏览器服务关闭');
    }
  }
  
  console.log('🎉 调试完成');
}

debugCookies().catch(console.error);