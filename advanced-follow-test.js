const { chromium } = require('playwright');

async function advancedFollowTest() {
  let browser;
  let page;
  
  try {
    console.log('🔍 开始高级关注测试...');
    
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 100  // 添加延迟，看起来更像人类操作
    });
    
    page = await browser.newPage();
    
    // 启用网络请求监控
    page.on('request', request => {
      if (request.url().includes('follow') || request.url().includes('following')) {
        console.log(`🌐 网络请求: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('follow') || response.url().includes('following')) {
        console.log(`📡 网络响应: ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('🔐 设置认证Cookie...');
    
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
    
    console.log('🌐 访问 @jack 页面...');
    
    await page.goto('https://twitter.com/jack', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    
    // 等待页面完全加载
    await page.waitForTimeout(5000);
    
    // 保存点击前的截图
    await page.screenshot({ path: 'before-follow-click.png' });
    console.log('📸 点击前截图已保存');
    
    // 查找关注按钮 - 使用更精确的选择器
    const followButton = await page.$('button[data-testid="12-follow"]');
    
    if (!followButton) {
      console.log('❌ 未找到关注按钮');
      return;
    }
    
    const buttonText = await followButton.innerText();
    console.log(`📝 找到关注按钮，文本: "${buttonText}"`);
    
    // 分析按钮状态
    const isFollowing = buttonText.toLowerCase().includes('following') || 
                       buttonText.toLowerCase().includes('正在关注');
    
    console.log(`📊 按钮状态分析: ${isFollowing ? '已关注' : '未关注'}`);
    
    if (isFollowing) {
      console.log('🎉 @jack 已经是关注状态');
      return;
    }
    
    console.log('🖱️ 准备点击关注按钮...');
    
    // 模拟人类点击行为
    const buttonBox = await followButton.boundingBox();
    if (buttonBox) {
      console.log(`📍 按钮位置: x=${buttonBox.x}, y=${buttonBox.y}`);
      
      // 移动鼠标到按钮上
      await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
      await page.waitForTimeout(500);  // 模拟悬停
      
      // 点击按钮
      console.log('👆 点击关注按钮...');
      await followButton.click();
      
      console.log('⏳ 等待状态更新（15秒）...');
      
      // 等待更长时间，让页面有时间更新
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(1000);
        const currentText = await followButton.innerText();
        console.log(`⏰ ${i + 1}秒后，按钮文本: "${currentText}"`);
        
        const isNowFollowing = currentText.toLowerCase().includes('following') || 
                              currentText.toLowerCase().includes('正在关注');
        
        if (isNowFollowing) {
          console.log('🎉 关注成功！按钮状态已更新！');
          break;
        }
      }
      
      // 保存点击后的截图
      await page.screenshot({ path: 'after-follow-click.png' });
      console.log('📸 点击后截图已保存');
      
      // 最终检查按钮状态
      const finalText = await followButton.innerText();
      const finalIsFollowing = finalText.toLowerCase().includes('following') || 
                              finalText.toLowerCase().includes('正在关注');
      
      console.log(`\n📋 最终结果:`);
      console.log(`- 点击前: "${buttonText}"`);
      console.log(`- 点击后: "${finalText}"`);
      console.log(`- 关注状态: ${finalIsFollowing ? '成功' : '失败'}`);
      
      if (finalIsFollowing) {
        console.log('🎉 关注 @jack 成功！');
      } else {
        console.log('❌ 关注 @jack 失败，可能被Twitter的防自动化系统阻止');
      }
      
    } else {
      console.log('❌ 无法获取按钮位置信息');
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

advancedFollowTest().then(() => {
  console.log('\n🎯 高级关注测试完成！');
}).catch(console.error);