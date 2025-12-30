# 多容器IP部署配置指南

## 概述

本指南将帮助您配置X Bot项目的多容器部署，实现不同容器使用不同IP地址的需求。

## 架构组件

### 核心服务

1. **IP Manager Service** (端口 3001)
   - 集中管理代理IP池
   - 分配和管理IP给各个容器
   - 监控IP使用状态

2. **Bot Instances** (端口 3002-3004)
   - x-bot-1: 美国东部
   - x-bot-2: 美国西部  
   - x-bot-3: 欧盟中部

3. **Monitoring Service** (端口 3005)
   - 实时监控所有容器状态
   - 提供Web Dashboard
   - IP使用统计

4. **Load Balancer** (端口 80/443)
   - Nginx负载均衡
   - API路由和限流
   - SSL终端

## 配置步骤

### 1. 代理IP池配置

编辑 `data/ip-pool.json` 文件，配置您的代理服务器：

```json
[
  {
    "url": "http://username:password@proxy1.example.com:8080",
    "type": "http",
    "status": "available",
    "location": "US-East",
    "provider": "ProxyProvider1"
  },
  {
    "url": "http://username:password@proxy2.example.com:8080",
    "type": "http", 
    "status": "available",
    "location": "US-West",
    "provider": "ProxyProvider2"
  }
  // 更多代理...
]
```

### 2. 环境变量配置

确保 `.env` 文件包含必要的配置：

```bash
# Twitter配置
TWITTER_COOKIES="[{\"name\":\"auth_token\",\"value\":\"your_token\"}]"

# 服务配置
SERVICE_TYPE=bot
CONTAINER_ID=bot-1
IP_MANAGER_URL=http://ip-manager:3001

# 浏览器配置
HEADLESS=true
```

### 3. 部署服务

```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 部署所有服务
./deploy.sh deploy

# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 停止服务
./deploy.sh stop
```

## 监控和管理

### Web Dashboard

访问 `http://localhost/monitoring/api/dashboard` 查看：
- 所有容器状态
- IP使用统计
- 实时监控数据

### API端点

- `GET /api/ip-status` - IP池状态
- `GET /api/bot-instances` - 机器人实例
- `GET /api/dashboard` - 完整仪表板

### 日志管理

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f x-bot-1
docker-compose logs -f ip-manager
docker-compose logs -f monitoring
```

## IP轮换机制

### 自动轮换

Bot实例会自动请求新IP：
- 启动时分配可用IP
- 定期轮换（可配置）
- 错误时自动切换

### 手动轮换

在代码中调用：
```javascript
// 轮换IP
await browserService.rotateIP();

// 查看当前IP信息
const ipInfo = browserService.getCurrentIPInfo();
console.log(ipInfo);
```

## 扩展部署

### 添加更多Bot实例

1. 在 `docker-compose.yml` 中添加新服务：
```yaml
x-bot-4:
  # ... 配置类似其他bot实例
  environment:
    - CONTAINER_ID=bot-4
    - CONTAINER_NAME=x-bot-4
    - PORT=3006
```

2. 在 `nginx.conf` 中添加后端：
```nginx
upstream bot_backend {
  # ... 现有配置
  server x-bot-4:3000 weight=1;
}
```

3. 在 `data/ip-pool.json` 中添加对应代理

### 负载均衡策略

支持多种负载均衡算法：
- `least_conn` - 最少连接（默认）
- `ip_hash` - IP哈希
- `round_robin` - 轮询

## 故障排除

### 常见问题

1. **IP Manager无法启动**
   - 检查端口3001是否被占用
   - 验证 `data/ip-pool.json` 格式

2. **Bot实例无法获取IP**
   - 检查IP Manager服务状态
   - 验证网络连通性

3. **代理连接失败**
   - 验证代理服务器凭据
   - 检查代理服务器可用性

### 健康检查

每个服务都有健康检查端点：
```bash
# 检查IP Manager健康状态
curl http://localhost:3001/health

# 检查Bot实例健康状态
curl http://localhost:3002/health
```

## 安全考虑

1. **代理认证**
   - 使用强密码
   - 定期更换代理凭据

2. **网络隔离**
   - 使用Docker网络隔离
   - 限制内部服务访问

3. **SSL配置**
   - 生产环境启用HTTPS
   - 配置SSL证书

## 性能优化

1. **资源限制**
   - 合理设置内存和CPU限制
   - 监控资源使用

2. **IP轮换策略**
   - 根据业务需求调整轮换频率
   - 避免过于频繁的轮换

3. **并发控制**
   - 设置合适的并发数
   - 实现请求限流