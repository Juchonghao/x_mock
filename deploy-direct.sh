#!/bin/bash

# X-Auto-Reply 服务器直拉 GitHub 部署脚本
# 直接在服务器上从 GitHub 拉取代码并构建运行

# 服务器配置
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
PROJECT_DIR="/root/x-auto-reply"
GITHUB_REPO_URL="https://github.com/Juchonghao/x_mock.git"
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

# 在服务器上安装基础环境
install_base_environment() {
    log_info "在服务器上安装基础环境..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🚀 安装基础环境...'
        
        # 更新系统包
        apt update -y
        
        # 安装必要工具
        apt install -y git curl wget
        
        # 安装 Node.js (最新 LTS)
        if ! command -v node &> /dev/null; then
            echo '📦 安装 Node.js...'
            curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
            apt-get install -y nodejs
        else
            echo '✅ Node.js 已安装: '$(node --version)
        fi
        
        # 安装 PM2 (进程管理器)
        if ! command -v pm2 &> /dev/null; then
            echo '📦 安装 PM2...'
            npm install -g pm2
        else
            echo '✅ PM2 已安装'
        fi
        
        # 创建项目目录
        mkdir -p $PROJECT_DIR
        cd $PROJECT_DIR
        
        echo '✅ 基础环境安装完成'
    "
    
    log_success "服务器基础环境安装完成"
}

# 从 GitHub 克隆/更新代码
clone_or_update_code() {
    log_info "从 GitHub 克隆/更新代码..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '📥 从 GitHub 克隆代码...'
        
        if [ -d '.git' ]; then
            echo '🔄 代码库已存在，执行更新...'
            git fetch origin
            git reset --hard origin/$GITHUB_BRANCH
            git clean -fd
        else
            echo '🆕 首次克隆代码库...'
            git clone -b $GITHUB_BRANCH $GITHUB_REPO_URL .
        fi
        
        # 检查代码状态
        echo '📊 检查代码状态...'
        echo '  Git 版本: '$(git --version)
        echo '  当前分支: '$(git branch --show-current)
        echo '  最新提交: '$(git log -1 --oneline)
        echo '  仓库状态: '$(git status --porcelain | wc -l)' 个未跟踪文件'
        
        # 列出主要文件
        echo '📁 项目文件:'
        ls -la
        
        if [ -f 'package.json' ]; then
            echo '✅ package.json 存在'
        else
            echo '❌ package.json 不存在'
        fi
    "
    
    log_success "代码克隆/更新完成"
}

# 安装项目依赖
install_project_dependencies() {
    log_info "安装项目依赖..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '📦 安装 npm 依赖...'
        
        # 清理之前的 node_modules
        rm -rf node_modules package-lock.json
        
        # 安装依赖
        npm install --production
        
        # 验证安装
        echo '📊 依赖安装验证...'
        echo '  Node 版本: '$(node --version)
        echo '  NPM 版本: '$(npm --version)
        echo '  安装的包数量: '$(ls node_modules | wc -l)
        
        # 创建必要的目录
        mkdir -p logs sessions browser
        
        echo '✅ 项目依赖安装完成'
    "
    
    log_success "项目依赖安装完成"
}

# 构建和启动服务
build_and_start_service() {
    log_info "构建和启动服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '🚀 构建服务...'
        
        # 停止旧服务
        pm2 delete all 2>/dev/null || true
        pkill -f 'x-auto-reply' || true
        pkill -f 'node' || true
        
        # 检查是否有自定义启动脚本
        if [ -f 'start.js' ] || [ -f 'index.js' ] || [ -f 'main.js' ]; then
            echo '📄 发现应用入口文件，使用自定义服务...'
            
            # 选择入口文件
            if [ -f 'start.js' ]; then
                ENTRY_FILE='start.js'
            elif [ -f 'index.js' ]; then
                ENTRY_FILE='index.js'
            elif [ -f 'main.js' ]; then
                ENTRY_FILE='main.js'
            fi
            
            echo \"📄 使用入口文件: \$ENTRY_FILE\"
            
            # 使用 PM2 启动服务
            pm2 start \$ENTRY_FILE --name 'x-auto-reply'
        else
            echo '📄 未发现应用入口文件，创建默认服务...'
            
            # 创建默认 Express 服务
            cat > server.js << 'SERVICE_EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

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
        endpoints: [
            'GET / - Service info',
            'GET /health - Health check',
            'GET /status - Service status'
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
        platform: process.platform
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
        github_repo: 'https://github.com/Juchonghao/x_mock'
    });
});

