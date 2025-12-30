#!/bin/bash

# 从 GitHub 拉取代码脚本
# 服务器专用：从 GitHub 仓库拉取最新代码并部署

# 服务器配置
SERVER_IP="65.49.203.108"
SERVER_USER="root"
SERVER_PASSWORD="4Y79Cg0SRiSY"
PROJECT_DIR="/root/x-auto-reply"

# GitHub 仓库配置（需要用户手动配置）
GITHUB_REPO_URL="https://github.com/Juchonghao/x_mock.git"  # 用户需要手动设置，如：https://github.com/username/repo.git

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

# 检查 GitHub 仓库配置
check_github_config() {
    log_info "检查 GitHub 仓库配置..."
    
    if [[ -z "$GITHUB_REPO_URL" ]]; then
        log_warning "请先配置 GitHub 仓库 URL"
        echo ""
        echo "使用说明："
        echo "1. 在 GitHub 上创建新仓库"
        echo "2. 本地推送代码到 GitHub:"
        echo "   git remote add origin <你的GitHub仓库URL>"
        echo "   git push -u origin main"
        echo "3. 编辑此脚本，设置 GITHUB_REPO_URL 变量"
        echo "4. 运行脚本从 GitHub 拉取代码"
        echo ""
        return 1
    else
        log_success "GitHub 仓库配置: $GITHUB_REPO_URL"
        return 0
    fi
}

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🛑 停止现有服务...'
        
        # 停止 PM2 进程
        if command -v pm2 >/dev/null 2>&1; then
            pm2 delete all 2>/dev/null || true
            pm2 flush 2>/dev/null || true
        fi
        
        # 清理可能的 Node.js 进程
        pkill -f 'node.*start-x-service' 2>/dev/null || true
        pkill -f 'node.*test-*' 2>/dev/null || true
        
        echo '✅ 服务已停止'
    "
}

# 从 GitHub 拉取代码
pull_from_github() {
    log_info "从 GitHub 拉取代码..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '📥 从 GitHub 拉取最新代码...'
        
        # 检查是否是 git 仓库
        if [ ! -d '.git' ]; then
            echo '🆕 首次克隆代码库...'
            git clone $GITHUB_REPO_URL .
        else
            echo '🔄 更新现有代码库...'
            git fetch origin
            git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
        fi
        
        # 检查代码状态
        echo '📊 代码状态:'
        echo '  当前分支: '\$(git branch --show-current)
        echo '  最新提交: '\$(git log -1 --oneline)
        
        echo '✅ 代码拉取完成'
    "
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '📦 安装 Node.js 依赖...'
        
        # 检查是否有 package.json
        if [ ! -f 'package.json' ]; then
            echo '❌ 未找到 package.json 文件'
            exit 1
        fi
        
        # 安装依赖
        npm install
        
        echo '✅ 依赖安装完成'
    "
}

# 启动服务
start_service() {
    log_info "启动服务..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd $PROJECT_DIR
        
        echo '🚀 启动服务...'
        
        # 安装 PM2（如果未安装）
        if ! command -v pm2 >/dev/null 2>&1; then
            echo '📦 安装 PM2...'
            npm install -g pm2
        fi
        
        # 启动服务
        pm2 start start-x-service.js --name 'x-auto-reply' --watch
        
        # 保存 PM2 配置
        pm2 save
        
        # 检查服务状态
        echo ''
        echo '📊 服务状态:'
        pm2 list
        
        echo '✅ 服务启动完成'
    "
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        echo '🔍 健康检查...'
        
        # 等待服务启动
        echo '⏳ 等待服务启动...'
        sleep 5
        
        # 检查服务是否运行
        if pm2 list | grep -q 'x-auto-reply.*online'; then
            echo '✅ 服务运行正常'
            
            # 测试健康检查端点
            echo '🌐 测试健康检查端点...'
            response=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health 2>/dev/null || echo '000')
            
            if [ \"\$response\" = '200' ]; then
                echo '✅ 健康检查端点正常'
            else
                echo '⚠️ 健康检查端点响应异常 (HTTP: \$response)'
            fi
        else
            echo '❌ 服务未正常运行'
        fi
    "
}

# 显示部署总结
show_summary() {
    log_success "部署总结"
    echo ""
    echo "📋 部署信息:"
    echo "  服务器: $SERVER_IP"
    echo "  项目目录: $PROJECT_DIR"
    echo "  GitHub 仓库: $GITHUB_REPO_URL"
    echo ""
    echo "🔧 常用命令:"
    echo "  查看服务状态: pm2 list"
    echo "  查看服务日志: pm2 logs x-auto-reply"
    echo "  重启服务: pm2 restart x-auto-reply"
    echo "  停止服务: pm2 stop x-auto-reply"
    echo ""
    echo "📝 下一步操作:"
    echo "1. 本地修改代码"
    echo "2. 推送到 GitHub: git push origin main"
    echo "3. 运行此脚本拉取最新代码: ./pull-from-github.sh"
    echo ""
}

# 主函数
main() {
    echo "🚀 从 GitHub 拉取代码并部署"
    echo "=" * 50
    echo ""
    
    # 检查 GitHub 配置
    if ! check_github_config; then
        exit 1
    fi
    
    echo ""
    
    # 执行部署步骤
    stop_existing_services
    echo ""
    
    pull_from_github
    echo ""
    
    install_dependencies
    echo ""
    
    start_service
    echo ""
    
    health_check
    echo ""
    
    show_summary
}

# 运行主函数
main "$@"