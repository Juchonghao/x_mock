# X (Twitter) Auto-Reply Bot - Testing Guide

本指南将帮助您测试和验证X(Twitter)自动回复机器人的各项功能。

## 测试前准备

### 1. 确保环境配置正确

- ✅ 已安装所有依赖：`npm install`
- ✅ 已配置`.env`文件，特别是Twitter Cookies
- ✅ 已了解如何获取Twitter Cookies（参考README.md）

### 2. 环境变量验证

检查您的`.env`文件是否包含以下关键配置：

```env
# 必须配置的项
TWITTER_COOKIES="[...your_cookies_here...]"
KEYWORDS=["hello", "hi", "thanks"]
REPLY_MESSAGE="@{username} Thank you for your message!"

# 可选配置项
HEADLESS=false  # 建议测试时设置为false，方便观察浏览器操作
BROWSER_TYPE="chromium"
CHECK_INTERVAL=60000  # 测试时可设置为1分钟
MAX_REPLIES_PER_RUN=2  # 测试时限制为2条，避免过多操作
```

## 测试方法

### 方法一：使用测试脚本（推荐）

我们提供了一个专门的测试脚本，用于快速验证机器人的核心功能：

```bash
node test.js
```

测试脚本将执行以下验证：

1. **配置验证**：检查环境变量是否正确设置
2. **浏览器初始化**：验证Puppeteer是否能正常启动
3. **Cookie注入**：测试Twitter登录状态是否正常
4. **页面导航**：确认能成功访问Twitter主页
5. **提及检测**：测试是否能正确获取通知中的提及
6. **关键词过滤**：验证关键词匹配功能是否正常

测试完成后，您将在`sessions`文件夹中看到Twitter页面的截图，用于验证登录状态。

### 方法二：手动功能测试

#### 1. 测试Cookie配置

```bash
# 修改index.js，添加以下代码进行快速测试
const TwitterService = require('./src/services/twitterService');

async function testCookie() {
  const twitterService = new TwitterService();
  await twitterService.initialize();
  await twitterService.browserService.injectCookies('https://x.com');
  await twitterService.browserService.screenshot('cookie_test.png');
  console.log('Cookie test completed. Check sessions/cookie_test.png for verification.');
  await twitterService.close();
}

testCookie();
```

运行后检查截图，确认是否成功登录Twitter。

#### 2. 测试提及检测

```bash
node -e "
const TwitterService = require('./src/services/twitterService');
async function testMentions() {
  const twitterService = new TwitterService();
  await twitterService.initialize();
  await twitterService.browserService.injectCookies('https://x.com');
  const mentions = await twitterService.getMentions();
  console.log('Found mentions:', mentions.length);
  mentions.forEach(m => console.log(`- @${m.username}: ${m.tweetText.substring(0, 50)}...`));
  await twitterService.close();
}
testMentions();
"
```

#### 3. 测试自动回复功能

**注意**：此测试会发送真实回复，请谨慎使用！

```bash
node -e "
const TwitterService = require('./src/services/twitterService');
async function testReply() {
  const twitterService = new TwitterService();
  await twitterService.initialize();
  const tweetUrl = 'https://x.com/yourusername/status/1234567890'; // 替换为您自己的测试推文
  const replyMessage = 'This is a test reply from the bot!';
  await twitterService.replyToTweet(tweetUrl, replyMessage);
  console.log('Reply test completed.');
  await twitterService.close();
}
testReply();
"
```

### 方法三：完整运行测试

启动完整的机器人服务，观察其运行：

```bash
npm start
```

## 测试场景

### 场景1：新提及测试

1. 让朋友在Twitter上@您并使用配置的关键词（如"hello"）
2. 观察机器人是否能检测到该提及
3. 检查机器人是否自动回复

### 场景2：关键词匹配测试

测试不同的关键词组合，确保：
- 包含关键词的提及能被正确匹配
- 不包含关键词的提及被过滤掉
- 大小写不敏感（"Hello"和"hello"都能被匹配）

