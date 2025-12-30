#!/bin/bash
echo '从 GitHub 拉取代码并重启服务'
cd /root/x-auto-reply
echo '停止服务'
pm2 delete all 2>/dev/null || true
pkill -f 'node.*start-x-service' 2>/dev/null || true
echo '拉取最新代码'
git fetch origin
git reset --hard origin/main
echo '安装依赖'
npm install
echo '启动服务'
pm2 start start-x-service.js --name 'x-auto-reply'
pm2 save
echo '等待服务启动'
sleep 5
echo '检查服务状态'
pm2 list
echo '测试健康检查'
curl -s http://localhost:3001/health || echo '健康检查失败'
echo '完成!'