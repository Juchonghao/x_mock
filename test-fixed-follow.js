const { chromium } = require('playwright');
const fs = require('fs');

async function testFixedFollow() {
  console.log('🚀 开始测试修复后的关注功能...\n');

  let browser;
  let page;
  
  try {
    // 启动浏览器
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000
    });
    
    page = await browser.newPage();
    
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

    console.log('✅ 认证Cookie设置完成');

    // 访问一个测试用户的页面
    const testUser = 'elonmusk';
    console.log(`🔗 访问用户页面: @${testUser}`);
    
    await page.goto(`https://twitter.com/${testUser}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(5000);
    
    // 截图当前状态
    await page.screenshot({ path: `test_before_follow_${testUser}.png` });
    console.log('📸 已保存页面截图');

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
          break;
        }
      } catch (error) {
        console.log(`❌ 选择器 ${selector} 失败:`, error.message);
      }
    }

    if (!followButton) {
      throw new Error('❌ 未找到关注按钮');
    }

    const buttonText = await followButton.innerText();
    console.log(`🔍 找到关注按钮，文本: "${buttonText}"`);

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

    if (isFollowing) {
      console.log(`⚠️ 用户 @${testUser} 已经是关注状态，跳过测试`);
      return;
    }

    console.log(`🖱️ 尝试点击关注按钮...`);
    
    try {
      await followButton.click();
      console.log(`✅ 点击关注按钮成功`);
    } catch (error) {
      console.log(`❌ 点击关注按钮失败:`, error.message);
      return;
    }

    // 等待状态更新
    console.log(`⏳ 等待状态更新...`);
    await page.waitForTimeout(10000);

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

      console.log(`📊 更新后状态分析:`);
      console.log(`- 是否已关注: ${isNowFollowing ? '是' : '否'}`);

      if (isNowFollowing) {
        console.log(`🎉 关注成功！@${testUser} 现在已关注`);
        
        // 截图验证
        await page.screenshot({ path: `test_after_follow_${testUser}.png` });
        console.log('📸 已保存关注后截图');
        
        return { success: true, message: `关注 @${testUser} 成功` };
      } else {
        console.log(`❌ 关注可能失败，状态未更新`);
        
        // 截图验证
        await page.screenshot({ path: `test_follow_failed_${testUser}.png` });
        console.log('📸 已保存失败状态截图');
        
        return { success: false, message: `关注 @${testUser} 失败` };
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
testFixedFollow().then(result => {
  console.log('\n📋 测试结果:');
  console.log(`- 成功: ${result?.success || false}`);
  console.log(`- 消息: ${result?.message || 'N/A'}`);
  if (result?.error) {
    console.log(`- 错误: ${result.error}`);
  }
}).catch(error => {
  console.error('💥 测试失败:', error);
});