// API 端点
app.get('/api/info', (req, res) => {
    res.json({
        service: 'X Auto Reply',
        features: [
            'Twitter DM automation',
            'User following automation',
            'Tweet interaction (likes & comments)',
            'Headless browser support',
            'Anti-detection measures'
        ],
        github: 'https://github.com/Juchonghao/x_mock'
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
            pm2 start server.js --name 'x-auto-reply'
        fi
        
        # 保存 PM2 配置
        pm2 save
        pm2 startup
        
        # 等待服务启动
        echo '⏳ 等待服务启动...'
        sleep 5
        
        # 检查服务状态
        echo '📊 检查服务状态...'
        pm2 status
        
        # 检查端口
        echo '📊 检查端口监听...'
        netstat -tlnp | grep :3000 || echo '⚠️ 端口 3000 未监听'
        
        echo '✅ 服务启动完成'
    "
    
    log_success "服务构建和启动完成"
}

# 测试服务
test_service() {
    log_info "测试服务功能..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🧪 测试服务功能...'
        
        # 测试本地服务
        echo '📡 测试本地服务...'
        curl -s http://localhost:3000/ | jq . 2>/dev/null || curl -s http://localhost:3000/
        echo ''
        
        echo '❤️ 测试健康检查...'
        curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
        echo ''
        
        echo '📋 测试服务状态...'
        curl -s http://localhost:3000/status | jq . 2>/dev/null || curl -s http://localhost:3000/status
        echo ''
        
        echo '🔗 测试外部访问...'
        echo \"外部访问地址: http://$SERVER_IP:3000\"
    "
    
    log_success "服务测试完成"
}

# 检查部署结果
check_deployment_result() {
    log_info "检查部署结果..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '======================================'
        echo '📊 部署结果检查'
        echo '======================================'
        
        echo '🔧 系统信息:'
        echo '  操作系统: '$(lsb_release -d | cut -f2)
        echo '  Node.js: '$(node --version)
        echo '  NPM: '$(npm --version)
        echo '  PM2: '$(pm2 --version)
        
        echo ''
        echo '📁 项目信息:'
        echo '  项目目录: $PROJECT_DIR'
        echo '  GitHub 仓库: $GITHUB_REPO_URL'
        echo '  分支: $GITHUB_BRANCH'
        echo '  最后更新: '$(git log -1 --format='%cd')
        
        echo ''
        echo '⚙️ 服务状态:'
        pm2 status
        
        echo ''
        echo '🌐 网络状态:'
        netstat -tlnp | grep :3000
        
        echo ''
        echo '📊 系统资源:'
        echo '  磁盘使用:'
        df -h $PROJECT_DIR
        
        echo ''
        echo '  内存使用:'
        free -h
        
        echo ''
        echo '🔄 最近日志:'
        if [ -f '$PROJECT_DIR/logs/app.log' ]; then
            tail -10 $PROJECT_DIR/logs/app.log
        else
            pm2 logs x-auto-reply --lines 10 --nostream
        fi
        
        echo ''
        echo '======================================'
    "
    
    log_success "部署结果检查完成"
}

# 主要部署流程
main() {
    log_info "开始服务器直拉 GitHub 部署流程"
    echo "================================================"
    echo "🎯 目标: $GITHUB_REPO_URL"
    echo "🏠 服务器: $SERVER_IP"
    echo "📁 项目目录: $PROJECT_DIR"
    echo "================================================"
    
    # 1. 安装基础环境
    install_base_environment
    
    # 2. 克隆/更新代码
    clone_or_update_code
    
    # 3. 安装项目依赖
    install_project_dependencies
    
    # 4. 构建和启动服务
    build_and_start_service
    
    # 5. 测试服务
    test_service
    
    # 6. 检查部署结果
    check_deployment_result
    
    echo "================================================"
    log_success "GitHub 直拉部署完成！"
    echo ""
    echo "🎉 部署成功信息:"
    echo "  🌐 服务地址: http://$SERVER_IP:3000"
    echo "  ❤️ 健康检查: http://$SERVER_IP:3000/health"
    echo "  📋 服务状态: http://$SERVER_IP:3000/status"
    echo "  📊 API 信息: http://$SERVER_IP:3000/api/info"
    echo ""
    echo "🔧 管理命令:"
    echo "  查看服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 status'"
    echo "  重启服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 restart x-auto-reply'"
    echo "  查看日志: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 logs x-auto-reply'"
    echo "  更新代码: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && git pull origin $GITHUB_BRANCH && npm install && pm2 restart x-auto-reply'"
    echo ""
    echo "📝 更新流程:"
    echo "  1. 在 GitHub 上推送更新"
    echo "  2. 运行上述 '更新代码' 命令"
}

# 执行主函数
main "$@"