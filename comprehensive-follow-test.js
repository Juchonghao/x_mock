const { chromium } = require('playwright');

async function comprehensiveFollowTest() {
  let browser;
  let page;
  
  try {
    console.log('🔍 开始全面关注测试...');
    
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 200  // 模拟人类操作速度
    });
    
    page = await browser.newPage();
    
    // 启用详细网络监控
    page.on('request', request => {
      if (request.url().includes('follow') || request.url().includes('following') || request.url().includes('unfollow')) {
        console.log(`🌐 关注相关请求: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('follow') || response.url().includes('following')) {
        console.log(`📡 关注相关响应: ${response.status()} ${response.url()}`);
        if (response.status() >= 400) {
          console.log(`❌ 关注请求失败: HTTP ${response.status()}`);
        }
      }
    });
    
    // 监控页面错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🚨 页面错误: ${msg.text()}`);
      }
    });
    
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
      waitUntil: 'networkidle'
    });
    
    console.log('📍 当前页面URL:', page.url());
    
    // 等待页面完全加载
    await page.waitForTimeout(5000);
    
    // 保存点击前截图
    await page.screenshot({ path: 'comprehensive-before-follow.png' });
    console.log('📸 点击前截图已保存');
    
    // 查找关注按钮
    const followButton = await page.$('button[data-testid="12-follow"]');
    
    if (!followButton) {
      console.log('❌ 未找到关注按钮');
      return;
    }
    
    const buttonText = await followButton.innerText();
    console.log(`📝 找到关注按钮，文本: "${buttonText}"`);
    
    const isFollowing = buttonText.toLowerCase().includes('following') || 
                       buttonText.toLowerCase().includes('正在关注');
    
    console.log(`📊 按钮状态: ${isFollowing ? '已关注' : '未关注'}`);
    
    if (isFollowing) {
      console.log('🎉 @jack 已经是关注状态');
      return;
    }
    
    console.log('🖱️ 开始关注流程测试...');
    
    // 获取按钮位置
    const buttonBox = await followButton.boundingBox();
    if (buttonBox) {
      console.log(`📍 按钮位置: x=${buttonBox.x}, y=${buttonBox.y}, width=${buttonBox.width}, height=${buttonBox.height}`);
      
      // 模拟更真实的人类操作
      console.log('👆 模拟人类点击行为...');
      
      // 1. 鼠标悬停
      await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
      await page.waitForTimeout(1000);
      
      // 2. 点击按钮
      console.log('🖱️ 点击关注按钮...');
      await followButton.click();
      
      // 3. 等待响应
      console.log('⏳ 等待Twitter响应（30秒）...');
      
      // 长时间等待并监控状态变化
      let success = false;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1000);
        
        try {
          const currentText = await followButton.innerText();
          const currentIsFollowing = currentText.toLowerCase().includes('following') || 
                                    currentText.toLowerCase().includes('正在关注');
          
          if (currentIsFollowing) {
            console.log(`🎉 第${i + 1}秒：关注成功！按钮文本变为: "${currentText}"`);
            success = true;
            break;
          } else if (i % 5 === 0) {
            console.log(`⏰ 第${i + 1}秒：按钮文本仍为 "${currentText}"`);
          }
          
        } catch (error) {
          console.log(`❌ 第${i + 1}秒：获取按钮文本失败: ${error.message}`);
        }
      }
      
      // 保存点击后截图
      await page.screenshot({ path: 'comprehensive-after-follow.png' });
      console.log('📸 点击后截图已保存');
      
      // 最终检查
      const finalText = await followButton.innerText();
      const finalIsFollowing = finalText.toLowerCase().includes('following') || 
                              finalText.toLowerCase().includes('正在关注');
      
      console.log('\n📋 最终结果:');
      console.log(`- 点击前: "${buttonText}"`);
      console.log(`- 点击后: "${finalText}"`);
      console.log(`- 关注结果: ${finalIsFollowing ? '🎉 成功！' : '❌ 失败'}`);
      
      if (success || finalIsFollowing) {
        console.log('🎊 关注功能测试成功！');
      } else {
        console.log('⚠️ 关注可能失败，可能的原因:');
        console.log('  1. Twitter防自动化系统阻止了操作');
        console.log('  2. 需要更长的等待时间');
        console.log('  3. 网络延迟或服务器问题');
        console.log('  4. 需要额外的用户验证');
        
        // 检查页面是否有错误提示
        try {
          const pageContent = await page.content();
          if (pageContent.includes('限制') || pageContent.includes('limit')) {
            console.log('🔍 检测到可能的行为限制提示');
          }
          if (pageContent.includes('验证') || pageContent.includes('verify')) {
            console.log('🔍 可能需要额外的验证步骤');
          }
        } catch (e) {
          console.log('❌ 无法检查页面内容');
        }
      }
    } else {
      console.log('❌ 无法获取按钮位置');
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

comprehensiveFollowTest().then(() => {
  console.log('\n🎯 全面关注测试完成！');
}).catch(console.error);