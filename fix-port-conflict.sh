#!/bin/bash

# X-Auto-Reply 端口冲突修复脚本
# 解决服务器端口 3000 被占用的问题

# 服务器配置
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
PROJECT_DIR="/root/x-auto-reply"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查端口占用情况
check_port_usage() {
    log_info "检查端口占用情况..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🔍 检查端口 3000 占用情况:'
        netstat -tlnp | grep :3000
        echo ''
        
        echo '🔍 检查 Docker 进程:'
        docker ps 2>/dev/null || echo 'Docker 命令不可用'
        echo ''
        
        echo '🔍 检查 PM2 进程:'
        pm2 status 2>/dev/null || echo 'PM2 不可用或无进程'
        echo ''
        
        echo '🔍 检查 Node.js 进程:'
        ps aux | grep node | grep -v grep || echo '无 Node.js 进程'
    "
}

# 清理冲突进程
cleanup_conflicts() {
    log_info "清理冲突进程..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🧹 清理 PM2 进程...'
        pm2 delete all 2>/dev/null || echo 'PM2 无进程可清理'
        
        echo '🧹 清理 Node.js 进程...'
        pkill -f 'node' || echo '无 Node.js 进程可清理'
        pkill -f 'npm' || echo '无 npm 进程可清理'
        
        echo '🧹 清理 Docker 进程 (端口 3000)...'
        # 查找占用端口 3000 的进程
        PID_3000=\$(netstat -tlnp 2>/dev/null | grep :3000 | awk '{print \$7}' | cut -d'/' -f1 | head -1)
        if [ ! -z \"\$PID_3000\" ]; then
            echo \"🔍 找到占用端口 3000 的进程 PID: \$PID_3000\"
            kill -9 \$PID_3000 2>/dev/null || echo \"无法清理进程 \$PID_3000\"
        else
            echo '⚠️ 未找到占用端口 3000 的进程'
        fi
        
        echo '✅ 清理完成'
    "
}

# 创建服务脚本（使用端口 3001）
create_service_script() {
    log_info "创建服务启动脚本..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '📄 创建服务启动脚本...'
        
        # 创建新的服务脚本，使用端口 3001
        cat > start-x-service.js << 'SERVICE_EOF'
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
        port: port,
        features: [
            'Twitter DM automation',
            'User following automation',
            'Tweet interaction (likes & comments)',
            'Headless browser support',
            'Anti-detection measures'
        ],
        github: 'https://github.com/Juchonghao/x_mock',
        deployment: 'GitHub direct deployment'
    });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
    console.log('🚀 X Auto Reply 服务启动成功!');
    console.log('📊 服务地址: http://localhost:' + port);
    console.log('❤️ 健康检查: http://localhost:' + port + '/health');
    console.log('📋 服务状态: http://localhost:' + port + '/status');
    console.log('🔗 GitHub: https://github.com/Juchonghao/x_mock');
    console.log('⏰ 启动时间: ' + new Date().toISOString());
});
SERVICE_EOF
        
        # 创建 PM2 配置文件
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'x-auto-reply',
    script: 'start-x-service.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
        
        echo '✅ 服务脚本创建完成'
    "
}

# 安装 PM2 和依赖
install_pm2_and_dependencies() {
    log_info "安装 PM2 和项目依赖..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '📦 安装 PM2...'
        if ! command -v pm2 &> /dev/null; then
            npm install -g pm2
        else
            echo '✅ PM2 已安装'
        fi
        
        echo '📦 安装项目依赖...'
        npm install --production
        
        echo '📁 创建日志目录...'
        mkdir -p logs
        
        echo '✅ PM2 和依赖安装完成'
    "
}

# 启动服务
start_service() {
    log_info "启动 X Auto Reply 服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '🚀 启动服务...'
        
        # 使用 PM2 启动
        pm2 start ecosystem.config.js
        
        # 等待服务启动
        sleep 3
        
        echo '📊 检查服务状态...'
        pm2 status
        
        echo '🌐 检查端口监听...'
        netstat -tlnp | grep :3001
        
        echo '🧪 测试服务...'
        curl -s http://localhost:3001/ | head -3
    "
}

# 测试服务
test_service() {
    log_info "测试服务功能..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🧪 测试服务功能...'
        echo ''
        
        echo '📡 测试根路径...'
        curl -s http://localhost:3001/
        echo ''
        
        echo '❤️ 测试健康检查...'
        curl -s http://localhost:3001/health
        echo ''
        
        echo '📋 测试服务状态...'
        curl -s http://localhost:3001/status
        echo ''
        
        echo '🔗 测试 API 信息...'
        curl -s http://localhost:3001/api/info
        echo ''
    "
}

# 显示部署信息
show_deployment_info() {
    log_success "部署信息"
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '======================================'
        echo '🎉 X Auto Reply 服务部署成功!'
        echo '======================================'
        echo ''
        echo '🌐 服务地址:'
        echo '  主页面: http://$SERVER_IP:3001'
        echo '  健康检查: http://$SERVER_IP:3001/health'
        echo '  服务状态: http://$SERVER_IP:3001/status'
        echo '  API 信息: http://$SERVER_IP:3001/api/info'
        echo ''
        echo '🔧 管理命令:'
        echo '  查看状态: pm2 status'
        echo '  重启服务: pm2 restart x-auto-reply'
        echo '  查看日志: pm2 logs x-auto-reply'
        echo '  停止服务: pm2 stop x-auto-reply'
        echo ''
        echo '📊 系统状态:'
        echo '  PM2 状态:'
        pm2 status
        echo ''
        echo '  端口监听:'
        netstat -tlnp | grep :3001
        echo ''
        echo '======================================'
    "
}

# 主要修复流程
main() {
    log_info "开始修复端口冲突并部署服务"
    echo "================================================"
    
    # 1. 检查端口占用
    check_port_usage
    
    # 2. 清理冲突进程
    cleanup_conflicts
    
    # 3. 创建服务脚本
    create_service_script
    
    # 4. 安装依赖
    install_pm2_and_dependencies
    
    # 5. 启动服务
    start_service
    
    # 6. 测试服务
    test_service
    
    # 7. 显示部署信息
    show_deployment_info
    
    echo "================================================"
    log_success "端口冲突修复和服务部署完成！"
}

# 执行主函数
main "$@"