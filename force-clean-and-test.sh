#!/bin/bash

# 强制清理并重新部署测试脚本
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
SERVER_DIR="/root/x-auto-reply"

echo "🚀 强制清理并重新部署..."

# 1. 强制清理所有相关进程
echo ""
echo "1️⃣ 强制清理所有相关进程..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    echo '🛑 强制终止所有相关进程...'
    kill -9 1533394 2>/dev/null || echo '进程1533394已不存在'
    
    # 强制清理所有node进程
    pkill -9 -f 'node.*start-x-service' || true
    pkill -9 -f 'node.*index' || true
    pkill -9 -f '3001' || true
    
    echo '⏳ 等待进程完全终止...'
    sleep 5
    
    echo '🔍 确认端口清理状态...'
    lsof -i :3001 && echo '⚠️  端口3001仍被占用' || echo '✅ 端口3001已释放'
"

# 2. 重新启动服务
echo ""
echo "2️⃣ 重新启动服务..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '🚀 启动服务...'
    nohup node start-x-service.js > service.log 2>&1 &
    
    echo '⏳ 等待服务启动...'
    sleep 8
    
    echo '🔍 检查服务状态...'
    ps aux | grep 'node.*start-x-service' | grep -v grep
"

# 3. 创建修复版本的测试脚本
echo ""
echo "3️⃣ 创建修复版本的测试脚本..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📝 创建修复版测试脚本...'
    cat > server-follow-test-fixed.js << 'ENDOFFILE'
const { chromium } = require('playwright');
const authConfig = require('./config/auth');

async function testServerFollow() {
    console.log('🚀 开始服务器端关注功能测试...');
    
    try {
        // 检查认证配置
        if (!authConfig.twitter.isConfigured()) {
            throw new Error('Twitter Auth Token 配置不完整');
        }
        
        console.log('🔐 初始化浏览器...');
        const browser = await chromium.launch({ 
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
        console.log('✅ 认证 Cookie 设置完成');
        
        // 测试访问 Twitter
        console.log('🌐 测试访问 Twitter...');
        try {
            await page.goto('https://twitter.com/jack', { 
                timeout: 20000,
                waitUntil: 'networkidle'
            });
            console.log('✅ 成功访问 Twitter 个人页面');
        } catch (error) {
            console.log('❌ 访问 Twitter 失败:', error.message);
            await browser.close();
            return;
        }
        
        // 等待页面加载
        await page.waitForTimeout(3000);
        
        // 截图用于调试
        await page.screenshot({ path: 'server-test-screenshot.png' });
        console.log('📸 截图已保存: server-test-screenshot.png');
        
        // 查找关注按钮
        console.log('🔍 查找关注按钮...');
        const followSelectors = [
            'button[data-testid*=\"follow\"]',
            'button:has-text(\"关注\")',
            'button:has-text(\"Follow\")'
        ];
        
        let followButton = null;
        for (const selector of followSelectors) {
            try {
                const buttons = await page.$$(selector);
                if (buttons.length > 0) {
                    followButton = buttons[0];
                    console.log('✅ 找到关注按钮:', selector);
                    break;
                }
            } catch (error) {
                // 继续尝试下一个选择器
            }
        }
        
        if (followButton) {
            const buttonText = await followButton.innerText();
            console.log('📝 关注按钮文本:', buttonText);
            
            const isFollowing = buttonText.toLowerCase().includes('following') || 
                              buttonText.toLowerCase().includes('正在关注');
            
            if (isFollowing) {
                console.log('✅ @jack 已经是关注状态');
            } else {
                console.log('🖱️ 执行关注操作...');
                await followButton.click();
                await page.waitForTimeout(5000);
                
                const newButtonText = await followButton.innerText();
                const success = newButtonText.toLowerCase().includes('following') || 
                              newButtonText.toLowerCase().includes('正在关注');
                
                console.log('📝 点击后按钮文本:', newButtonText);
                console.log('🎯 关注结果:', success ? '成功' : '失败');
                
                // 最终截图
                await page.screenshot({ path: 'server-follow-result.png' });
                console.log('📸 结果截图已保存: server-follow-result.png');
            }
        } else {
            console.log('❌ 未找到关注按钮');
            const pageContent = await page.content();
            console.log('📄 页面内容预览:', pageContent.substring(0, 500));
        }
        
        console.log('🔒 关闭浏览器...');
        await browser.close();
        console.log('✅ 服务器端关注测试完成');
        
    } catch (error) {
        console.error('❌ 服务器端测试失败:', error);
    }
}

// 运行测试
testServerFollow();
ENDOFFILE
    
    echo '✅ 修复版测试脚本已创建'
"

# 4. 运行修复版测试
echo ""
echo "4️⃣ 运行修复版测试..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    echo '🧪 执行修复版测试...'
    node server-follow-test-fixed.js
"

# 5. 检查最终状态
echo ""
echo "5️⃣ 检查最终状态..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📋 服务状态:'
    ps aux | grep 'node.*start-x-service' | grep -v grep || echo '服务未运行'
    
    echo ''
    echo '📄 服务日志:'
    if [ -f 'service.log' ]; then
        tail -n 10 service.log
    else
        echo '没有服务日志'
    fi
    
    echo ''
    echo '📸 测试截图:'
    ls -la *.png | tail -5
"

echo ""
echo "🎉 强制清理和测试完成！"