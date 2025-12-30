const puppeteer = require('puppeteer');
const fs = require('fs');

async function saveCookiesForPIN() {
  console.log('🍪 保存认证cookies');
  console.log('=' * 30);
  
  const browser = await puppeteer.launch({
    headless: false, // 显示浏览器以便手动登录
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 访问X登录页面
    console.log('🔐 访问X登录页面...');
    await page.goto('https://x.com/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('📋 请在浏览器中完成登录，然后按回车继续...');
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        console.log('✅ 检测到用户输入，继续...');
        resolve();
      });
    });
    
    // 保存cookies
    const cookies = await page.cookies();
    const cookiesDir = 'cookies';
    
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }
    
    // 保存所有cookies
    fs.writeFileSync(`${cookiesDir}/x.com_cookies.json`, JSON.stringify(cookies, null, 2));
    console.log(`✅ 已保存 ${cookies.length} 个cookies`);
    
    // 保存特定域名的cookies
    const xCookies = cookies.filter(cookie => 
      cookie.domain.includes('x.com') || 
      cookie.domain.includes('twitter.com')
    );
    
    fs.writeFileSync(`${cookiesDir}/x_cookies.json`, JSON.stringify(xCookies, null, 2));
    console.log(`✅ 已保存 ${xCookies.length} 个X相关cookies`);
    
    // 截图当前状态
    await page.screenshot({ path: `${cookiesDir}/logged-in-status.png` });
    console.log('✅ 已截图登录状态');
    
  } catch (error) {
    console.error('❌ 保存cookies失败:', error.message);
  } finally {
    await browser.close();
    console.log('✅ 浏览器已关闭');
  }
}

saveCookiesForPIN().catch(console.error);