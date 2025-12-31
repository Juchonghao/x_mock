const { chromium } = require('playwright');

async function checkAuthStatus() {
  let browser;
  let page;
  
  try {
    console.log('🔍 检查Twitter认证状态...');
    
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    
    console.log('🔐 设置认证Cookie...');
    
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: '748a8409eb2899a437671f25a5e7687ac6415107',
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'ct0',
        value: 'fa95bade309fd481de3e379e8dccc1c1eca5999fe015464744a0b7f6965efc64d3832be7bf2b684aed91c7976130ea4b0cd328fbdc25759de6ceed7f3bb18392ef0bb603fe4c91bd9184c67891f9addd',
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'personalization_id',
        value: 'v1_zXh80kSutP2xpPJtstwSAA==',
        domain: '.twitter.com',
        path: '/',
        secure: true
      }
    ]);
    
    console.log('🌐 访问Twitter首页...');
    
    await page.goto('https://twitter.com/home', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    console.log('📄 页面标题:', await page.title());
    
    // 检查页面内容，看是否需要登录
    const pageContent = await page.content();
    
    if (pageContent.includes('登录') || pageContent.includes('注册') || 
        page.url().includes('/login') || page.url().includes('/i/flow/login')) {
      console.log('❌ 检测到登录页面，认证失败');
      
      // 保存登录页面截图
      await page.screenshot({ path: 'login-page-detected.png' });
      console.log('📸 登录页面截图已保存');
      
      return false;
    } else {
      console.log('✅ 可能已登录，页面内容正常');
      
      // 检查是否有用户头像或用户名
      if (pageContent.includes('头像') || pageContent.includes('profile') || 
          pageContent.includes('avatar')) {
        console.log('✅ 检测到用户界面元素');
      } else {
        console.log('⚠️ 未检测到明显的用户界面元素');
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔄 浏览器已关闭');
    }
  }
}

checkAuthStatus().then(isLoggedIn => {
  console.log(`\n🎯 认证状态: ${isLoggedIn ? '已登录' : '未登录'}`);
}).catch(console.error);