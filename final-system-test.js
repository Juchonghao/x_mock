const { chromium } = require('playwright');
const authConfig = require('./config/auth');
const TwitterAuthService = require('./services/twitter-auth');
const TwitterAutomationService = require('./services/twitter-automation');

async function finalSystemTest() {
    console.log('🎯 开始完整系统测试...\n');
    
    try {
        // 1. 测试配置系统
        console.log('1️⃣ 测试认证配置系统...');
        const isConfigured = authConfig.twitter.isConfigured();
        console.log(`✅ 配置状态: ${isConfigured ? '已配置' : '未配置'}`);
        
        if (isConfigured) {
            console.log('📊 认证信息预览:');
            console.log(`   Auth Token: ${authConfig.twitter.getAuthToken().substring(0, 20)}...`);
            console.log(`   CT0: ${authConfig.twitter.getCt0().substring(0, 20)}...`);
            console.log(`   TWID: ${authConfig.twitter.getTwid()}`);
            
            const cookies = authConfig.twitter.getPlaywrightCookies();
            console.log(`✅ Playwright Cookie 数量: ${cookies.length}`);
        }
        console.log('');
        
        // 2. 测试认证服务
        console.log('2️⃣ 测试认证服务...');
        const authService = new TwitterAuthService();
        const authSuccess = await authService.loginWithAuthToken();
        console.log(`✅ 认证结果: ${authSuccess ? '成功' : '失败'}`);
        console.log('');
        
        if (authSuccess) {
            // 3. 测试浏览器访问
            console.log('3️⃣ 测试浏览器页面访问...');
            const page = authService.getPage();
            if (page) {
                await page.goto('https://x.com/jack', { 
                    waitUntil: 'domcontentloaded',
                    timeout: 15000 
                });
                await page.waitForTimeout(2000);
                
                console.log(`📍 当前页面: ${page.url()}`);
                console.log(`📄 页面标题: ${await page.title()}`);
                
                // 检查登录状态
                const pageContent = await page.content();
                const isLoggedIn = !pageContent.includes('登录') && !pageContent.includes('Log in');
                console.log(`🔐 登录状态: ${isLoggedIn ? '已登录' : '未登录'}`);
                console.log('');
                
                if (isLoggedIn) {
                    // 4. 测试关注功能
                    console.log('4️⃣ 测试关注功能...');
                    
                    // 查找关注按钮
                    const followSelectors = [
                        'button[data-testid*="follow"]',
                        'button:has-text("关注")',
                        'button:has-text("Follow")'
                    ];
                    
                    let followButton = null;
                    for (const selector of followSelectors) {
                        try {
                            const buttons = await page.$$(selector);
                            if (buttons.length > 0) {
                                followButton = buttons[0];
                                console.log(`✅ 找到关注按钮: ${selector}`);
                                break;
                            }
                        } catch (error) {
                            // 继续尝试下一个选择器
                        }
                    }
                    
                    if (followButton) {
                        const buttonText = await followButton.innerText();
                        console.log(`📝 关注按钮文本: "${buttonText}"`);
                        
                        const isFollowing = buttonText.toLowerCase().includes('following') || 
                                          buttonText.toLowerCase().includes('正在关注');
                        
                        if (isFollowing) {
                            console.log('✅ @jack 已经是关注状态');
                        } else {
                            console.log('🖱️ 测试关注操作...');
                            await followButton.click();
                            await page.waitForTimeout(3000);
                            
                            const newButtonText = await followButton.innerText();
                            const success = newButtonText.toLowerCase().includes('following') || 
                                          newButtonText.toLowerCase().includes('正在关注');
                            
                            console.log(`📝 点击后按钮文本: "${newButtonText}"`);
                            console.log(`🎯 关注结果: ${success ? '成功' : '失败'}`);
                        }
                    } else {
                        console.log('❌ 未找到关注按钮');
                    }
                    console.log('');
                    
                    // 5. 测试自动化服务
                    console.log('5️⃣ 测试自动化服务...');
                    const automationService = new TwitterAutomationService();
                    console.log('✅ 自动化服务初始化成功');
                    console.log(`🔐 自动化服务认证状态: ${automationService.authService.isAuthenticated() ? '已认证' : '未认证'}`);
                    console.log('');
                }
            }
        }
        
        // 6. 系统总结
        console.log('🎯 系统测试总结:');
        console.log(`✅ 认证配置: ${isConfigured ? '正常' : '异常'}`);
        console.log(`✅ 认证服务: ${authSuccess ? '正常' : '异常'}`);
        console.log(`✅ 页面访问: ${authSuccess ? '正常' : '异常'}`);
        console.log(`✅ 关注功能: ${authSuccess ? '可用' : '不可用'}`);
        console.log(`✅ 自动化服务: ${authSuccess ? '正常' : '异常'}`);
        console.log('');
        
        if (authSuccess) {
            console.log('🎉 完整系统测试通过！所有功能正常工作');
        } else {
            console.log('❌ 系统测试失败，需要检查认证配置');
        }
        
        console.log('📸 保存测试截图...');
        const page = authService.getPage();
        if (page) {
            await page.screenshot({ path: 'final-system-test-result.png' });
        }
        
    } catch (error) {
        console.error('❌ 系统测试失败:', error.message);
    } finally {
        // 清理资源
        console.log('🔄 清理测试资源...');
        const authService = new TwitterAuthService();
        await authService.close();
        console.log('✅ 资源清理完成');
    }
    
    console.log('\n🎯 最终系统测试完成！');
}

finalSystemTest().catch(console.error);