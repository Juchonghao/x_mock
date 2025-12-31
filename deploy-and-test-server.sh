#!/bin/bash

# 服务器部署和测试脚本
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
SERVER_DIR="/root/x-auto-reply"

echo "🚀 开始服务器部署和测试流程..."

# 1. 解决端口占用问题
echo ""
echo "1️⃣ 解决端口占用问题..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    echo '🔍 检查端口3001占用情况...'
    lsof -i :3001 || echo '端口3001当前未被占用'
    
    echo '🛑 强制停止所有相关进程...'
    pkill -f 'node.*start-x-service.js' || true
    pkill -f 'node.*index.js' || true
    pkill -f 'node.*server' || true
    pkill -f '3001' || true
    
    echo '⏳ 等待3秒确保进程完全停止...'
    sleep 3
    
    echo '🔍 再次检查端口3001...'
    lsof -i :3001 && echo '⚠️  端口3001仍被占用' || echo '✅ 端口3001已释放'
"

# 2. 重新部署认证配置
echo ""
echo "2️⃣ 重新部署认证配置..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📁 备份现有配置...'
    if [ -f 'config/auth.js' ]; then
        cp config/auth.js config/auth.js.backup.\$(date +%Y%m%d_%H%M%S)
        echo '✅ config/auth.js 已备份'
    fi
    
    echo '🔧 更新认证配置...'
    cat > config/auth.js << 'EOF'
const authConfig = {
  twitter: {
    // 有效的认证信息（已验证可正常工作）
    authToken: 'a0e70e3e33feb8e71f2bf751827ef282fe412ea8',
    ct0: 'bf082f5fa878915a307cb5c2cd31c6d8422df48258155bc8687deb89b9a15d0cebbdce0d0add36e7c10d00a86e7c815f4718e661035940133ff85bcdfa8b5e908297354d0ca3e83341c773dda8682c02',
    twid: 'u=555586849', // 已解码的twid值
    
    // 验证配置
    isConfigured() {
      return !!(this.authToken && this.ct0 && this.twid);
    },
    
    // 获取用于 Playwright 的 Cookie 数组
    getPlaywrightCookies() {
      if (!this.isConfigured()) {
        throw new Error('Twitter Auth Token 配置不完整');
      }
      
      const authToken = this.authToken;
      const ct0 = this.ct0;
      const twid = this.twid;
      
      return [
        {
          name: 'auth_token',
          value: authToken,
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'ct0',
          value: ct0,
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'twid',
          value: twid,
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'auth_token',
          value: authToken,
          domain: '.x.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'ct0',
          value: ct0,
          domain: '.x.com',
          path: '/',
          httpOnly: true,
          secure: true
        },
        {
          name: 'twid',
          value: twid,
          domain: '.x.com',
          path: '/',
          httpOnly: true,
          secure: true
        }
      ];
    },
    
    // 获取单个认证值的方法
    getAuthToken() {
      return this.authToken;
    },
    
    getCt0() {
      return this.ct0;
    },
    
    getTwid() {
      return this.twid;
    }
  }
};

module.exports = authConfig;
EOF

    echo '✅ 认证配置已更新'
"

# 3. 启动服务
echo ""
echo "3️⃣ 启动服务..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '🚀 启动 X 自动化服务...'
    nohup node start-x-service.js > service.log 2>&1 &
    
    # 等待服务启动
    echo '⏳ 等待服务启动...'
    sleep 5
    
    # 检查服务状态
    echo '🔍 检查服务状态...'
    ps aux | grep 'node.*start-x-service' | grep -v grep && echo '✅ 服务正在运行' || echo '❌ 服务未启动'
"

# 4. 创建服务器端关注测试脚本
echo ""
echo "4️⃣ 创建服务器端关注测试脚本..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    
    echo '📝 创建服务器端关注测试脚本...'
    cat > server-follow-test.js << 'EOF'
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
                    console.log(\`✅ 找到关注按钮: \${selector}\`);
                    break;
                }
            } catch (error) {
                // 继续尝试下一个选择器
            }
        }
        
        if (followButton) {
            const buttonText = await followButton.innerText();
            console.log(\`📝 关注按钮文本: \"\${buttonText}\"\`);
            
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
                
                console.log(\`📝 点击后按钮文本: \"\${newButtonText}\"\`);
                console.log(\`🎯 关注结果: \${success ? '成功' : '失败'}\`);
                
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
EOF
    
    echo '✅ 服务器端测试脚本已创建'
"

# 5. 运行服务器端关注测试
echo ""
echo "5️⃣ 运行服务器端关注测试..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    echo '🧪 执行服务器端关注测试...'
    node server-follow-test.js
"

# 6. 检查服务日志
echo ""
echo "6️⃣ 检查服务状态和日志..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    cd $SERVER_DIR
    echo '📋 服务状态检查...'
    ps aux | grep 'node.*start-x-service' | grep -v grep || echo '服务未运行'
    
    echo ''
    echo '📄 最近的服务日志:'
    if [ -f 'service.log' ]; then
        tail -n 20 service.log
    else
        echo '服务日志文件不存在'
    fi
    
    echo ''
    echo '📸 检查测试截图:'
    ls -la *.png 2>/dev/null || echo '没有找到截图文件'
"

echo ""
echo "🎉 服务器部署和测试流程完成！"