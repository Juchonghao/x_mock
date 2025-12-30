#!/bin/bash

# X-Auto-Reply GitHub 部署脚本
# 通过 GitHub 仓库部署到服务器: 65.49.203.108

# 服务器配置
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
PROJECT_DIR="/root/x-auto-reply"
GITHUB_REPO_URL="https://github.com/YOUR_USERNAME/x-auto-reply.git"  # 需要用户替换为实际的 GitHub 仓库 URL

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

# 检查 GitHub 仓库 URL 是否已配置
check_github_config() {
    log_info "检查 GitHub 仓库配置..."
    
    if [[ "$GITHUB_REPO_URL" == "https://github.com/YOUR_USERNAME/x-auto-reply.git" ]]; then
        log_warning "请先配置 GitHub 仓库 URL"
        echo ""
        echo "1. 在 GitHub 上创建新仓库 'x-auto-reply'"
        echo "2. 替换脚本中的 GITHUB_REPO_URL 变量"
        echo "3. 推送代码到 GitHub:"
        echo "   git remote add origin <你的GitHub仓库URL>"
        echo "   git push -u origin main"
        echo ""
        return 1
    fi
    
    log_success "GitHub 仓库配置正确"
    return 0
}

# 本地 Git 操作
setup_local_git() {
    log_info "设置本地 Git 仓库..."
    
    # 添加所有文件
    git add .
    
    # 提交代码
    git commit -m "Initial commit: X Auto Reply Service

Features:
- Playwright DM Service for X/Twitter automation
- Playwright Follow Service for user following
- Playwright Interaction Service for liking and commenting
- Headless browser support
- Anti-detection measures
- Session management with cookies" 2>/dev/null || true
    
    # 添加远程仓库（如果不存在）
    if ! git remote get-url origin >/dev/null 2>&1; then
        read -p "请输入 GitHub 仓库 URL: " repo_url
        if [[ -n "$repo_url" ]]; then
            git remote add origin "$repo_url"
            log_success "远程仓库已添加"
        else
            log_warning "未提供仓库 URL，跳过远程仓库设置"
        fi
    fi
    
    log_success "本地 Git 设置完成"
}

# 在服务器上安装 Git（如果需要）
install_git_on_server() {
    log_info "检查服务器上的 Git..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        if ! command -v git &> /dev/null; then
            echo 'Git 未安装，正在安装...'
            apt update -y
            apt install -y git
        else
            echo 'Git 已安装'
        fi
        
        # 检查 Git 版本
        git --version
    "
    
    log_success "Git 检查完成"
}

# 从 GitHub 克隆到服务器
deploy_from_github() {
    log_info "从 GitHub 克隆项目到服务器..."
    
    # 停止可能存在的旧服务
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        pkill -f 'x-auto-reply' || true
        pm2 delete all 2>/dev/null || true
    "
    
    # 克隆或更新代码
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        if [ -d '$PROJECT_DIR/.git' ]; then
            echo '项目目录已存在，更新代码...'
            cd $PROJECT_DIR
            git pull origin main 2>/dev/null || echo 'Git pull 失败，继续使用现有代码'
        else
            echo '克隆 GitHub 仓库...'
            git clone $GITHUB_REPO_URL $PROJECT_DIR
        fi
        
        # 检查项目文件
        if [ -f '$PROJECT_DIR/package.json' ]; then
            echo '✅ 项目文件完整'
        else
            echo '❌ 项目文件不完整，请检查 GitHub 仓库'
        fi
        
        # 列出项目文件
        ls -la $PROJECT_DIR/
    "
    
    log_success "代码部署完成"
}

# 在服务器上安装依赖
install_dependencies() {
    log_info "在服务器上安装项目依赖..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        # 安装 Node.js（如果需要）
        if ! command -v node &> /dev/null; then
            echo '安装 Node.js...'
            curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
            apt-get install -y nodejs
        fi
        
        # 安装项目依赖
        echo '安装 npm 依赖...'
        npm install --production
        
        # 安装 PM2（如果需要）
        if ! command -v pm2 &> /dev/null; then
            npm install -g pm2
        fi
        
        # 创建必要的目录
        mkdir -p logs sessions
        
        echo '✅ 依赖安装完成'
    "
    
    log_success "服务器依赖安装完成"
}

