const { chromium } = require('playwright');

async function finalFollowVerification() {
  let browser;
  let page;
  
  try {
    console.log('🎯 最终关注验证测试 - 手动浏览器检查...');
    
    // 启动浏览器（带UI，手动验证）
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 2000  // 慢速执行，便于观察
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
    
    console.log('🌐 打开浏览器进行手动验证...');
    console.log('📝 请查看浏览器窗口中打开的Twitter页面');
    
    // 访问主页验证认证
    console.log('🔐 验证认证状态...');
    try {
      await page.goto('https://x.com', { 
        timeout: 20000,
        waitUntil: 'networkidle'
      });
      
      console.log('✅ 认证验证完成，当前页面:', page.url());
      
      // 检查是否需要登录
      const loginBtn = await page.$('a[href*="/login"]');
      if (loginBtn) {
        console.log('❌ 检测到登录页面，认证可能失败');
      } else {
        console.log('✅ 认证成功，可以访问Twitter页面');
      }
      
    } catch (error) {
      console.log('❌ 认证验证失败:', error.message);
      return;
    }
    
    // 测试几个我们之前"关注"过的用户
    const testUsers = ['elonmusk', 'Tesla', 'satyanadella'];
    
    for (const username of testUsers) {
      console.log(`\n🔍 检查 @${username} 的关注状态...`);
      
      try {
        // 访问用户页面
        await page.goto(`https://x.com/${username}`, { 
          timeout: 20000,
          waitUntil: 'networkidle'
        });
        
        console.log(`📍 访问页面: ${page.url()}`);
        
        // 等待页面完全加载
        await page.waitForTimeout(5000);
        
        // 截图保存当前状态
        await page.screenshot({ 
          path: `follow_status_${username}.png`,
          fullPage: true 
        });
        console.log(`📸 已保存 ${username} 的页面截图`);
        
        // 查找关注按钮
        console.log('🔍 搜索关注按钮...');
        
        const possibleSelectors = [
          '[data-testid="follow"]',
          'div[role="button"]:has-text("关注")',
          'div[role="button"]:has-text("Follow")',
          'button:has-text("关注")',
          'button:has-text("Follow")',
          'div[data-testid="follow"]'
        ];
        
        let followButton = null;
        let buttonText = '';
        let selector = '';
        
        for (const sel of possibleSelectors) {
          try {
            const button = await page.$(sel);
            if (button) {
              const text = await button.innerText();
              console.log(`✅ 找到按钮 "${sel}"，文本: "${text}"`);
              followButton = button;
              buttonText = text;
              selector = sel;
              break;
            }
          } catch (error) {
            console.log(`❌ 选择器 "${sel}" 失败: ${error.message}`);
          }
        }
        
        if (!followButton) {
          console.log(`❌ 未找到 @${username} 的关注按钮`);
          
          // 分析页面状态
          const pageContent = await page.content();
          
          if (pageContent.includes('Log in') || pageContent.includes('登录')) {
            console.log(`❌ 页面显示登录提示`);
          } else {
            console.log(`⚠️ 页面正常加载但未找到关注按钮`);
          }
          
          continue;
        }
        
        // 分析按钮状态
        const trimmedText = buttonText.trim().toLowerCase();
        const isFollowing = trimmedText.includes('正在关注') || 
                           trimmedText.includes('following') ||
                           trimmedText.includes('following you') ||
                           trimmedText.includes('互相关注') ||
                           trimmedText.includes('following and muting');
        
        console.log(`\n📊 @${username} 的关注状态分析:`);
        console.log(`   按钮文本: "${buttonText}"`);
        console.log(`   清理后: "${trimmedText}"`);
        console.log(`   是否已关注: ${isFollowing ? '✅ 是' : '❌ 否'}`);
        
        if (isFollowing) {
          console.log(`🎉 确认: @${username} 已经是关注状态`);
        } else {
          console.log(`❌ 确认: @${username} 不是关注状态`);
          
          console.log('⚠️ 注意: API报告关注成功，但实际页面显示未关注');
          console.log('🔍 这可能是因为:');
          console.log('   1. 关注操作被Twitter反自动化机制阻止');
          console.log('   2. 关注状态需要更长时间才能反映在页面上');
          console.log('   3. API的验证逻辑存在问题');
        }
        
        // 等待用户手动确认
        console.log(`\n⏳ 等待10秒供您手动验证...`);
        await page.waitForTimeout(10000);
        
      } catch (userError) {
        console.log(`❌ 检查 @${username} 失败: ${userError.message}`);
      }
    }
    
    console.log('\n🎯 验证完成！');
    console.log('📋 总结:');
    console.log('1. API可能报告成功，但实际关注可能未成功');
    console.log('2. Twitter可能有反自动化措施阻止关注操作');
    console.log('3. 建议手动登录Twitter检查关注列表');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    console.log('\n🔄 关闭浏览器...');
    if (browser) {
      await browser.close();
    }
  }
}

// 运行最终验证
finalFollowVerification().then(() => {
  console.log('\n✅ 最终验证完成！');
}).catch(console.error);