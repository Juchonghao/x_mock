const { chromium } = require('playwright');
const authConfig = require('./config/auth');

async function testUpdatedAuth() {
    console.log('🧪 测试更新后的认证系统...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    try {
        console.log('🔐 使用新的配置设置认证 Cookie...');
        
        // 使用新的配置方法
        const cookies = authConfig.twitter.getPlaywrightCookies();
        console.log('📊 获取到', cookies.length, '个 Cookie');
        
        // 设置 Cookie
        await context.addCookies(cookies);
        console.log('✅ Cookie 设置完成');
        
        // 验证 Cookie
        const currentCookies = await context.cookies();
        console.log('📊 当前 Cookie 数量:', currentCookies.length);
        
        const authCookies = currentCookies.filter(cookie => 
            cookie.name === 'auth_token' || cookie.name === 'ct0' || cookie.name === 'twid'
        );
        console.log('🔐 认证相关 Cookie 数量:', authCookies.length);
        
        console.log('🌐 测试访问 @jack 页面...');
        await page.goto('https://x.com/jack', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        console.log('⏳ 等待页面加载...');
        await page.waitForTimeout(3000);
        
        console.log('📍 当前页面URL:', page.url());
        console.log('📄 页面标题:', await page.title());
        
        // 检查登录状态
        const pageContent = await page.content();
        const isLoggedIn = !pageContent.includes('登录') && !pageContent.includes('Log in') && 
                          !pageContent.includes('Sign in') && !pageContent.includes('注册');
        console.log('🔐 登录状态:', isLoggedIn ? '已登录' : '未登录');
        
        if (isLoggedIn) {
            console.log('✅ 认证成功！测试关注功能...');
            
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
                console.log('📝 关注按钮文本:', buttonText);
                
                console.log('🖱️ 点击关注按钮...');
                await followButton.click();
                
                console.log('⏳ 等待状态更新...');
                await page.waitForTimeout(3000);
                
                const newButtonText = await followButton.innerText();
                console.log('📝 点击后按钮文本:', newButtonText);
                
                const success = newButtonText.toLowerCase().includes('following') || 
                               newButtonText.toLowerCase().includes('正在关注');
                console.log('🎯 关注结果:', success ? '✅ 成功' : '❌ 失败');
                
                if (success) {
                    console.log('🎉 完整测试成功！认证和关注功能都正常工作');
                }
            } else {
                console.log('❌ 未找到关注按钮');
            }
        } else {
            console.log('❌ 认证失败');
        }
        
        console.log('📸 截图保存...');
        await page.screenshot({ path: 'test-updated-auth-result.png' });
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
    
    console.log('🔄 浏览器已关闭');
    await browser.close();
    
    console.log('🎯 更新后认证系统测试完成！');
}

testUpdatedAuth().catch(console.error);