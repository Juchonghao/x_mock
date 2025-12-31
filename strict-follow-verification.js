const { chromium } = require('playwright');

async function strictFollowVerification() {
  let browser;
  let page;
  
  try {
    console.log('🔍 开始严格的关注验证测试...');
    
    // 启动浏览器
    browser = await chromium.launch({ headless: true });
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
    
    console.log('🌐 访问测试页面验证认证...');
    
    // 先访问设置页面验证认证
    try {
      await page.goto('https://twitter.com/settings/account', { 
        timeout: 15000,
        waitUntil: 'domcontentloaded'
      });
      console.log('✅ 认证验证成功');
    } catch (error) {
      console.log('❌ 认证验证失败:', error.message);
      return;
    }
    
    // 测试几个不同的用户
    const testUsers = ['elonmusk', 'sundarpichai', 'satyanadella'];
    
    for (const username of testUsers) {
      console.log(`\n🔍 测试用户: @${username}`);
      
      try {
        // 访问用户页面
        await page.goto(`https://twitter.com/${username}`, { 
          timeout: 20000,
          waitUntil: 'domcontentloaded'
        });
        
        console.log(`📍 页面URL: ${page.url()}`);
        
        // 等待页面加载
        await page.waitForTimeout(3000);
        
        // 查找关注按钮 - 更严格的验证
        const buttonSelectors = [
          '[data-testid="follow"]',
          'div[role="button"]',
          'button'
        ];
        
        let followButton = null;
        let buttonText = '';
        let selector = '';
        
        for (const sel of buttonSelectors) {
          try {
            const buttons = await page.$$(sel);
            console.log(`🔍 检查选择器 "${sel}"，找到 ${buttons.length} 个按钮`);
            
            for (let i = 0; i < buttons.length && !followButton; i++) {
              const button = buttons[i];
              try {
                const text = await button.innerText();
                if (text && (text.includes('Follow') || text.includes('关注'))) {
                  buttonText = text;
                  followButton = button;
                  selector = `${sel}[${i}]`;
                  console.log(`✅ 找到关注按钮 "${selector}"，文本: "${text}"`);
                  break;
                }
              } catch (textError) {
                // 忽略获取文本失败的按钮
              }
            }
          } catch (selError) {
            console.log(`❌ 选择器 "${sel}" 失败: ${selError.message}`);
          }
        }
        
        if (!followButton) {
          console.log(`❌ 未找到 @${username} 的关注按钮`);
          
          // 分析页面状态
          const pageContent = await page.content();
          
          // 检查是否包含登录相关元素
          if (pageContent.includes('Log in') || pageContent.includes('登录')) {
            console.log(`❌ 页面显示登录提示，认证可能失败`);
          } else {
            console.log(`✅ 页面正常加载，但未找到关注按钮`);
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
        
        console.log(`📊 按钮分析:`);
        console.log(`   原始文本: "${buttonText}"`);
        console.log(`   清理后: "${trimmedText}"`);
        console.log(`   是否已关注: ${isFollowing ? '是' : '否'}`);
        
        if (isFollowing) {
          console.log(`🎉 @${username} 已经是关注状态`);
        } else {
          console.log(`🔍 @${username} 不是关注状态`);
          
          // 尝试点击关注（仅测试，不真正执行）
          console.log(`🖱️ 模拟点击关注按钮...`);
          
          try {
            await followButton.click();
            console.log(`✅ 点击关注按钮成功`);
            
            // 等待状态更新
            await page.waitForTimeout(10000);
            
            // 重新检查按钮状态
            try {
              const updatedButton = await page.$(selector);
              if (updatedButton) {
                const updatedText = await updatedButton.innerText();
                const updatedTrimmed = updatedText.trim().toLowerCase();
                
                console.log(`🔄 更新后按钮文本: "${updatedText}"`);
                
                const isNowFollowing = updatedTrimmed.includes('正在关注') || 
                                     updatedTrimmed.includes('following') ||
                                     updatedTrimmed.includes('following you') ||
                                     updatedTrimmed.includes('互相关注');
                
                if (isNowFollowing) {
                  console.log(`🎉 关注成功！@${username} 现在已关注`);
                } else {
                  console.log(`❌ 关注可能失败，状态未更新`);
                }
              }
            } catch (checkError) {
              console.log(`❌ 状态检查失败: ${checkError.message}`);
            }
            
          } catch (clickError) {
            console.log(`❌ 点击关注按钮失败: ${clickError.message}`);
          }
        }
        
      } catch (userError) {
        console.log(`❌ 测试 @${username} 失败: ${userError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 验证测试失败:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔄 浏览器已关闭');
    }
  }
}

// 运行测试
strictFollowVerification().then(() => {
  console.log('\n🎯 严格验证测试完成！');
}).catch(console.error);