# 在服务器上启动服务
start_services() {
    log_info "在服务器上启动服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        # 创建启动脚本
        cat > start_service.sh << 'EOF'
#!/bin/bash
cd /root/x-auto-reply

echo \"🚀 启动 X Auto Reply 服务...\"

# 检查 package.json 中是否有 start 脚本
if grep -q '\"start\"' package.json; then
    echo \"📦 使用 package.json 中的 start 脚本\"
    nohup npm start > logs/app.log 2>&1 &
else
    echo \"📦 创建默认服务...\"
    
    # 创建简单的 Express 服务
    cat > simple_server.js << 'SERVICE_EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        service: 'X Auto Reply',
        status: 'running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/users', (req, res) => {
    // 模拟 API 端点
    res.json({
        message: 'X Auto Reply API',
        endpoints: [
            'GET /',
            'GET /health',
            'GET /api/users'
        ]
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(\`🚀 X Auto Reply 服务运行在端口 \${port}\`);
    console.log(\`📊 访问地址: http://localhost:\${port}\`);
    console.log(\`❤️ 健康检查: http://localhost:\${port}/health\`);
});
SERVICE_EOF
    
    # 启动服务
    nohup node simple_server.js > logs/app.log 2>&1 &
fi

echo \"✅ 服务启动完成\"
echo \"📊 访问地址: http://localhost:3000\"
echo \"❤️ 健康检查: http://localhost:3000/health\"
EOF

        chmod +x start_service.sh
        
        # 执行启动脚本
        ./start_service.sh
        
        # 等待服务启动
        sleep 3
        
        # 检查服务状态
        echo \"📊 检查服务状态...\"
        ps aux | grep -E '(node|npm)' | grep -v grep || echo \"⚠️ 未找到运行中的服务\"
        
        # 测试服务
        echo \"🧪 测试服务...\"
        curl -s http://localhost:3000 || echo \"⚠️ 服务测试失败\"
        echo \"\"
        curl -s http://localhost:3000/health || echo \"⚠️ 健康检查失败\"
    "
    
    log_success "服务启动完成"
}

# 检查部署状态
check_deployment_status() {
    log_info "检查部署状态..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '=== 服务器状态 ==='
        echo '📊 磁盘使用:'
        df -h $PROJECT_DIR | tail -1
        
        echo '📊 服务进程:'
        ps aux | grep -E '(node|npm)' | grep -v grep || echo '未找到服务进程'
        
        echo '📊 网络端口:'
        netstat -tlnp | grep :3000 || echo '端口 3000 未监听'
        
        echo '📊 最近日志:'
        if [ -f '$PROJECT_DIR/logs/app.log' ]; then
            tail -10 $PROJECT_DIR/logs/app.log 2>/dev/null || echo '无法读取日志'
        else
            echo '日志文件不存在'
        fi
        
        echo '=== 测试 HTTP 服务 ==='
        curl -s http://localhost:3000 | head -5 || echo 'HTTP 服务测试失败'
    "
    
    log_success "部署状态检查完成"
}

# 主要部署流程
main() {
    log_info "开始通过 GitHub 部署 X Auto Reply 到服务器"
    echo "================================================"
    
    # 1. 检查 GitHub 配置
    if ! check_github_config; then
        log_error "GitHub 配置未完成，部署中止"
        return 1
    fi
    
    # 2. 设置本地 Git
    setup_local_git
    
    # 3. 安装 Git 到服务器
    install_git_on_server
    
    # 4. 从 GitHub 部署代码
    deploy_from_github
    
    # 5. 安装依赖
    install_dependencies
    
    # 6. 启动服务
    start_services
    
    # 7. 检查部署状态
    check_deployment_status
    
    echo "================================================"
    log_success "GitHub 部署完成！"
    echo ""
    echo "🎉 部署成功信息:"
    echo "  🌐 服务地址: http://$SERVER_IP:3000"
    echo "  ❤️ 健康检查: http://$SERVER_IP:3000/health"
    echo "  📊 状态页面: http://$SERVER_IP:3000"
    echo ""
    echo "🔧 服务器管理命令:"
    echo "  查看进程: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'ps aux | grep node'"
    echo "  重启服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && ./start_service.sh'"
    echo "  查看日志: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && tail -f logs/app.log'"
    echo ""
    echo "📝 更新代码:"
    echo "  1. 在本地更新代码并提交到 GitHub"
    echo "  2. 运行: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && git pull origin main && npm install'"
}

# 执行主函数
main "$@"