#!/bin/bash

# 完整关注功能测试
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
SERVER_DIR="/root/x-auto-reply"

echo "🧪 开始完整关注功能测试..."

# 创建完整的关注测试脚本
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📝 创建完整关注测试脚本...'
    cat > complete-follow-test.js << 'ENDOFFILE'
const { chromium } = require('playwright');
const authConfig = require('./config/auth');

async function testCompleteFollow() {
    console.log('🚀 开始完整的关注功能测试...');
    
    let browser;
    try {
        // 检查认证配置
        if (!authConfig.twitter.isConfigured()) {
            throw new Error('Twitter Auth Token 配置不完整');
        }
        
        console.log('🔐 初始化浏览器...');
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        const page = await context.newPage();
        
        console.log('🍪 设置认证 Cookie...');
        const cookies = authConfig.twitter.getPlaywrightCookies();
        await context.addCookies(cookies);
        console.log('✅ 认证 Cookie 设置完成，共', cookies.length, '个');
        
        // 测试访问 Twitter
        console.log('🌐 测试访问 Twitter...');
        try {
            await page.goto('https://twitter.com/jack', { 
                timeout: 30000,
                waitUntil: 'networkidle'
            });
            console.log('✅ 成功访问 Twitter 个人页面');
        } catch (error) {
            console.log('❌ 访问 Twitter 失败:', error.message);
            throw error;
        }
        
        // 等待页面加载
        await page.waitForTimeout(5000);
        
        // 截图用于调试
        await page.screenshot({ path: 'initial-page.png' });
        console.log('📸 初始页面截图已保存');
        
        // 检查是否已登录
        const pageContent = await page.content();
        const isLoggedIn = !pageContent.includes('Log in') && 
                          !pageContent.includes('登录') &&
                          !pageContent.includes('Sign up');
        console.log('🔍 登录状态检查:', isLoggedIn ? '已登录' : '未登录');
        
        if (!isLoggedIn) {
            console.log('⚠️  检测到未登录状态，关注操作可能失败');
        }
        
        // 查找关注按钮
        console.log('🔍 查找关注按钮...');
        const followSelectors = [
            'button[data-testid=\"follow\"]',
            'button:has-text(\"关注\")',
            'button:has-text(\"Follow\")',
            '[data-testid=\"follow\"]',
            'button[role=\"button\"]:has-text(\"关注\")',
            'button[role=\"button\"]:has-text(\"Follow\")'
        ];
        
        let followButton = null;
        let buttonSelector = '';
        
        for (const selector of followSelectors) {
            try {
                const buttons = await page.$$(selector);
                if (buttons.length > 0) {
                    followButton = buttons[0];
                    buttonSelector = selector;
                    console.log('✅ 找到关注按钮:', selector);
                    break;
                }
            } catch (error) {
                console.log('❌ 选择器失败:', selector, error.message);
            }
        }
        
        if (!followButton) {
            console.log('❌ 未找到关注按钮');
            console.log('📄 页面内容分析:');
            const allButtons = await page.$$('button');
            console.log('找到', allButtons.length, '个按钮');
            
            for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
                try {
                    const text = await allButtons[i].innerText();
                    if (text) {
                        console.log('按钮', i + 1, ':', text.trim());
                    }
                } catch (error) {
                    // 忽略错误
                }
            }
            
            await page.screenshot({ path: 'no-follow-button.png' });
            console.log('📸 无关注按钮截图已保存');
            return;
        }
        
        // 获取按钮当前状态
        const buttonText = await followButton.innerText();
        console.log('📝 当前按钮文本:', buttonText);
        
        const isFollowing = buttonText.toLowerCase().includes('following') || 
                          buttonText.toLowerCase().includes('正在关注') ||
                          buttonText.toLowerCase().includes('unfollow');
        
        console.log('🔍 当前关注状态:', isFollowing ? '已关注' : '未关注');
        
        if (isFollowing) {
            console.log('✅ @jack 已经是关注状态');
            await page.screenshot({ path: 'already-following.png' });
        } else {
            console.log('🖱️ 执行关注操作...');
            
            // 模拟人类行为
            await page.mouse.move(0, 0); // 移动鼠标到页面顶部
            await page.waitForTimeout(1000);
            
            // 点击关注按钮
            await followButton.hover();
            await page.waitForTimeout(500);
            await followButton.click();
            
            console.log('⏳ 等待关注结果...');
            await page.waitForTimeout(8000);
            
            // 重新获取按钮文本
            const newButtonText = await followButton.innerText();
            console.log('📝 点击后按钮文本:', newButtonText);
            
            const success = newButtonText.toLowerCase().includes('following') || 
                          newButtonText.toLowerCase().includes('正在关注') ||
                          newButtonText.toLowerCase().includes('unfollow');
            
            console.log('🎯 关注结果:', success ? '成功' : '失败');
            
            // 最终截图
            await page.screenshot({ path: 'follow-result.png' });
            console.log('📸 结果截图已保存: follow-result.png');
            
            // 如果成功，验证关注状态
            if (success) {
                console.log('🎉 关注操作成功完成！');
            } else {
                console.log('⚠️  关注操作可能失败，尝试检查其他指标...');
                
                // 尝试查找确认按钮或其他反馈
                try {
                    const confirmButtons = await page.$$('button:has-text(\"确认\"), button:has-text(\"Confirm\")');
                    if (confirmButtons.length > 0) {
                        console.log('🔍 发现确认按钮，尝试点击...');
                        await confirmButtons[0].click();
                        await page.waitForTimeout(3000);
                        
                        const finalButtonText = await followButton.innerText();
                        const finalSuccess = finalButtonText.toLowerCase().includes('following') || 
                                           finalButtonText.toLowerCase().includes('正在关注');
                        console.log('🎯 确认后关注结果:', finalSuccess ? '成功' : '失败');
                    }
                } catch (confirmError) {
                    console.log('⚠️  确认流程失败:', confirmError.message);
                }
            }
        }
        
        console.log('🔒 关闭浏览器...');
        await browser.close();
        console.log('✅ 完整关注测试完成');
        
    } catch (error) {
        console.error('❌ 完整关注测试失败:', error.message);
        console.error('❌ 错误详情:', error);
        
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('❌ 浏览器关闭失败:', closeError.message);
            }
        }
    }
}

// 运行测试
testCompleteFollow();
ENDOFFILE
    
    echo '✅ 完整关注测试脚本已创建'
"

# 运行完整测试
echo ""
echo "🧪 运行完整关注测试..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    echo '🚀 执行完整关注测试...'
    node complete-follow-test.js
"

# 检查测试结果
echo ""
echo "📊 检查测试结果..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📸 测试截图文件:'
    ls -la *.png | grep -E '(initial|follow|result)' || echo '没有找到相关截图'
    
    echo ''
    echo '📄 最近的日志记录:'
    if [ -f 'service.log' ]; then
        tail -n 10 service.log
    fi
    
    echo ''
    echo '🔧 系统资源状态:'
    echo '内存使用:'
    free -h
    
    echo ''
    echo '进程状态:'
    ps aux | grep node | grep -v grep
"

echo ""
echo "🎯 完整关注功能测试完成！"