### 场景3：回复限制测试

1. 同时创建多个包含关键词的提及
2. 验证机器人每次运行时的回复数量不超过`MAX_REPLIES_PER_RUN`
3. 确保已回复的提及不会被重复回复

## 调试与日志

### 1. 启用详细日志

修改`src/utils/index.js`中的log函数，添加更多调试信息：

```javascript
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logMessage);
  // 可选：保存日志到文件
  fs.appendFileSync('./bot.log', logMessage + '\n', 'utf8');
  return logMessage;
}
```

### 2. 浏览器操作观察

将`.env`中的`HEADLESS`设置为`false`，可以看到浏览器的实际操作过程，方便调试：

```env
HEADLESS=false
```

### 3. 截图调试

在关键操作点添加截图功能，便于验证：

```javascript
await twitterService.browserService.screenshot('notification_page.png');
```

## 常见问题与解决方案

### 1. Cookie相关问题

**问题**："Failed to inject cookies" 或登录后重定向到登录页

**解决方案**：
- 确保Cookies是最新的（Cookies会定期过期）
- 确保Cookies包含所有必要的认证信息（auth_token, ct0等）
- 检查Cookies的domain和path是否正确

### 2. 提及检测失败

**问题**："Failed to get mentions" 或找不到提及

**解决方案**：
- 确保Twitter界面语言设置为English
- 确认您有未读的提及通知
- 检查网络连接和代理设置

### 3. 回复功能失败

**问题**："Failed to reply to tweet"

**解决方案**：
- 确保推文URL格式正确：`https://x.com/username/status/tweet_id`
- 检查Twitter的API限制，避免过于频繁的操作
- 确认您的账号有回复权限（未被限制）

### 4. 浏览器启动失败

**问题**："Failed to initialize browser"

**解决方案**：
- 确保安装了所有系统依赖（特别是Chromium）
- 检查内存和CPU使用情况
- 尝试更换浏览器类型（firefox/webkit）

## 测试验证清单

| 功能模块 | 测试项 | 预期结果 | 状态 |
|---------|-------|---------|------|
| 浏览器自动化 | 浏览器启动 | 无头浏览器成功启动 | ✅ |
| Cookie管理 | 登录状态维持 | 能成功访问Twitter主页 | ✅ |
| 提及检测 | 获取通知 | 能正确提取所有未回复提及 | ✅ |
| 关键词过滤 | 匹配规则 | 仅包含关键词的提及被处理 | ✅ |
| 自动回复 | 发送回复 | 成功回复符合条件的提及 | ✅ |
| 反检测机制 | 行为模拟 | 操作间隔合理，避免被识别 | ✅ |
| 配置系统 | 参数生效 | 所有环境变量配置正确应用 | ✅ |

## 性能测试

在大规模使用前，建议进行性能测试：

1. **负载测试**：同时创建10-20个提及，观察机器人处理速度
2. **长时间运行**：让机器人运行24小时，确保稳定性
3. **资源占用**：监控内存和CPU使用情况，确保不会过度占用资源

## 安全测试

1. **隐私保护**：确认机器人不会泄露您的Cookies或其他敏感信息
2. **账号安全**：验证机器人的操作符合Twitter的使用条款
3. **数据安全**：检查日志和存储的信息是否包含敏感内容

## 完成测试

测试完成后，建议将配置恢复到生产环境设置：

```env
HEADLESS=true  # 生产环境使用无头模式
CHECK_INTERVAL=300000  # 恢复为5分钟
MAX_REPLIES_PER_RUN=10  # 根据需求调整
```

## 后续维护

定期进行以下检查：

- ✅ 每1-2周更新一次Twitter Cookies
- ✅ 监控机器人的运行日志
- ✅ 检查Twitter账号的操作限制
- ✅ 根据需要调整关键词和回复内容

如果遇到任何问题，请参考README.md或联系开发者获取帮助。