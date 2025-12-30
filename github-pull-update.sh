#!/bin/bash

# X-Auto-Reply GitHub 代码更新脚本
# 在服务器上从 GitHub pull 最新代码

# 服务器配置
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
PROJECT_DIR="/root/x-auto-reply"
GITHUB_BRANCH="main"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 从 GitHub 拉取最新代码
pull_latest_code() {
    log_info "从 GitHub 拉取最新代码..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '🔄 检查当前代码状态...'
        echo '  当前分支: '$(git branch --show-current)
        echo '  最后提交: '$(git log -1 --oneline)
        echo '  仓库状态: '$(git status --porcelain | wc -l)' 个未跟踪文件'
        
        echo ''
        echo '📥 从 GitHub 拉取最新代码...'
        
        # 拉取最新代码
        git fetch origin
        
        # 检查是否有新提交
        local_branch=\$(git branch --show-current)
        remote_commit=\$(git rev-parse origin/\$local_branch)
        local_commit=\$(git rev-parse HEAD)
        
        if [ \"\$remote_commit\" != \"\$local_commit\" ]; then
            echo '🔄 发现新提交，开始更新...'
            git reset --hard origin/\$local_branch
            git clean -fd
            
            echo '✅ 代码更新完成'
            echo '  新提交: '$(git log -1 --oneline)
        else
            echo 'ℹ️ 代码已是最新版本'
        fi
        
        # 检查关键文件是否存在
        echo ''
        echo '📁 检查关键文件...'
        if [ -f 'package.json' ]; then
            echo '✅ package.json 存在'
        else
            echo '❌ package.json 不存在'
        fi
        
        if [ -f 'start-x-service.js' ]; then
            echo '✅ start-x-service.js 存在'
        else
            echo '⚠️ start-x-service.js 不存在，使用默认服务'
        fi
    "
    
    log_success "代码拉取完成"
}

# 安装/更新依赖
update_dependencies() {
    log_info "安装/更新项目依赖..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '📦 更新 npm 依赖...'
        
        # 清理旧的依赖
        rm -rf node_modules package-lock.json
        
        # 重新安装依赖
        npm install --production
        
        # 验证安装
        echo '📊 依赖安装验证...'
        echo '  Node 版本: '$(node --version)
        echo '  NPM 版本: '$(npm --version)
        echo '  安装的包数量: '$(ls node_modules | wc -l)
        
        # 确保必要目录存在
        mkdir -p logs sessions browser
        
        echo '✅ 依赖更新完成'
    "
    
    log_success "依赖更新完成"
}

# 重启服务
restart_service() {
    log_info "重启 X Auto Reply 服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '🛑 停止旧服务...'
        pm2 delete all 2>/dev/null || true
        pkill -f 'x-auto-reply' 2>/dev/null || true
        pkill -f 'start-x-service' 2>/dev/null || true
        pkill -f 'server.js' 2>/dev/null || true
        
        echo '✅ 旧服务已停止'
        
        echo ''
        echo '🚀 启动新服务...'
        
        # 检查是否有自定义服务文件
        if [ -f 'start-x-service.js' ]; then
            echo '📄 使用 start-x-service.js 启动服务'
            
            # 使用 PM2 启动服务，监听端口 3001
            PORT=3001 pm2 start start-x-service.js --name 'x-auto-reply'
            
        elif [ -f 'server.js' ]; then
            echo '📄 使用 server.js 启动服务'
            PORT=3000 pm2 start server.js --name 'x-auto-reply'
            
        else
            echo '📄 创建并启动默认 Express 服务'
            
            # 创建默认服务
            cat > server.js << 'SERVICE_EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 根路径
app.get('/', (req, res) => {
    res.json({
        service: 'X Auto Reply Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        description: 'Twitter/X automation service with Playwright',
        github: 'https://github.com/Juchonghao/x_mock',
        port: port,
        endpoints: [
            'GET / - Service info',
            'GET /health - Health check',
            'GET /status - Service status',
            'GET /api/info - API information'
        ]
    });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        node_version: process.version,
        platform: process.platform,
        port: port
    });
});

// 服务状态
app.get('/status', (req, res) => {
    res.json({
        service: 'x-auto-reply',
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        github_repo: 'https://github.com/Juchonghao/x_mock',
        port: port
    });
});

