const { chromium } = require('playwright');

async function testNewAuth() {
  let browser;
  let page;
  
  try {
    console.log('🔍 测试新的认证信息...');
    
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    
    console.log('🔐 设置新的认证Cookie...');
    
    // 解码 twid
    const decodedTwid = decodeURIComponent('u%3D555586849');
    console.log('📊 解码后的 twid:', decodedTwid);
    
    // 设置认证Cookie - 使用 twitter.com 域
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'a0e70e3e33feb8e71f2bf751827ef282fe412ea8',
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'ct0',
        value: 'bf082f5fa878915a307cb5c2cd31c6d8422df48258155bc8687deb89b9a15d0cebbdce0d0add36e7c10d00a86e7c815f4718e661035940133ff85bcdfa8b5e908297354d0ca3e83341c773dda8682c02',
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'twid',
        value: decodedTwid,
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true
      }
    ]);
    
    // 也设置 x.com 域的 Cookie
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'a0e70e3e33feb8e71f2bf751827ef282fe412ea8',
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'ct0',
        value: 'bf082f5fa878915a307cb5c2cd31c6d8422df48258155bc8687deb89b9a15d0cebbdce0b',
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'twid',
        value: decodedTwid,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true
      }
    ]);
    
    console.log('✅ 认证Cookie设置完成');
    
    console.log('🌐 测试访问Twitter设置页面...');
    
    // 先尝试访问设置页面（之前成功的页面）
    await page.goto('https://twitter.com/settings/account', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    
    // 检查是否需要登录
    if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
      console.log('❌ 被重定向到登录页面，认证仍然失败');
      return;
    }
    
    console.log('✅ 认证可能有效！尝试访问 @jack 页面测试关注功能...');
    
    // 访问 @jack 页面测试关注
    await page.goto('https://twitter.com/jack', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    await page.waitForTimeout(3000);
    
    // 查找关注按钮
    const followButton = await page.$('button[data-testid="12-follow"]');
    
    if (!followButton) {
      console.log('❌ 未找到关注按钮');
      return;
    }
    
    const buttonText = await followButton.innerText();
    console.log(`📝 找到关注按钮，文本: "${buttonText}"`);
    
    // 检查按钮状态
    const isFollowing = buttonText.toLowerCase().includes('following') || 
                       buttonText.toLowerCase().includes('正在关注');
    
    console.log(`📊 按钮状态: ${isFollowing ? '已关注' : '未关注'}`);
    
    if (!isFollowing) {
      console.log('🖱️ 尝试点击关注按钮...');
      await followButton.click();
      
      // 等待状态更新
      await page.waitForTimeout(5000);
      
      const newButtonText = await followButton.innerText();
      const isNowFollowing = newButtonText.toLowerCase().includes('following') || 
                            newButtonText.toLowerCase().includes('正在关注');
      
      console.log(`🔄 点击后按钮文本: "${newButtonText}"`);
      console.log(`🎯 关注结果: ${isNowFollowing ? '成功！' : '失败'}`);
      
      if (isNowFollowing) {
        console.log('🎉 关注功能测试成功！认证问题已解决！');
      } else {
        console.log('❌ 关注仍然失败，可能还有其他问题');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔄 浏览器已关闭');
    }
  }
}

testNewAuth().then(() => {
  console.log('\n🎯 新认证信息测试完成！');
}).catch(console.error);