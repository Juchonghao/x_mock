# Oxylabs 代理配置指南

## 概述

Oxylabs 提供高质量的住宅代理和数据中心代理服务。本指南将帮助你在X Bot项目中配置和使用Oxylabs代理。

## Oxylabs 账户设置

### 1. 获取API凭据

1. 登录 [Oxylabs Dashboard](https://dashboard.oxylabs.io/)
2. 进入 **API Access** 页面
3. 记录你的：
   - **Username** (用户名)
   - **Password** (密码) 
   - **API Key** (API密钥，可选)

### 2. 选择代理类型

Oxylabs 提供两种主要代理类型：

#### 住宅代理 (Residential Proxies)
- **格式**: `residential.oxylabs.io:8000`
- **优势**: IP地址来自真实用户，难以被检测
- **适用**: 社交媒体自动化、数据采集
- **价格**: 较高

#### 数据中心代理 (Datacenter Proxies)  
- **格式**: `datacenter.oxylabs.io:8000`
- **优势**: 速度快，价格便宜
- **适用**: 需要大量请求的场景
- **价格**: 较低

## 配置步骤

### 步骤1: 复制配置文件

```bash
# 复制Oxylabs配置模板
cp data/oxylabs-ip-pool.json data/ip-pool.json
```

### 步骤2: 更新凭据

编辑 `data/ip-pool.json`，替换以下信息：

```json
{
  "url": "http://your-username-your-session@datacenter.oxylabs.io:8000",
  "username": "your-username-your-session",
  "password": "your_actual_password",
  "status": "available",
  "location": "US-East",
  "provider": "Oxylabs"
}
```

**重要**: 
- 将 `your-username-your-session` 替换为你的实际用户名
- 将 `your_actual_password` 替换为你的实际密码

### 步骤3: 验证配置

测试代理连接：

```bash
# 运行测试脚本
node test-oxylabs.js
```

## 会话管理

### 会话格式

Oxylabs支持会话管理，格式为：
```
username-country-city-sessionid
```

示例：
```
john123-US-NYC-session001
john123-UK-LON-session002
```

### 粘性会话 (Sticky Sessions)

在用户名后添加会话ID，可以保持同一会话的IP不变：

```javascript
// 粘性会话 - 同一会话使用相同IP
const stickySession = "john123-US-NYC-session001";

// 非粘性会话 - 每次请求可能使用不同IP  
const nonStickySession = "john123-US-NYC";
```

## IP池配置示例

### 住宅代理配置

```json
{
  "url": "http://yourusername-US-NYC-session123@residential.oxylabs.io:8000",
  "type": "http",
  "username": "yourusername-US-NYC-session123", 
  "password": "your_password",
  "status": "available",
  "location": "US-East",
  "provider": "Oxylabs",
  "proxyType": "residential",
  "country": "US",
  "city": "NYC"
}
```

### 数据中心代理配置

```json
{
  "url": "http://yourusername-US-DC-session456@datacenter.oxylabs.io:8000",
  "type": "http",
  "username": "yourusername-US-DC-session456",
  "password": "your_password", 
  "status": "available",
  "location": "US-East-DC",
  "provider": "Oxylabs",
  "proxyType": "datacenter",
  "country": "US",
  "city": "DC"
}
```

## 地理位置选择

### 支持的国家/城市

常见配置示例：

| 国家代码 | 城市 | 配置示例 |
|---------|------|---------|
| US | New York | `john123-US-NYC-session001` |
| US | Los Angeles | `john123-US-LAX-session002` |
| US | Chicago | `john123-US-CHI-session003` |
| UK | London | `john123-UK-LON-session004` |
| DE | Frankfurt | `john123-DE-FRA-session005` |
| CA | Toronto | `john123-CA-TOR-session006` |
| AU | Sydney | `john123-AU-SYD-session007` |
| SG | Singapore | `john123-SG-SIN-session008` |

## 负载均衡策略

### 地理分布

推荐配置不同地理位置的代理：

1. **美国东部**: 用于东海岸业务
2. **美国西部**: 用于西海岸业务  
3. **欧洲**: 用于欧洲市场
4. **亚太**: 用于亚洲市场

### 轮换策略

```javascript
// 在IPManager中设置轮换
const rotationSettings = {
  enableRotation: true,
  rotationInterval: 30 * 60 * 1000, // 30分钟
  maxUsagePerIP: 1000, // 每个IP最大使用次数
  stickySessionDuration: 5 * 60 * 1000 // 5分钟粘性会话
};
```

## 监控和统计

### 使用Dashboard监控

访问监控面板查看：
- 每个代理的使用统计
- 连接成功率
- 响应时间
- 地理位置分布

### API监控

```bash
# 获取IP池状态
curl http://localhost:3001/api/ip-status

# 获取详细统计
curl http://localhost:3005/api/dashboard
```

## 最佳实践

### 1. 会话管理

```javascript
// 为每个容器分配固定会话
const containerSessions = {
  'bot-1': 'session-001', // 粘性会话
  'bot-2': 'session-002', // 粘性会话
  'bot-3': null           // 非粘性会话
};
```

### 2. 错误处理

```javascript
// 处理代理连接失败
try {
  await browserService.initialize();
} catch (error) {
  console.error('代理连接失败，尝试切换IP...');
  await browserService.rotateIP();
}
```

### 3. 频率控制

```javascript
// 控制请求频率，避免触发防护
const rateLimit = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  maxConcurrentRequests: 5
};
```

## 故障排除

### 常见问题

1. **认证失败**
   - 检查用户名和密码
   - 确认账户状态正常

2. **连接超时**
   - 检查网络连接
   - 验证代理服务器状态

3. **地理位置不符**
   - 确认用户名格式正确
   - 检查会话配置

### 调试命令

```bash
# 测试单个代理
curl -x http://username:password@residential.oxylabs.io:8000 http://httpbin.org/ip

# 检查代理列表
docker-compose exec ip-manager node -e "console.log(require('./data/ip-pool.json'))"
```

## 成本优化

### 1. 智能路由

- 根据业务需求选择合适的代理类型
- 住宅代理用于高价值操作
- 数据中心代理用于批量操作

### 2. 会话复用

- 复用有效会话
- 及时清理过期会话
- 监控使用量避免超额

### 3. 地理优化

- 选择离目标服务器最近的代理
- 避免不必要的地理位置切换

## 安全注意事项

1. **凭据保护**
   - 不要在代码中硬编码密码
   - 使用环境变量存储敏感信息

2. **使用限制**
   - 遵守Oxylabs的服务条款
   - 不要用于非法用途

3. **IP轮换**
   - 避免过于频繁的轮换
   - 合理设置会话时长

---

**提示**: 开始使用前，请确保你已经注册了Oxylabs账户并有足够的余额。住宅代理通常按GB计费，数据中心代理按IP或端口计费。