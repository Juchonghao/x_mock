const { chromium } = require('playwright');
const fs = require('fs');

async function testAuthTokenDirect() {
  console.log('🔍 直接测试Auth Token有效性...\n');

  let browser;
  let page;
  
  try {
    // 启动浏览器
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

    // 直接访问一个用户页面
    const testUser = 'elonmusk';
    console.log(`🔗 直接访问用户页面: @${testUser}`);
    
    await page.goto(`https://twitter.com/${testUser}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(8000);
    
    // 截图查看当前状态
    await page.screenshot({ path: 'direct_user_page_access.png' });
    console.log('📸 已保存直接访问页面截图');

    // 检查页面内容
    const pageTitle = await page.title();
    console.log(`📄 页面标题: ${pageTitle}`);
    
    const currentUrl = page.url();
    console.log(`🔗 当前URL: ${currentUrl}`);

    // 检查是否被重定向到登录页面
    if (currentUrl.includes('/login') || pageTitle.includes('登录') || pageTitle.includes('Sign in')) {
      console.log('❌ 被重定向到登录页面，Auth Token可能无效');
      return { success: false, message: 'Auth Token无效，被重定向到登录页面' };
    }

    // 检查是否存在用户内容
    const userContent = await page.$('[data-testid="UserName"]');
    if (userContent) {
      console.log('✅ 成功访问用户页面，找到用户内容');
    } else {
      console.log('⚠️ 未找到用户内容，可能需要登录');
    }

    // 查找关注按钮（更全面的选择器）
    const followSelectors = [
      'div[data-testid="follow"]',
      'div[role="button"][data-testid="follow"]',
      '[data-testid="follow"]',
      'button[data-testid="follow"]',
      'div[aria-label*="Follow"]',
      'div[aria-label*="关注"]'
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
      console.log('❌ 未找到关注按钮');
      
      // 检查是否存在任何按钮元素
      const allButtons = await page.$$('button, div[role="button"], [data-testid]');
      console.log(`🔍 页面中找到 ${allButtons.length} 个按钮/交互元素`);
      
      // 保存页面HTML用于分析
      const pageContent = await page.content();
      await fs.writeFileSync('page_content_analysis.html', pageContent);
      console.log('💾 已保存页面内容到 page_content_analysis.html');
      
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

    return { 
      success: true, 
      message: `Auth Token有效，成功访问用户页面`,
      isFollowing: isFollowing,
      buttonText: buttonText,
      pageTitle: pageTitle,
      currentUrl: currentUrl
    };

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      console.log('\n🔚 浏览器保持开启供手动检查...');
      // 不关闭浏览器
    }
  }
}

// 运行测试
testAuthTokenDirect().then(result => {
  console.log('\n📋 Auth Token测试结果:');
  console.log(`- 成功: ${result?.success || false}`);
  console.log(`- 消息: ${result?.message || 'N/A'}`);
  if (result?.error) {
    console.log(`- 错误: ${result.error}`);
  }
  if (result?.isFollowing !== undefined) {
    console.log(`- 关注状态: ${result.isFollowing ? '已关注' : '未关注'}`);
  }
  if (result?.pageTitle) {
    console.log(`- 页面标题: ${result.pageTitle}`);
  }
  if (result?.currentUrl) {
    console.log(`- 当前URL: ${result.currentUrl}`);
  }
}).catch(error => {
  console.error('💥 测试失败:', error);
});