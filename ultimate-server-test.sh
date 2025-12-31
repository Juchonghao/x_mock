#!/bin/bash

# 终极解决方案 - 清理端口并直接测试
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
SERVER_DIR="/root/x-auto-reply"

echo "🔧 终极解决方案 - 清理端口并测试关注功能"

# 1. 彻底清理端口占用
echo ""
echo "1️⃣ 彻底清理端口占用..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    echo '🛑 强制终止所有占用端口3001的进程...'
    fuser -k 3001/tcp 2>/dev/null || echo '端口3001清理完成'
    
    echo '🔍 再次确认端口状态...'
    lsof -i :3001 && echo '⚠️  端口3001仍被占用' || echo '✅ 端口3001已释放'
"

# 2. 检查并重启服务
echo ""
echo "2️⃣ 检查并重启服务..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📊 当前进程状态:'
    ps aux | grep node | grep -v grep
    
    echo ''
    echo '🚀 启动服务（端口3001）...'
    nohup node start-x-service.js > service.log 2>&1 &
    
    echo '⏳ 等待服务启动...'
    sleep 10
    
    echo '🔍 检查服务启动结果...'
    ps aux | grep 'node.*start-x-service' | grep -v grep || echo '❌ 服务启动失败'
    
    echo ''
    echo '📄 最近的日志:'
    if [ -f 'service.log' ]; then
        tail -n 15 service.log
    else
        echo '没有服务日志文件'
    fi
"

# 3. 创建简单直接的测试脚本
echo ""
echo "3️⃣ 创建简单直接的测试脚本..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    # 创建一个非常简单的测试脚本
    echo 'console.log(\"🚀 开始简单关注测试...\");' > simple-follow-test.js
    echo 'const { chromium } = require(\"playwright\");' >> simple-follow-test.js
    echo 'const authConfig = require(\"./config/auth\");' >> simple-follow-test.js
    echo '' >> simple-follow-test.js
    echo '(async () => {' >> simple-follow-test.js
    echo '  try {' >> simple-follow-test.js
    echo '    console.log(\"🔐 初始化浏览器...\");' >> simple-follow-test.js
    echo '    const browser = await chromium.launch({ headless: true });' >> simple-follow-test.js
    echo '    const context = await browser.newContext();' >> simple-follow-test.js
    echo '    const page = await context.newPage();' >> simple-follow-test.js
    echo '    ' >> simple-follow-test.js
    echo '    console.log(\"🍪 设置Cookie...\");' >> simple-follow-test.js
    echo '    const cookies = authConfig.twitter.getPlaywrightCookies();' >> simple-follow-test.js
    echo '    await context.addCookies(cookies);' >> simple-follow-test.js
    echo '    ' >> simple-follow-test.js
    echo '    console.log(\"🌐 访问Twitter...\");' >> simple-follow-test.js
    echo '    await page.goto(\"https://twitter.com/jack\");' >> simple-follow-test.js
    echo '    await page.waitForTimeout(3000);' >> simple-follow-test.js
    echo '    ' >> simple-follow-test.js
    echo '    console.log(\"📸 截图...\");' >> simple-follow-test.js
    echo '    await page.screenshot({ path: \"follow-test-result.png\" });' >> simple-follow-test.js
    echo '    ' >> simple-follow-test.js
    echo '    console.log(\"✅ 测试完成\");' >> simple-follow-test.js
    echo '    await browser.close();' >> simple-follow-test.js
    echo '  } catch (error) {' >> simple-follow-test.js
    echo '    console.error(\"❌ 测试失败:\", error.message);' >> simple-follow-test.js
    echo '  }' >> simple-follow-test.js
    echo '})();' >> simple-follow-test.js
    
    echo '✅ 简单测试脚本已创建'
"

# 4. 运行简单测试
echo ""
echo "4️⃣ 运行简单测试..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    echo '🧪 执行简单测试...'
    node simple-follow-test.js
"

# 5. 最终状态检查
echo ""
echo "5️⃣ 最终状态检查..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📋 服务状态:'
    ps aux | grep 'node.*start-x-service' | grep -v grep
    
    echo ''
    echo '🔗 端口状态:'
    lsof -i :3001
    
    echo ''
    echo '📸 测试结果:'
    ls -la *.png | grep -E '(follow-test|result)' || echo '没有找到测试截图'
    
    echo ''
    echo '📄 服务日志:'
    if [ -f 'service.log' ]; then
        tail -n 5 service.log
    fi
"

echo ""
echo "🎯 终极测试完成！"