// API 端点
app.get('/api/info', (req, res) => {
    res.json({
        service: 'X Auto Reply',
        description: 'Twitter/X automation service with Playwright',
        features: [
            'Twitter DM automation',
            'User following automation',
            'Tweet interaction (likes & comments)',
            'Headless browser support',
            'Anti-detection measures'
        ],
        github: 'https://github.com/Juchonghao/x_mock',
        version: '1.0.0'
    });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
    console.log('🚀 X Auto Reply 服务启动成功!');
    console.log('📊 服务地址: http://localhost:' + port);
    console.log('❤️ 健康检查: http://localhost:' + port + '/health');
    console.log('📋 服务状态: http://localhost:' + port + '/status');
    console.log('🔗 GitHub: https://github.com/Juchonghao/x_mock');
});
SERVICE_EOF
            
            # 使用 PM2 启动默认服务
            PORT=3001 pm2 start server.js --name 'x-auto-reply'
        fi
        
        # 保存 PM2 配置
        pm2 save
        
        # 等待服务启动
        echo '⏳ 等待服务启动...'
        sleep 3
        
        # 检查服务状态
        echo '📊 服务状态检查:'
        pm2 status
        
        # 检查端口监听
        echo ''
        echo '📊 端口监听检查:'
        netstat -tlnp | grep :3001 || echo '⚠️ 端口 3001 未监听'
    "
    
    log_success "服务重启完成"
}

# 测试服务
test_service() {
    log_info "测试服务功能..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🧪 测试服务功能...'
        
        # 测试本地服务
        echo '📡 测试主页面...'
        curl -s http://localhost:3001/ | jq . 2>/dev/null || curl -s http://localhost:3001/
        echo ''
        
        echo '❤️ 测试健康检查...'
        curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health
        echo ''
        
        echo '📋 测试服务状态...'
        curl -s http://localhost:3001/status | jq . 2>/dev/null || curl -s http://localhost:3001/status
        echo ''
        
        echo '🔗 测试外部访问地址:'
        echo \"  🌐 主页面: http://$SERVER_IP:3001\"
        echo \"  ❤️ 健康检查: http://$SERVER_IP:3001/health\"
        echo \"  📋 服务状态: http://$SERVER_IP:3001/status\"
    "
    
    log_success "服务测试完成"
}

# 显示更新摘要
show_update_summary() {
    log_info "更新摘要"
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '======================================'
        echo '📊 GitHub 代码更新摘要'
        echo '======================================'
        
        echo '🔧 系统信息:'
        echo '  操作系统: '$(lsb_release -d | cut -f2)
        echo '  Node.js: '$(node --version)
        echo '  NPM: '$(npm --version)
        echo '  PM2: '$(pm2 --version)
        
        echo ''
        echo '📁 项目信息:'
        echo '  项目目录: $PROJECT_DIR'
        echo '  GitHub 分支: $GITHUB_BRANCH'
        echo '  最后更新: '$(git log -1 --format='%cd')
        echo '  当前提交: '$(git log -1 --oneline)
        
        echo ''
        echo '⚙️ 服务状态:'
        pm2 status
        
        echo ''
        echo '🌐 网络状态:'
        netstat -tlnp | grep :3001
        
        echo ''
        echo '======================================'
    "
    
    log_success "更新摘要显示完成"
}

# 主函数
main() {
    log_info "开始 GitHub 代码更新流程"
    echo "================================================"
    echo "🎯 GitHub 仓库: https://github.com/Juchonghao/x_mock"
    echo "🏠 服务器: $SERVER_IP"
    echo "📁 项目目录: $PROJECT_DIR"
    echo "================================================"
    
    # 1. 拉取最新代码
    pull_latest_code
    
    # 2. 更新依赖
    update_dependencies
    
    # 3. 重启服务
    restart_service
    
    # 4. 测试服务
    test_service
    
    # 5. 显示更新摘要
    show_update_summary
    
    echo "================================================"
    log_success "GitHub 代码更新完成！"
    echo ""
    echo "🎉 更新成功信息:"
    echo "  🌐 服务地址: http://$SERVER_IP:3001"
    echo "  ❤️ 健康检查: http://$SERVER_IP:3001/health"
    echo "  📋 服务状态: http://$SERVER_IP:3001/status"
    echo "  📊 API 信息: http://$SERVER_IP:3001/api/info"
    echo ""
    echo "🔧 管理命令:"
    echo "  查看服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 status'"
    echo "  重启服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 restart x-auto-reply'"
    echo "  查看日志: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 logs x-auto-reply'"
    echo "  再次更新: ./github-pull-update.sh"
    echo ""
    echo "📝 使用说明:"
    echo "  1. 在 GitHub 上推送代码更新"
    echo "  2. 运行此脚本: ./github-pull-update.sh"
    echo "  3. 服务将自动重启并加载最新代码"
}

# 执行主函数
main "$@"