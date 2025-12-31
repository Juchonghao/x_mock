const { chromium } = require('playwright');

async function testFollowStatus() {
  let browser;
  let page;
  
  try {
    console.log('🔍 创建一个简单的关注状态测试...');
    
    // 启动浏览器（无头模式，快速测试）
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    
    console.log('🔐 设置认证Cookie...');
    
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
    
    console.log('🌐 测试访问Twitter设置页面...');
    
    // 直接访问设置页面（这是我们之前成功过的页面）
    await page.goto('https://twitter.com/settings/account', { 
      timeout: 15000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    console.log('📄 页面标题:', await page.title());
    
    // 检查是否需要登录
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      console.log('❌ 认证失败，被重定向到登录页面');
      return;
    }
    
    console.log('✅ 认证有效，可以访问Twitter页面');
    
    // 访问 @jack 页面
    console.log('\n🔍 访问 @jack 页面...');
    
    await page.goto('https://twitter.com/jack', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    
    // 等待页面加载
    await page.waitForTimeout(3000);
    
    // 查找关注按钮 - 使用多种选择器
    const buttonSelectors = [
      'div[role="button"]:has-text("关注")',
      'div[role="button"]:has-text("Follow")', 
      '[data-testid="follow"]',
      'button:has-text("关注")',
      'button:has-text("Follow")',
      'div[data-testid="follow"]'
    ];
    
    console.log('🔍 搜索关注按钮...');
    
    let foundButton = null;
    let buttonText = '';
    let foundSelector = '';
    
    for (const selector of buttonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          buttonText = await button.innerText();
          console.log(`✅ 找到按钮: "${selector}"`);
          console.log(`📝 按钮文本: "${buttonText}"`);
          foundButton = button;
          foundSelector = selector;
          break;
        }
      } catch (error) {
        console.log(`❌ 选择器 "${selector}" 失败: ${error.message}`);
      }
    }
    
    if (!foundButton) {
      console.log('❌ 未找到关注按钮');
      
      // 分析页面状态
      console.log('🔍 分析页面内容...');
      const pageContent = await page.content();
      
      // 检查是否包含关注相关文本
      const followTexts = ['关注', 'follow', 'Following', '正在关注', 'follows you'];
      for (const text of followTexts) {
        if (pageContent.includes(text)) {
          console.log(`✅ 页面中包含文本: "${text}"`);
        }
      }
      
      return;
    }
    
    // 分析按钮状态
    const trimmedText = buttonText.trim().toLowerCase();
    const isFollowing = trimmedText.includes('正在关注') || 
                       trimmedText.includes('following') ||
                       trimmedText.includes('following you') ||
                       trimmedText.includes('互相关注') ||
                       trimmedText.includes('following and muting');
    
    console.log(`\n📊 按钮状态分析:`);
    console.log(`- 原始文本: "${buttonText}"`);
    console.log(`- 清理后文本: "${trimmedText}"`);
    console.log(`- 是否已关注: ${isFollowing ? '是' : '否'}`);
    
    if (isFollowing) {
      console.log('🎉 结论: @jack 已经是关注状态');
    } else {
      console.log('🔍 结论: @jack 不是关注状态，需要点击关注');
      
      // 尝试点击关注
      console.log('🖱️ 尝试点击关注按钮...');
      
      try {
        await foundButton.click();
        console.log('✅ 点击关注按钮成功');
        
        // 等待状态更新
        await page.waitForTimeout(8000);
        
        // 重新检查按钮状态
        const updatedButton = await page.$(foundSelector);
        if (updatedButton) {
          const updatedText = await updatedButton.innerText();
          console.log(`🔄 更新后按钮文本: "${updatedText}"`);
          
          const updatedTrimmed = updatedText.trim().toLowerCase();
          const isNowFollowing = updatedTrimmed.includes('正在关注') || 
                               updatedTrimmed.includes('following') ||
                               updatedTrimmed.includes('following you') ||
                               updatedTrimmed.includes('互相关注');
          
          if (isNowFollowing) {
            console.log('🎉 关注成功！按钮状态已更新');
          } else {
            console.log('❌ 关注可能失败，状态未更新');
          }
        }
      } catch (clickError) {
        console.log('❌ 点击关注按钮失败:', clickError.message);
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

// 运行测试
testFollowStatus().then(() => {
  console.log('\n🎯 关注状态测试完成！');
}).catch(console.error);