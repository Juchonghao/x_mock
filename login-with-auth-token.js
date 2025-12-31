const { chromium } = require('playwright');

async function loginWithAuthToken() {
  console.log('🔐 开始使用Auth Token登录Twitter...\n');

  let browser;
  let page;
  
  try {
    // 启动浏览器（无头模式，调试用）
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 2000
    });
    
    page = await browser.newPage();
    
    console.log('🍪 设置Auth Token Cookie...');
    
    // 设置认证Cookie
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

    console.log('✅ Auth Token Cookie设置完成');

    // 访问Twitter主页
    console.log('🌐 访问Twitter主页进行登录验证...');
    await page.goto('https://twitter.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(5000);
    
    // 截图查看当前状态
    await page.screenshot({ path: 'twitter_login_status.png' });
    console.log('📸 已保存登录状态截图');

    // 检查是否已登录（查找用户头像或菜单）
    const userMenuSelectors = [
      '[data-testid="UserAvatar-Container"]',
      '[aria-label="Account"]',
      '[data-testid="AppTabBar_More_Link"]'
    ];

    let isLoggedIn = false;
    for (const selector of userMenuSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          isLoggedIn = true;
          console.log(`✅ 找到登录指示器: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`❌ 选择器 ${selector} 未找到`);
      }
    }

    if (!isLoggedIn) {
      // 尝试查找登录按钮
      const loginButton = await page.$('a[href="/login"]');
      if (loginButton) {
        console.log('❌ 检测到需要登录，尝试点击登录按钮...');
        await loginButton.click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'twitter_after_login_click.png' });
        console.log('📸 已保存点击登录后截图');
        
        // 检查登录状态
        const loggedInCheck = await page.$('[data-testid="UserAvatar-Container"]');
        if (loggedInCheck) {
          console.log('✅ 登录成功！');
        } else {
          console.log('⚠️ 登录状态不确定，请手动检查页面');
        }
      }
    } else {
      console.log('🎉 已成功登录Twitter！');
    }

    // 访问一个用户页面测试关注功能
    const testUser = 'elonmusk';
    console.log(`\n🔗 测试访问用户页面: @${testUser}`);
    
    await page.goto(`https://twitter.com/${testUser}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(5000);
    
    // 查找关注按钮
    const followSelectors = [
      'div[data-testid="follow"]',
      'div[role="button"][data-testid="follow"]',
      '[data-testid="follow"]'
    ];

    let followButton = null;
    let foundSelector = null;

    for (const selector of followSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          followButton = button;
          foundSelector = selector;
          console.log(`✅ 找到关注按钮: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`❌ 选择器 ${selector} 失败:`, error.message);
      }
    }

    if (!followButton) {
      console.log('❌ 未找到关注按钮，页面可能需要更多时间加载');
      // 截图保存当前状态
      await page.screenshot({ path: 'user_page_no_follow_button.png' });
      return { success: false, message: '未找到关注按钮' };
    }

    const buttonText = await followButton.innerText();
    console.log(`🔍 关注按钮文本: "${buttonText}"`);
    
    // 分析按钮状态
    const trimmedText = buttonText.trim().toLowerCase();
    const isFollowing = trimmedText.includes('正在关注') || 
                       trimmedText.includes('following') ||
                       trimmedText.includes('following you') ||
                       trimmedText.includes('互相关注') ||
                       trimmedText.includes('following and muting');

    console.log(`📊 按钮状态分析:`);
    console.log(`- 原始文本: "${buttonText}"`);
    console.log(`- 清理后文本: "${trimmedText}"`);
    console.log(`- 是否已关注: ${isFollowing ? '是' : '否'}`);

    // 截图保存用户页面状态
    await page.screenshot({ path: `user_page_${testUser}_status.png` });

    return { 
      success: true, 
      message: `登录成功，找到关注按钮，状态: ${isFollowing ? '已关注' : '未关注'}`,
      isFollowing: isFollowing,
      buttonText: buttonText
    };

  } catch (error) {
    console.error('❌ 登录测试过程中出错:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      console.log('\n🔚 保持浏览器开启以便手动检查（按Ctrl+C关闭）');
      // 不关闭浏览器，让用户可以手动检查
    }
  }
}

// 运行测试
loginWithAuthToken().then(result => {
  console.log('\n📋 登录测试结果:');
  console.log(`- 成功: ${result?.success || false}`);
  console.log(`- 消息: ${result?.message || 'N/A'}`);
  if (result?.error) {
    console.log(`- 错误: ${result.error}`);
  }
  if (result?.isFollowing !== undefined) {
    console.log(`- 关注状态: ${result.isFollowing ? '已关注' : '未关注'}`);
  }
}).catch(error => {
  console.error('💥 登录测试失败:', error);
});