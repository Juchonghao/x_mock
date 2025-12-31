# X自动化服务 - 服务器API调用文档

## 🚀 服务器信息
- **服务器IP**: `65.49.203.108`
- **服务端口**: `3001`
- **基础URL**: `http://65.49.203.108:3001`

## 📋 API端点列表

### 1. 健康检查
**端点**: `GET /health`
```bash
curl http://65.49.203.108:3001/health
```
**响应示例**:
```json
{
  "status": "OK",
  "message": "X-Auto 服务运行正常",
  "timestamp": "2025-12-31T02:53:04.354Z",
  "port": 3001
}
```

### 2. 认证管理

#### 2.1 Auth Token登录
**端点**: `POST /api/auth/login`
```bash
curl -X POST http://65.49.203.108:3001/api/auth/login \
  -H "Content-Type: application/json"
```

#### 2.2 认证状态检查
**端点**: `GET /api/auth/status`
```bash
curl http://65.49.203.108:3001/api/auth/status
```
**响应示例**:
```json
{
  "authenticated": true,
  "verified": true,
  "status": "authenticated",
  "timestamp": "2025-12-31T02:53:22.846Z"
}
```

### 3. Twitter自动化功能

#### 3.1 关注用户
**端点**: `POST /api/twitter/follow`
```bash
curl -X POST http://65.49.203.108:3001/api/twitter/follow \
  -H "Content-Type: application/json" \
  -d '{"username": "elonmusk"}'
```
**参数说明**:
- `username`: 要关注的Twitter用户名（不包含@符号）

#### 3.2 点赞推文
**端点**: `POST /api/twitter/like`
```bash
curl -X POST http://65.49.203.108:3001/api/twitter/like \
  -H "Content-Type: application/json" \
  -d '{"tweetUrl": "https://twitter.com/username/status/1234567890"}'
```
**参数说明**:
- `tweetUrl`: 完整的推文URL

#### 3.3 评论推文
**端点**: `POST /api/twitter/comment`
```bash
curl -X POST http://65.49.203.108:3001/api/twitter/comment \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://twitter.com/username/status/1234567890",
    "comment": "这是一条测试评论"
  }'
```
**参数说明**:
- `tweetUrl`: 完整的推文URL
- `comment`: 评论内容

#### 3.4 批量关注
**端点**: `POST /api/twitter/batch-follow`
```bash
curl -X POST http://65.49.203.108:3001/api/twitter/batch-follow \
  -H "Content-Type: application/json" \
  -d '{
    "usernames": ["user1", "user2", "user3"],
    "delay": 5000
  }'
```
**参数说明**:
- `usernames`: 用户名数组
- `delay`: 操作间隔时间（毫秒），默认5000ms

#### 3.5 操作历史
**端点**: `GET /api/twitter/history`
```bash
curl http://65.49.203.108:3001/api/twitter/history
```

## 🔧 服务器管理命令

### 检查服务状态
```bash
# 检查端口占用
lsof -ti:3001

# 检查进程
ps -p $(lsof -ti:3001)

# 检查服务健康状态
curl http://65.49.203.108:3001/health
```

### 重启服务
```bash
# 进入项目目录
cd /path/to/x_mock

# 杀死现有进程
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "端口已清理"

# 设置环境变量并启动服务
export TWITTER_AUTH_TOKEN="你的auth_token"
export TWITTER_CT0="你的ct0"
export TWITTER_PERSONALIZATION_ID="你的personalization_id"
node start-x-service.js
```

### GitHub部署更新
```bash
# 拉取最新代码
./pull-from-github.sh

# 重启服务
./simple-update.sh
```

## 🔐 环境变量配置

服务器上需要设置以下环境变量：
```bash
export TWITTER_AUTH_TOKEN="748a8409eb2899a437671f25a5e7687ac6415107"
export TWITTER_CT0="fa95bade309fd481de3e379e8dccc1c1eca5999fe015464744a0b7f6965efc64d3832be7bf2b684aed91c7976130ea4b0cd328fbdc25759de6ceed7f3bb18392ef0bb603fe4c91bd9184c67891f9addd"
export TWITTER_PERSONALIZATION_ID="v1_zXh80kSutP2xpPJtstwSAA=="
```

## 🧪 完整测试流程

### 1. 检查服务状态
```bash
curl http://65.49.203.108:3001/health
```

### 2. 验证认证
```bash
curl http://65.49.203.108:3001/api/auth/status
```

### 3. 重新认证（如果需要）
```bash
curl -X POST http://65.49.203.108:3001/api/auth/login
```

### 4. 测试关注功能
```bash
curl -X POST http://65.49.203.108:3001/api/twitter/follow \
  -H "Content-Type: application/json" \
  -d '{"username": "elonmusk"}'
```

### 5. 测试批量关注
```bash
curl -X POST http://65.49.203.108:3001/api/twitter/batch-follow \
  -H "Content-Type: application/json" \
  -d '{
    "usernames": ["user1", "user2", "user3"],
    "delay": 3000
  }'
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
```bash
lsof -ti:3001 | xargs kill -9
```

2. **认证失败**
- 检查环境变量是否正确设置
- 重新执行认证: `curl -X POST /api/auth/login`

3. **服务无响应**
```bash
# 检查进程状态
ps aux | grep start-x-service

# 查看错误日志
node start-x-service.js
```

4. **网络连接问题**
- 确认服务器IP和端口
- 检查防火墙设置

## 📞 技术支持

如果遇到问题，请检查：
1. 服务器网络连接
2. 服务进程状态
3. 环境变量配置
4. API请求格式

---
*最后更新: 2025-12-31*