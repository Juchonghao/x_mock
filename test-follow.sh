#!/bin/bash

echo "🔐 测试服务器认证..."
AUTH_RESULT=$(curl -s -X POST http://65.49.203.108:3001/api/auth/login \
  -H "Content-Type: application/json")

echo "认证结果: $AUTH_RESULT"

echo ""
echo "🔄 测试关注NHL账号..."
FOLLOW_RESULT=$(curl -s -X POST http://65.49.203.108:3001/api/twitter/batch-follow \
  -H "Content-Type: application/json" \
  -d '{"usernames": ["NHL"], "delay": 3000}')

echo "关注结果: $FOLLOW_RESULT"

# 解析JSON结果
SUCCESS=$(echo "$FOLLOW_RESULT" | grep -o '"success":true' | wc -l)
if [ $SUCCESS -gt 0 ]; then
  echo "✅ NHL关注成功！"
else
  echo "❌ NHL关注失败"
fi

echo ""
echo "🔄 测试关注CNN账号..."
FOLLOW_CNN=$(curl -s -X POST http://65.49.203.108:3001/api/twitter/batch-follow \
  -H "Content-Type: application/json" \
  -d '{"usernames": ["CNN"], "delay": 3000}')

echo "CNN关注结果: $FOLLOW_CNN"

SUCCESS_CNN=$(echo "$FOLLOW_CNN" | grep -o '"success":true' | wc -l)
if [ $SUCCESS_CNN -gt 0 ]; then
  echo "✅ CNN关注成功！"
else
  echo "❌ CNN关注失败"
fi