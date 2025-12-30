const PlaywrightDMService = require('./src/services/playwrightDMService.js');

async function loginAndSaveSession() {
  const service = new PlaywrightDMService();
  
  try {
    console.log('🚀 启动登录并保存会话...');
    
    await service.initialize();
    
    // 访问登录页面
    await service.page.goto('https://x.com/login', { 
      waitUntil: 'networkidle',
      timeout: 20000 
    });
    
    await service.humanDelay(3000, 5000);
    
    // 拍摄登录页面状态
    await service.screenshot('login-page-initial.png');
    
    console.log('📋 请手动完成登录流程：');
    console.log('1. 在浏览器中输入您的用户名/邮箱');
    console.log('2. 输入密码');
    console.log('3. 完成2FA验证（如有）');
    console.log('4. 登录成功后，我会自动保存cookies');
    
    // 等待用户手动登录
    console.log('\n⏳ 等待登录完成...');
    
    // 定期检查登录状态
    let loginAttempts = 0;
    const maxAttempts = 60; // 最多等待30分钟（30秒 × 60次）
    
    while (loginAttempts < maxAttempts) {
      await service.humanDelay(30000, 30000); // 等待30秒
      
      try {
        // 检查当前URL
        const currentUrl = service.page.url();
        console.log(`🔍 检查登录状态 (${loginAttempts + 1}/${maxAttempts}): ${currentUrl}`);
        
        // 如果URL不再是登录页面，说明登录成功
        if (!currentUrl.includes('/login') && !currentUrl.includes('/flow/login')) {
          console.log('✅ 检测到登录成功！');
          break;
        }
        
        // 检查页面内容
        const pageTitle = await service.page.title();
        if (!pageTitle.includes('登录') && !pageTitle.includes('login')) {
          console.log('✅ 页面标题显示登录成功！');
          break;
        }
        
      } catch (error) {
        console.log(`⚠️ 检查登录状态时出错: ${error.message}`);
      }
      
      loginAttempts++;
    }
    
    if (loginAttempts >= maxAttempts) {
      console.log('❌ 等待登录超时，请手动完成登录后重新运行此脚本');
      return false;
    }
    
    // 等待页面完全加载
    await service.humanDelay(5000, 8000);
    
    // 拍摄登录后状态
    await service.screenshot('login-success.png');
    
    // 保存cookies
    console.log('💾 保存登录状态...');
    await service.saveCookies();
    
    // 验证登录状态
    console.log('🔍 验证登录状态...');
    const isLoggedIn = await service.checkLoginStatus();
    
    if (isLoggedIn) {
      console.log('🎉 登录状态验证成功！');
      console.log('✅ 会话已保存，下次可以直接使用');
      
      // 测试私信页面访问
      console.log('💬 测试私信页面访问...');
      await service.page.goto('https://x.com/messages', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      await service.humanDelay(3000, 5000);
      
      const dmUrl = service.page.url();
      if (dmUrl.includes('/messages')) {
        console.log('✅ 成功访问私信页面！');
        await service.screenshot('messages-page-access.png');
      } else {
        console.log('⚠️ 访问私信页面时出现问题');
      }
      
    } else {
      console.log('❌ 登录状态验证失败');
    }
    
    return isLoggedIn;
    
  } catch (error) {
    console.error('❌ 登录保存失败:', error);
    return false;
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

// 运行登录保存
if (require.main === module) {
  loginAndSaveSession().then(success => {
    if (success) {
      console.log('\n🏁 登录完成！可以运行私信功能测试了。');
    } else {
      console.log('\n❌ 登录失败，请检查登录流程。');
    }
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}

module.exports = { loginAndSaveSession };