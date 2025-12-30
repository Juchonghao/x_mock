# Playwright 私信服务 - 快速使用指南

## 📋 功能特性

✅ **基于 Playwright** - 更稳定，比 Puppeteer 更好用
✅ **智能风控规避** - 模拟真人操作，随机延时
✅ **批量发送支持** - 支持多用户批量私信
✅ **异常恢复机制** - 完善的错误处理和重试
✅ **截图记录** - 自动保存操作截图
✅ **Cookies 管理** - 自动保存和加载登录状态

## 🚀 快速开始

### 1. 环境配置

在 `.env` 文件中添加：

```bash
# Twitter 认证信息 (二选一)
TWITTER_COOKIES=你的cookies字符串
# 或
TWITTER_USERNAME=你的用户名
TWITTER_PASSWORD=你的密码

# 测试配置
TEST_USERNAME=kent236896
RUN_SEND_TESTS=false  # 是否发送实际私信
RUN_BATCH_TESTS=false # 是否运行批量测试
```

### 2. 基本使用

```javascript
const PlaywrightDMService = require('./src/services/playwrightDMService');

async function sendDM() {
  const dmService = new PlaywrightDMService();
  
  try {
    // 初始化
    await dmService.initialize();
    await dmService.injectCookies();
    
    // 发送私信
    const success = await dmService.sendDirectMessage('kent236896', '你好！这是一条测试私信 🤖');
    
    if (success) {
      console.log('✅ 私信发送成功');
    }
    
  } catch (error) {
    console.error('❌ 发送失败:', error.message);
  } finally {
    await dmService.close();
  }
}
```

### 3. 批量发送

```javascript
// 批量发送私信
const users = ['kent236896', 'allen180929', 'fred_0201'];
const message = '你好！这是批量私信测试';

const results = await dmService.sendBatchMessages(users, message, 300000); // 5分钟间隔
console.log(`成功: ${results.filter(r => r.success).length}/${users.length}`);
```

## 🧪 测试运行

### 运行测试脚本
```bash
# 只运行功能测试（不发送实际私信）
node test-playwright-dm.js

# 运行实际发送测试（谨慎使用）
RUN_SEND_TESTS=true node test-playwright-dm.js

# 运行批量测试（需要更长时间）
RUN_SEND_TESTS=true RUN_BATCH_TESTS=true node test-playwright-dm.js
```

### 查看使用示例
```bash
node example-playwright-dm.js
```

## ⚙️ 核心功能

### 🎯 私信发送
- 自动用户搜索
- 智能输入框定位
- 防风控消息生成
- 发送状态确认

### 🛡️ 风控规避
- 随机延时 (1-5秒)
- 逐字输入模拟
- 最大化窗口
- 禁用自动化标识

### 📊 监控记录
- 自动截图保存
- 发送结果统计
- 错误日志记录
- 性能状态监控

## 📝 最佳实践

### 1. 发送频率控制
```javascript
// 每日限制
if (!dmService.checkDailyLimit(currentCount, 10)) {
  console.log('达到每日发送限制');
  return;
}

// 用户间隔
await dmService.sendBatchMessages(users, message, 300000); // 5分钟
```

### 2. 消息个性化
```javascript
// 自动添加随机后缀防风控
const personalizedMessage = dmService.generateMessageWithRandomSuffix(baseMessage);
```

### 3. 错误处理
```javascript
try {
  const success = await dmService.sendDirectMessage(username, message);
  if (!success) {
    // 重试逻辑
    await retrySend(username, message);
  }
} catch (error) {
  console.error('发送失败:', error.message);
  // 记录错误日志
}
```

## 🔧 集成到现有项目

### Express.js 集成示例
```javascript
app.post('/api/send-dm', async (req, res) => {
  const { username, message } = req.body;
  
  const dmService = new PlaywrightDMService();
  try {
    await dmService.initialize();
    await dmService.injectCookies();
    
    const success = await dmService.sendDirectMessage(username, message);
    
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await dmService.close();
  }
});
```

## ⚠️ 重要提醒

1. **风控安全**
   - 单账号每日最多10条私信
   - 每条间隔至少5分钟
   - 使用随机化消息内容

2. **测试建议**
   - 先用 `RUN_SEND_TESTS=false` 测试功能
   - 确认无误后再发送实际私信
   - 建议先用小号测试

3. **性能优化**
   - 启用 cookies 持久化避免重复登录
   - 使用代理池分散请求
   - 适当增加延时降低风控

## 📁 文件结构

```
src/services/
├── playwrightDMService.js    # 核心私信服务
├── browserService.js         # 现有 Puppeteer 服务
├── dmService.js             # 现有私信服务
└── ...

测试文件:
├── test-playwright-dm.js    # 完整测试套件
├── example-playwright-dm.js # 使用示例
└── ...
```

## 🎯 核心优势

相比原有 Puppeteer 方案，Playwright 版本具有：

- **更稳定的选择器** - 更好的元素定位
- **更好的并发支持** - 多浏览器上下文
- **更强的调试能力** - 详细的错误信息
- **更好的性能** - 更快的页面加载
- **更智能的等待** - 自动等待元素就绪

立即开始使用，体验更稳定的私信自动化！