const { chromium } = require('playwright');

async function debugCookies() {
    console.log('🔍 开始详细Cookie调试...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    try {
        // 解码 twid
        const decodedTwid = decodeURIComponent('u%3D555586849');
        console.log('📊 解码后的 twid:', decodedTwid);
        
        // 设置认证Cookie - 使用 twitter.com 域
        console.log('🍪 设置 twitter.com 域的Cookie...');
        await context.addCookies([
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
        
        // 也设置 x.com 域的 Cookie
        console.log('🍪 设置 x.com 域的Cookie...');
        await context.addCookies([
            {
                name: 'auth_token',
                value: 'a0e70e3e33feb8e71f2bf751827ef282fe412ea8',
                domain: '.x.com',
                path: '/',
                httpOnly: true,
                secure: true
            },
            {
                name: 'ct0',
                value: 'bf082f5fa878915a307cb5c2cd31c6d8422df48258155bc8687deb89b9a15d0cebbdce0d0add36e7c10d00a86e7c815f4718e661035940133ff85bcdfa8b5e908297354d0ca3e83341c773dda8682c02',
                domain: '.x.com',
                path: '/',
                httpOnly: true,
                secure: true
            },
            {
                name: 'twid',
                value: decodedTwid,
                domain: '.x.com',
                path: '/',
                httpOnly: true,
                secure: true
            }
        ]);
        
        console.log('✅ 认证Cookie设置完成');
        
        // 检查当前Cookie
        console.log('🔍 检查当前Cookie...');
        const cookies = await context.cookies();
        console.log('📋 当前Cookie列表:');
        cookies.forEach(cookie => {
            console.log(`  ${cookie.name}: ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain})`);
        });
        
        console.log('🌐 访问 Twitter 首页...');
        await page.goto('https://twitter.com', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        console.log('⏳ 等待页面完全加载...');
        await page.waitForTimeout(5000);
        
        console.log('📍 当前页面URL:', page.url());
        console.log('📄 页面标题:', await page.title());
        
        // 检查是否需要登录
        const pageContent = await page.content();
        const isLoggedIn = !pageContent.includes('登录') && !pageContent.includes('Log in') && 
                          !pageContent.includes('Sign in') && !pageContent.includes('注册');
        console.log('🔐 登录状态检查:', isLoggedIn ? '已登录' : '未登录');
        
        if (!isLoggedIn) {
            console.log('⚠️ 仍然未登录，可能需要额外的Cookie或配置');
            console.log('🔍 查找登录相关的元素...');
            
            // 查找登录相关元素
            const loginElements = await page.$$('a[href*="login"], button:has-text("登录"), button:has-text("Log in")');
            if (loginElements.length > 0) {
                console.log('📝 找到登录相关元素:', loginElements.length, '个');
            }
        }
        
        console.log('🌐 尝试访问 @jack 页面...');
        await page.goto('https://twitter.com/jack', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        console.log('⏳ 等待页面加载...');
        await page.waitForTimeout(3000);
        
        console.log('📍 @jack页面URL:', page.url());
        console.log('📄 @jack页面标题:', await page.title());
        
        // 再次检查登录状态
        const jackPageContent = await page.content();
        const jackIsLoggedIn = !jackPageContent.includes('登录') && !jackPageContent.includes('Log in') && 
                              !jackPageContent.includes('Sign in') && !jackPageContent.includes('注册');
        console.log('🔐 @jack页面登录状态:', jackIsLoggedIn ? '已登录' : '未登录');
        
        if (jackIsLoggedIn) {
            console.log('✅ 成功登录！查找关注按钮...');
            
            // 查找关注按钮
            const followButtons = await page.$$('button[data-testid*="follow"], button:has-text("关注"), button:has-text("Follow")');
            console.log('🎯 找到关注按钮数量:', followButtons.length);
            
            if (followButtons.length > 0) {
                const buttonText = await followButtons[0].innerText();
                console.log('📝 关注按钮文本:', buttonText);
                
                console.log('🖱️ 点击关注按钮...');
                await followButtons[0].click();
                
                console.log('⏳ 等待状态更新...');
                await page.waitForTimeout(3000);
                
                const newButtonText = await followButtons[0].innerText();
                console.log('📝 点击后按钮文本:', newButtonText);
                
                const success = newButtonText.toLowerCase().includes('following') || 
                               newButtonText.toLowerCase().includes('正在关注');
                console.log('🎯 关注结果:', success ? '✅ 成功' : '❌ 失败');
            }
        } else {
            console.log('❌ @jack页面仍然未登录');
        }
        
        console.log('📸 截图保存...');
        await page.screenshot({ path: 'debug-cookies-result.png' });
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
    
    console.log('🔄 浏览器已关闭');
    await browser.close();
    
    console.log('🎯 Cookie调试完成！');
}

debugCookies().catch(console.error);