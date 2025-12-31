#!/bin/bash

# X-Auto-Reply 带认证的服务器部署脚本
# 部署到服务器并设置Twitter Auth Token认证

# 服务器配置
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
PROJECT_DIR="/root/x-auto-reply"
GITHUB_REPO_URL="https://github.com/Juchonghao/x_mock.git"
GITHUB_BRANCH="main"

# Twitter Auth Token配置
TWITTER_AUTH_TOKEN="748a8409eb2899a437671f25a5e7687ac6415107"
TWITTER_CT0="fa95bade309fd481de3e379e8dccc1c1eca5999fe015464744a0b7f6965efc64d3832be7bf2b684aed91c7976130ea4b0cd328fbdc25759de6ceed7f3bb18392ef0bb603fe4c91bd9184c67891f9addd"
TWITTER_PERSONALIZATION_ID="v1_zXh80kSutP2xpPJtstwSAA=="

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

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🛑 停止现有服务...'
        pm2 delete all 2>/dev/null || true
        pkill -f 'x-auto-reply' || true
        pkill -f 'node.*start' || true
        echo '✅ 现有服务已停止'
    "
}

# 清理和重新部署代码
redeploy_code() {
    log_info "清理并重新部署代码..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '🧹 清理旧代码...'
        git fetch origin
        git reset --hard origin/$GITHUB_BRANCH
        git clean -fd
        
        echo '📦 重新安装依赖...'
        rm -rf node_modules package-lock.json
        npm install --production
        
        echo '📁 创建必要目录...'
        mkdir -p logs sessions browser
        
        echo '✅ 代码重新部署完成'
    "
}

# 设置环境变量并启动服务
setup_environment_and_start() {
    log_info "设置环境变量并启动服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '🔐 设置Twitter Auth Token环境变量...'
        
        # 创建启动脚本包含环境变量
        cat > start-with-auth.sh << 'EOF'
#!/bin/bash
cd /root/x-auto-reply

echo '🚀 启动X-Auto服务（带Auth Token认证）...'

# 设置环境变量
export TWITTER_AUTH_TOKEN=\"748a8409eb2899a437671f25a5e7687ac6415107\"
export TWITTER_CT0=\"fa95bade309fd481de3e379e8dccc1c1eca5999fe015464744a0b7f6965efc64d3832be7bf2b684aed91c7976130ea4b0cd328fbdc25759de6ceed7f3bb18392ef0bb603fe4c91bd9184c67891f9addd\"
export TWITTER_PERSONALIZATION_ID=\"v1_zXh80kSutP2xpPJtstwSAA==\"

# 验证环境变量
echo '📋 环境变量检查:'
echo \"  TWITTER_AUTH_TOKEN: \${TWITTER_AUTH_TOKEN:0:10}...\"
echo \"  TWITTER_CT0: \${TWITTER_CT0:0:10}...\"
echo \"  TWITTER_PERSONALIZATION_ID: \${TWITTER_PERSONALIZATION_ID}\"

# 检查入口文件
if [ -f 'start-x-service.js' ]; then
    echo '📄 使用 start-x-service.js'
    ENTRY_FILE='start-x-service.js'
elif [ -f 'start.js' ]; then
    echo '📄 使用 start.js'
    ENTRY_FILE='start.js'
elif [ -f 'index.js' ]; then
    echo '📄 使用 index.js'
    ENTRY_FILE='index.js'
else
    echo '❌ 未找到入口文件'
    exit 1
fi

echo \"🚀 启动服务: \$ENTRY_FILE\"

# 使用PM2启动服务
pm2 start \$ENTRY_FILE --name 'x-auto-reply' --env production

# 保存PM2配置
pm2 save

# 等待启动
echo '⏳ 等待服务启动...'
sleep 8

# 检查状态
echo '📊 服务状态检查:'
pm2 status

echo '✅ 服务启动完成'
EOF

        chmod +x start-with-auth.sh
        
        # 执行启动脚本
        ./start-with-auth.sh
    "
}

# 测试服务功能
test_service_functionality() {
    log_info "测试服务功能..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🧪 测试服务功能...'
        
        # 等待服务完全启动
        sleep 5
        
        # 测试健康检查
        echo '❤️ 测试健康检查:'
        curl -s http://localhost:3001/health || echo '❌ 健康检查失败'
        
        echo ''
        echo '🔐 测试认证状态:'
        curl -s http://localhost:3001/api/auth/status || echo '❌ 认证检查失败'
        
        echo ''
        echo '📡 测试Auth Token登录:'
        curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' || echo '❌ Auth Token登录失败'
        
        echo ''
        echo '📊 PM2状态:'
        pm2 status
        
        echo ''
        echo '🌐 网络状态:'
        netstat -tlnp | grep :3001
    "
}

# 检查部署结果
check_deployment_result() {
    log_info "检查部署结果..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '======================================'
        echo '📊 部署结果检查'
        echo '======================================'
        
        echo '🔧 服务状态:'
        pm2 status
        
        echo ''
        echo '🌐 外部访问测试:'
        echo \"健康检查: http://$SERVER_IP:3001/health\"
        echo \"认证状态: http://$SERVER_IP:3001/api/auth/status\"
        
        echo ''
        echo '📋 最近日志:'
        pm2 logs x-auto-reply --lines 5 --nostream
        
        echo ''
        echo '======================================'
    "
}

# 主要部署流程
main() {
    log_info "开始带认证的服务器部署流程"
    echo "================================================"
    echo "🎯 GitHub: $GITHUB_REPO_URL"
    echo "🏠 服务器: $SERVER_IP"
    echo "📁 项目目录: $PROJECT_DIR"
    echo "🔐 Auth Token: 已配置"
    echo "================================================"
    
    # 1. 停止现有服务
    stop_existing_services
    
    # 2. 重新部署代码
    redeploy_code
    
    # 3. 设置环境变量并启动服务
    setup_environment_and_start
    
    # 4. 测试服务功能
    test_service_functionality
    
    # 5. 检查部署结果
    check_deployment_result
    
    echo "================================================"
    log_success "带认证的部署完成！"
    echo ""
    echo "🎉 部署成功信息:"
    echo "  🌐 服务地址: http://$SERVER_IP:3001"
    echo "  ❤️ 健康检查: http://$SERVER_IP:3001/health"
    echo "  🔐 认证状态: http://$SERVER_IP:3001/api/auth/status"
    echo ""
    echo "🔧 管理命令:"
    echo "  查看服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 status'"
    echo "  重启服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && ./start-with-auth.sh'"
    echo "  查看日志: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'pm2 logs x-auto-reply'"
}

# 执行主函数
main "$@"