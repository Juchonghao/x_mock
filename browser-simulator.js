const { chromium } = require('playwright');

async function simulateBrowserFollowCheck() {
  let browser;
  let page;
  
  try {
    console.log('🚀 启动浏览器模拟...');
    
    // 启动浏览器（带UI，方便查看）
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000 // 慢速执行，便于观察
    });
    
    // 创建新的页面
    page = await browser.newPage();
    
    console.log('🔐 设置认证Cookie...');
    
    // 设置认证Cookie（模拟已认证的状态）
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
    
    console.log('✅ 认证Cookie设置完成');
    
    // 先访问主页验证认证
    console.log('🌐 访问Twitter主页验证认证...');
    await page.goto('https://twitter.com', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    console.log('📄 页面标题:', await page.title());
    
    // 等待页面加载完成
    await page.waitForTimeout(3000);
    
    // 检查是否需要登录
    const loginButton = await page.$('a[href*="/login"]');
    if (loginButton) {
      console.log('❌ 检测到登录按钮，认证可能失败');
      console.log('🔍 页面内容预览:', await page.content().substring(0, 500));
    } else {
      console.log('✅ 认证成功，可以访问Twitter页面');
    }
    
    // 测试关注elonmusk
    console.log('\n🔍 测试关注elonmusk...');
    
    // 访问elonmusk的页面
    await page.goto('https://twitter.com/elonmusk', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    
    // 等待页面加载
    await page.waitForTimeout(3000);
    
    // 查找关注按钮
    const followSelectors = [
      '[data-testid="follow"]',
      'div[role="button"]:has-text("关注")',
      'div[role="button"]:has-text("Follow")',
      'button:has-text("关注")',
      'button:has-text("Follow")',
      '[data-testid="User-followButton"]',
      'div[data-testid="follow"]'
    ];
    
    let followButton = null;
    let selectedSelector = null;
    
    for (const selector of followSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          const text = await button.innerText();
          console.log(`🔍 找到按钮 "${selector}"，文本: "${text}"`);
          
          // 检查是否已经是关注状态
          const trimmedText = text.trim().toLowerCase();
          const isFollowing = trimmedText.includes('正在关注') || 
                             trimmedText.includes('following') ||
                             trimmedText.includes('following you') ||
                             trimmedText.includes('互相关注');
          
          if (!isFollowing) {
            followButton = button;
            selectedSelector = selector;
            break;
          } else {
            console.log(`✅ 已经关注 @elonmusk（基于按钮文本: "${text}"）`);
            followButton = button;
            selectedSelector = selector;
            break;
          }
        }
      } catch (error) {
        console.log(`❌ 选择器 "${selector}" 查找失败:`, error.message);
      }
    }
    
    if (!followButton) {
      console.log('❌ 未找到关注按钮');
      console.log('🔍 页面内容分析:');
      
      // 分析页面内容
      const allButtons = await page.$$eval('*', elements => 
        elements.filter(el => el.textContent && el.textContent.trim().length > 0)
                .map(el => ({
                  text: el.textContent.trim(),
                  tag: el.tagName,
                  class: el.className
                }))
                .filter(el => el.textContent.includes('Follow') || el.textContent.includes('关注'))
      );
      
      console.log('找到的按钮:', allButtons.slice(0, 10));
      
      // 截图保存当前状态
      await page.screenshot({ path: 'current_state.png' });
      console.log('📸 已保存截图到 current_state.png');
      
    } else {
      console.log(`✅ 找到关注按钮: "${selectedSelector}"`);
      
      const buttonText = await followButton.innerText();
      console.log(`🔍 当前按钮文本: "${buttonText}"`);
      
      const trimmedText = buttonText.trim().toLowerCase();
      const isFollowing = trimmedText.includes('正在关注') || 
                         trimmedText.includes('following') ||
                         trimmedText.includes('following you') ||
                         trimmedText.includes('互相关注');
      
      if (isFollowing) {
        console.log(`🎉 @elonmusk 已经是关注状态！`);
        console.log('🔍 浏览器模拟验证: 关注成功');
      } else {
        console.log('🔍 点击关注按钮...');
        
        try {
          // 点击关注按钮
          await followButton.click();
          console.log('✅ 点击关注按钮成功');
          
          // 等待状态更新
          await page.waitForTimeout(5000);
          
          // 重新检查按钮状态
          const updatedButton = await page.$(selectedSelector);
          if (updatedButton) {
            const updatedText = await updatedButton.innerText();
            const updatedTrimmedText = updatedText.trim().toLowerCase();
            
            console.log(`🔄 更新后的按钮文本: "${updatedText}"`);
            
            const isNowFollowing = updatedTrimmedText.includes('正在关注') || 
                                 updatedTrimmedText.includes('following') ||
                                 updatedTrimmedText.includes('following you') ||
                                 updatedTrimmedText.includes('互相关注');
            
            if (isNowFollowing) {
              console.log(`🎉 关注成功！@elonmusk 现在已关注`);
            } else {
              console.log('❌ 关注可能失败，状态未更新');
            }
          }
          
          // 截图保存
          await page.screenshot({ path: 'after_follow_click.png' });
          console.log('📸 已保存截图到 after_follow_click.png');
          
        } catch (error) {
          console.log('❌ 点击关注按钮失败:', error.message);
        }
      }
    }
    
    console.log('\n🎯 浏览器模拟检查完成！');
    console.log('🔍 手动验证: 请查看浏览器窗口中的实际状态');
    
    // 保持浏览器打开一段时间供手动验证
    console.log('⏳ 浏览器将保持打开30秒供您手动验证...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ 浏览器模拟失败:', error);
  } finally {
    if (browser) {
      console.log('🔄 关闭浏览器...');
      await browser.close();
    }
  }
}

// 运行模拟
simulateBrowserFollowCheck();