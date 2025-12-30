#!/bin/bash

# X-Auto-Reply 部署脚本
# 部署到服务器: 65.49.203.108

# 服务器配置
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
PROJECT_DIR="/root/x-auto-reply"
LOCAL_PROJECT_DIR="/Users/chonghaoju/Documents/trae_projects/x_mock"

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

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    # 检查是否安装了 sshpass
    if ! command -v sshpass &> /dev/null; then
        log_warning "sshpass 未安装，正在安装..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install sshpass
        elif [[ -f /etc/debian_version ]]; then
            sudo apt update && sudo apt install -y sshpass
        elif [[ -f /etc/redhat-release ]]; then
            sudo yum install -y sshpass
        fi
    fi
    
    log_success "依赖检查完成"
}

# 创建部署包
create_deployment_package() {
    log_info "创建部署包..."
    
    # 创建临时目录
    DEPLOY_DIR="deployment_$(date +%Y%m%d_%H%M%S)"
    mkdir -p $DEPLOY_DIR
    
    # 复制核心文件
    cp -r src/ $DEPLOY_DIR/
    cp *.js $DEPLOY_DIR/ 2>/dev/null || true
    cp package.json $DEPLOY_DIR/
    cp sessions/ $DEPLOY_DIR/ 2>/dev/null || true
    cp logs/ $DEPLOY_DIR/ 2>/dev/null || true
    cp -r browser/ $DEPLOY_DIR/ 2>/dev/null || true
    
    # 创建启动脚本
    cat > $DEPLOY_DIR/start.sh << 'EOF'
#!/bin/bash
cd /root/x-auto-reply

# 检查 Node.js 版本
node_version=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Node.js 未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "当前 Node.js 版本: $(node --version)"

# 安装依赖
npm install

# 启动服务
echo "启动 X Auto Reply 服务..."
if [ -f "index.js" ]; then
    nohup node index.js > /dev/null 2>&1 &
elif [ -f "main.js" ]; then
    nohup node main.js > /dev/null 2>&1 &
else
    echo "未找到入口文件，创建示例服务..."
    cat > simple_service.js << 'SERVICE_EOF'
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('X Auto Reply Service is running!');
});

app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        service: 'x-auto-reply'
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`X Auto Reply 服务启动在端口 ${port}`);
});
SERVICE_EOF
    nohup node simple_service.js > /dev/null 2>&1 &
fi

echo "服务启动完成，PID: $!"
echo "服务状态: http://localhost:3000/status"
EOF
    
    chmod +x $DEPLOY_DIR/start.sh
    
    # 创建 PM2 配置（如果需要）
    cat > $DEPLOY_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'x-auto-reply',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
};
EOF

    log_success "部署包创建完成: $DEPLOY_DIR"
    echo $DEPLOY_DIR
}

# 部署到服务器
deploy_to_server() {
    local deploy_dir=$1
    log_info "部署到服务器 $SERVER_IP..."
    
    # 创建远程目录
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        mkdir -p $PROJECT_DIR
        cd $PROJECT_DIR
        # 备份现有文件
        if [ -f 'index.js' ]; then
            mv index.js index.js.backup.\$(date +%Y%m%d_%H%M%S)
        fi
    "
    
    # 上传文件
    sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no $deploy_dir/* $SERVER_USER@$SERVER_IP:$PROJECT_DIR/
    
    # 设置权限
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        chmod +x start.sh
        chown -R root:root .
    "
    
    log_success "文件上传完成"
}

# 在服务器上安装依赖
install_dependencies() {
    log_info "在服务器上安装依赖..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        # 更新系统包
        apt update -y
        
        # 安装 Node.js (如果未安装)
        if ! command -v node &> /dev/null; then
            echo '安装 Node.js...'
            curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
            apt-get install -y nodejs
        fi
        
        # 安装 npm 依赖
        echo '安装项目依赖...'
        npm install
        
        # 安装 PM2 (进程管理)
        if ! command -v pm2 &> /dev/null; then
            npm install -g pm2
        fi
        
        echo '依赖安装完成'
    "
    
    log_success "服务器依赖安装完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        # 停止可能存在的旧进程
        pkill -f 'x-auto-reply' || true
        pm2 delete all 2>/dev/null || true
        
        # 启动新服务
        ./start.sh
        
        # 等待服务启动
        sleep 5
        
        # 检查服务状态
        ps aux | grep -E '(node|simple_service)' | grep -v grep || true
        netstat -tlnp | grep :3000 || echo '端口 3000 未监听'
        
        # 测试服务
        curl -s http://localhost:3000/status || echo '服务测试失败'
    "
    
    log_success "服务启动完成"
}

# 主要部署流程
main() {
    log_info "开始部署 X Auto Reply 到服务器 $SERVER_IP"
    echo "================================================"
    
    # 1. 检查依赖
    check_dependencies
    
    # 2. 创建部署包
    deploy_dir=$(create_deployment_package)
    
    # 3. 部署到服务器
    deploy_to_server $deploy_dir
    
    # 4. 安装依赖
    install_dependencies
    
    # 5. 启动服务
    start_services
    
    # 6. 清理临时文件
    rm -rf $deploy_dir
    
    echo "================================================"
    log_success "部署完成！"
    echo ""
    echo "访问信息:"
    echo "  服务器地址: $SERVER_IP"
    echo "  服务端口: 3000"
    echo "  状态页面: http://$SERVER_IP:3000/status"
    echo ""
    echo "服务器管理命令:"
    echo "  查看服务状态: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'ps aux | grep node'"
    echo "  重启服务: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && ./start.sh'"
    echo "  查看日志: sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && tail -f logs/*'"
}

# 执行主函数
main "$@"