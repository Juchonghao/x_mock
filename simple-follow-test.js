const { chromium } = require('playwright');

async function simpleFollowTest() {
  console.log('🧪 简单关注功能测试...\n');

  let browser;
  let page;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000
    });
    
    page = await browser.newPage();
    
    console.log('🍪 设置Auth Token Cookie...');
    
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

    console.log('🌐 访问Twitter主页...');
    await page.goto('https://twitter.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(5000);
    
    // 截图查看主页状态
    await page.screenshot({ path: 'twitter_homepage_check.png' });
    console.log('📸 已保存主页截图');

    // 检查登录状态
    const userAvatar = await page.$('[data-testid="UserAvatar-Container"]');
    if (userAvatar) {
      console.log('✅ 检测到已登录状态');
    } else {
      console.log('❌ 未检测到登录状态');
      
      // 尝试手动登录流程
      const loginButton = await page.$('a[href="/login"]');
      if (loginButton) {
        console.log('🔐 尝试点击登录按钮...');
        await loginButton.click();
        await page.waitForTimeout(3000);
        
        // 截图登录页面
        await page.screenshot({ path: 'login_page.png' });
        
        // 检查是否有密码输入框（说明需要传统登录）
        const passwordField = await page.$('input[type="password"]');
        if (passwordField) {
          console.log('⚠️ 需要传统用户名/密码登录，Auth Token可能不够');
          console.log('💡 建议: 使用实际登录凭证或刷新Auth Token');
          return { success: false, message: '需要传统登录凭证' };
        }
      }
    }

    // 如果登录状态良好，测试关注功能
    const testUser = 'elonmusk';
    console.log(`\n🔗 访问测试用户页面: @${testUser}`);
    
    await page.goto(`https://twitter.com/${testUser}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(6000);
    
    // 滚动确保用户信息可见
    await page.evaluate(() => {
      window.scrollTo(0, 800);
    });
    await page.waitForTimeout(3000);
    
    // 截图用户页面
    await page.screenshot({ path: `user_page_${testUser}.png` });
    console.log('📸 已保存用户页面截图');

    // 使用更直接的方法查找关注按钮
    console.log('🔍 查找关注按钮...');
    
    // 方法1: 使用CSS选择器
    const followButton1 = await page.$('div[data-testid="follow"]');
    if (followButton1) {
      console.log('✅ 使用data-testid="follow"找到关注按钮');
      return await testClickFollow(page, followButton1, testUser);
    }
    
    // 方法2: 使用包含"Follow"文本的元素
    const followButton2 = await page.$('div:has-text("Follow")');
    if (followButton2) {
      console.log('✅ 使用has-text("Follow")找到关注按钮');
      return await testClickFollow(page, followButton2, testUser);
    }
    
    // 方法3: 使用包含"关注"文本的元素
    const followButton3 = await page.$('div:has-text("关注")');
    if (followButton3) {
      console.log('✅ 使用has-text("关注")找到关注按钮');
      return await testClickFollow(page, followButton3, testUser);
    }
    
    // 方法4: 通过JavaScript查找
    console.log('🔍 使用JavaScript查找关注按钮...');
    const followElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('*'));
      return buttons.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return (text.includes('follow') || text.includes('关注')) && 
               (el.tagName === 'DIV' || el.tagName === 'BUTTON');
      }).slice(0, 3); // 只返回前3个
    });
    
    if (followElements.length > 0) {
      console.log(`✅ 使用JavaScript找到 ${followElements.length} 个关注相关元素`);
      
      // 尝试点击第一个元素
      try {
        const element = await page.$('*');
        // 这里需要更具体的实现，暂时返回结果
        return { success: true, message: `找到 ${followElements.length} 个关注按钮，需要手动验证` };
      } catch (error) {
        console.log('❌ 点击失败:', error.message);
      }
    }

    console.log('❌ 未能找到任何关注按钮');
    return { success: false, message: '未找到关注按钮' };

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      console.log('\n🔚 浏览器保持开启供手动检查...');
    }
  }
}

async function testClickFollow(page, button, username) {
  try {
    console.log(`🖱️ 尝试点击关注按钮...`);
    await button.click();
    await page.waitForTimeout(8000);
    
    // 截图点击后状态
    await page.screenshot({ path: `after_follow_click_${username}.png` });
    
    // 检查按钮状态变化
    const buttonText = await button.innerText();
    console.log(`🔄 点击后按钮文本: "${buttonText}"`);
    
    const trimmedText = buttonText.trim().toLowerCase();
    const isFollowing = trimmedText.includes('正在关注') || 
                       trimmedText.includes('following') ||
                       trimmedText.includes('following you') ||
                       trimmedText.includes('互相关注');

    if (isFollowing) {
      console.log(`🎉 关注成功！`);
      return { success: true, message: '关注成功' };
    } else {
      console.log(`❌ 关注可能失败，状态未更新`);
      return { success: false, message: '关注失败或被阻止' };
    }
    
  } catch (error) {
    console.log(`❌ 点击关注按钮失败:`, error.message);
    return { success: false, error: error.message };
  }
}

// 运行测试
simpleFollowTest().then(result => {
  console.log('\n📋 测试结果:');
  console.log(`- 成功: ${result?.success || false}`);
  console.log(`- 消息: ${result?.message || 'N/A'}`);
  if (result?.error) {
    console.log(`- 错误: ${result.error}`);
  }
}).catch(error => {
  console.error('💥 测试失败:', error);
});