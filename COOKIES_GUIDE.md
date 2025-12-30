# 如何获取Twitter Cookies

1. 打开Chrome浏览器，访问 [X (Twitter)](https://x.com)
2. 登录您的账号
3. 打开开发者工具（F12 或 Ctrl+Shift+I）
4. 切换到 "Application" 或 "Storage" 标签
5. 在左侧导航中找到 "Cookies" -> "https://x.com"
6. 右键点击并选择 "Export all as JSON"
7. 将导出的JSON字符串复制到 `.env` 文件的 `TWITTER_COOKIES` 字段中

# 示例Cookies格式

TWITTER_COOKIES="[
  {
    "name": "auth_token",
    "value": "your_auth_token_here",
    "domain": ".x.com",
    "path": "/",
    "expires": 1672531199,
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
  },
  {
    "name": "ct0",
    "value": "your_ct0_token_here",
    "domain": ".x.com",
    "path": "/",
    "expires": 1672531199,
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
  },
  {
    "name": "twid",
    "value": "u=your_twid_here",
    "domain": ".x.com",
    "path": "/",
    "expires": 1672531199,
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
  }
]"