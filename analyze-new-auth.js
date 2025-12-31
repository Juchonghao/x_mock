const { chromium } = require('playwright');

async function analyzeNewAuth() {
  let browser;
  let page;
  
  try {
    console.log('🔍 分析新认证登录后的页面状态...');
    
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    
    console.log('🔐 设置认证Cookie...');
    
    const decodedTwid = decodeURIComponent('u%3D555586849');
    
    // 设置认证Cookie
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
    
    console.log('🌐 访问 @jack 页面...');
    
    await page.goto('https://twitter.com/jack', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    
    // 等待页面完全加载
    await page.waitForTimeout(5000);
    
    // 保存截图
    await page.screenshot({ path: 'new-auth-jack-page.png' });
    console.log('📸 页面截图已保存');
    
    console.log('\n🔍 分析页面元素...');
    
    // 获取所有按钮元素
    const allButtons = await page.$$('button, div[role="button"]');
    console.log(`📊 找到 ${allButtons.length} 个可交互元素`);
    
    // 查找关注相关的按钮
    console.log('\n🎯 查找关注按钮...');
    
    const followSelectors = [
      'button[data-testid="12-follow"]',
      'button:has-text("关注")',
      'button:has-text("Follow")',
      'div[role="button"]:has-text("关注")',
      'div[role="button"]:has-text("Follow")',
      '[data-testid*="follow"]'
    ];
    
    let foundFollowButton = null;
    let foundSelector = '';
    
    for (const selector of followSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ 选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (let i = 0; i < Math.min(elements.length, 2); i++) {
            const text = await elements[i].innerText();
            const ariaLabel = await elements[i].getAttribute('aria-label');
            console.log(`  元素 ${i + 1}: "${text}" (aria: "${ariaLabel}")`);
            
            if (text.includes('关注') || text.includes('Follow')) {
              foundFollowButton = elements[i];
              foundSelector = selector;
            }
          }
        } else {
          console.log(`❌ 选择器 "${selector}" 未找到元素`);
        }
      } catch (error) {
        console.log(`❌ 选择器 "${selector}" 失败: ${error.message}`);
      }
    }
    
    if (foundFollowButton) {
      console.log(`\n🎉 找到关注按钮！`);
      console.log(`📝 选择器: "${foundSelector}"`);
      
      const buttonText = await foundFollowButton.innerText();
      console.log(`📝 按钮文本: "${buttonText}"`);
      
      const isFollowing = buttonText.toLowerCase().includes('following') || 
                         buttonText.toLowerCase().includes('正在关注');
      
      console.log(`📊 按钮状态: ${isFollowing ? '已关注' : '未关注'}`);
      
      if (!isFollowing) {
        console.log('🖱️ 准备测试关注功能...');
        
        // 点击关注按钮
        await foundFollowButton.click();
        console.log('✅ 关注按钮点击成功');
        
        // 等待状态更新
        console.log('⏳ 等待状态更新...');
        await page.waitForTimeout(8000);
        
        // 重新检查按钮状态
        const newButtonText = await foundFollowButton.innerText();
        const isNowFollowing = newButtonText.toLowerCase().includes('following') || 
                              newButtonText.toLowerCase().includes('正在关注');
        
        console.log(`🔄 点击后按钮文本: "${newButtonText}"`);
        console.log(`🎯 关注结果: ${isNowFollowing ? '🎉 成功！' : '❌ 失败'}`);
        
        if (isNowFollowing) {
          console.log('🎊 关注功能测试成功！认证问题已完全解决！');
        } else {
          console.log('⚠️ 关注可能失败，但认证问题已解决');
        }
      }
      
    } else {
      console.log('\n❌ 未找到关注按钮');
      
      // 分析页面内容，看是否有其他原因
      const pageContent = await page.content();
      
      // 检查页面是否显示错误信息
      if (pageContent.includes('错误') || pageContent.includes('error') || pageContent.includes('Error')) {
        console.log('⚠️ 页面显示错误信息');
      }
      
      // 检查是否需要验证
      if (pageContent.includes('验证') || pageContent.includes('verify') || pageContent.includes('Verify')) {
        console.log('⚠️ 可能需要额外的验证步骤');
      }
    }
    
    // 检查页面整体状态
    console.log('\n📋 页面状态总结:');
    console.log(`- URL: ${page.url()}`);
    console.log(`- 标题: ${await page.title()}`);
    
    // 获取页面内容进行分析
    const pageContent = await page.content();
    
    // 检查是否有用户信息显示
    const hasUserInfo = pageContent.includes('jack') || pageContent.includes('@jack');
    console.log(`- 显示用户信息: ${hasUserInfo ? '是' : '否'}`);
    
    // 检查是否在登录状态
    const isLoggedIn = !pageContent.includes('登录') && !pageContent.includes('Log in');
    console.log(`- 登录状态: ${isLoggedIn ? '已登录' : '未登录'}`);
    
    // 检查是否有关注相关的错误信息
    if (pageContent.includes('限制') || pageContent.includes('limit') || pageContent.includes('blocked')) {
      console.log('⚠️ 检测到可能的行为限制或阻止');
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔄 浏览器已关闭');
    }
  }
}

analyzeNewAuth().then(() => {
  console.log('\n🎯 新认证状态分析完成！');
}).catch(console.error);