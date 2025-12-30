# X (Twitter) Auto-Reply Bot

一个基于 Puppeteer 的 X (Twitter) 自动回复机器人，能够自动检测提及并回复包含特定关键词的帖子。

## 功能特性

- 🤖 **自动回复**：自动检测并回复包含特定关键词的提及
- 🔄 **定期运行**：可配置的检查间隔时间
- 🔒 **安全登录**：通过 Cookie 注入方式登录，避免提供账号密码
- 🕵️ **反检测机制**：模拟人类行为，避免被平台识别为机器人
- 📱 **无头浏览器**：基于 Puppeteer 的云端/本地无头浏览器自动化
- 🔧 **灵活配置**：通过环境变量配置所有功能参数

## 技术栈

- Node.js
- Puppeteer (无头浏览器自动化)
- Express (可选，用于未来的 Web 界面)
- Dotenv (环境变量管理)

## 安装步骤

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd x-auto-reply-bot
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   复制 `.env.example` 文件并命名为 `.env`，然后填写相应的配置信息：
   ```bash
   cp .env.example .env
   ```

   主要配置项说明：
   - `TWITTER_COOKIES`：X (Twitter) 的 Session Cookies（JSON 格式）
   - `HEADLESS`：是否以无头模式运行浏览器（true/false）
   - `BROWSER_TYPE`：浏览器类型（chromium/firefox/webkit）
   - `PROXY_URL`：代理服务器 URL（可选）
   - `KEYWORDS`：要匹配的关键词数组（JSON 格式）
   - `REPLY_MESSAGE`：自动回复消息
   - `CHECK_INTERVAL`：检查间隔时间（毫秒）
   - `MAX_REPLIES_PER_RUN`：每次运行的最大回复数量

## 如何获取 Twitter Cookies

1. 打开 Chrome 浏览器，访问 [X (Twitter)](https://x.com)
2. 登录您的账号
3. 打开开发者工具（F12 或 Ctrl+Shift+I）
4. 切换到 "Application" 或 "Storage" 标签
5. 在左侧导航中找到 "Cookies" -> "https://x.com"
6. 右键点击并选择 "Export all as JSON"
7. 将导出的 JSON 字符串复制到 `.env` 文件的 `TWITTER_COOKIES` 字段中

## 使用方法

### 启动机器人

```bash
npm start
```

### 开发模式（带热重载）

```bash
npm run dev
```

## 项目结构

```
.
├── src/
│   ├── config/          # 配置管理
│   ├── services/        # 核心服务
│   │   ├── browserService.js  # 浏览器自动化服务
│   │   └── twitterService.js  # Twitter 操作服务
│   └── utils/           # 工具函数
├── index.js             # 主入口文件
├── package.json         # 项目配置
├── .env                 # 环境变量
└── README.md            # 项目说明
```

## 工作流程

1. **初始化**：启动无头浏览器并注入 Cookies
2. **检查提及**：定期访问通知页面，提取新的提及
3. **关键词过滤**：过滤出包含指定关键词的提及
4. **自动回复**：对符合条件的提及进行回复
5. **标记已处理**：记录已回复的帖子，避免重复回复

## 注意事项

1. **遵守平台规则**：请确保您的使用符合 X (Twitter) 的使用条款
2. **避免过度使用**：设置合理的检查间隔和回复数量，避免账号被限制
3. **Cookie 有效期**：Cookies 会定期过期，需要重新获取和更新
4. **代理设置**：如果需要，可以配置代理服务器以避免 IP 限制
5. **监控运行**：定期检查机器人的运行状态和日志

## 安全建议

- 不要与他人分享您的 Cookies
- 定期更新 Cookies 和密码
- 使用专用的机器人账号
- 避免回复敏感内容

## 扩展功能

该项目可以进一步扩展：

- Web 界面用于实时监控和配置
- 消息模板系统
- 数据分析和统计
- 多账号支持
- 更复杂的回复逻辑

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
