# 完整的X (Twitter) Cookies获取指南

## 📋 准备工作

1. **打开Chrome浏览器**：使用最新版本的Chrome浏览器
2. **访问X (Twitter)**：https://x.com
3. **登录您的账号**：确保您已成功登录

## 🔧 获取步骤

### 步骤1：打开开发者工具

- **Windows/Linux**：按 `F12` 或 `Ctrl + Shift + I`
- **Mac**：按 `Cmd + Option + I`

或者，您也可以通过浏览器菜单打开：
1. 点击Chrome右上角的三个点 → "更多工具" → "开发者工具"

### 步骤2：切换到Application/Storage标签

1. 在开发者工具顶部的标签栏中，找到并点击 **"Application"**（较新版本Chrome可能显示为"Storage"）

### 步骤3：查看Cookies

1. 在左侧导航栏中，展开 **"Cookies"** 部分
2. 点击 **"https://x.com"** 选项，显示所有Twitter相关的Cookies

### 步骤4：导出Cookies

1. 右键点击Cookie列表区域
2. 选择 **"Export all as JSON"** 选项
3. 保存导出的JSON文件到您的电脑

### 步骤5：配置到.env文件

1. 打开您保存的JSON文件
2. 复制文件中的所有内容
3. 打开项目根目录下的 `.env` 文件
4. 找到 `TWITTER_COOKIES` 行
5. 将复制的JSON内容粘贴到等号右侧的引号内

**示例配置：**
```env
TWITTER_COOKIES="[{\"name\":\"auth_token\",\"value\":\"your_auth_token_here\",\"domain\":\".x.com\",\"path\":\"/\"}, ...]"
```

## 🔍 关键Cookies说明

确保您的Cookies包含以下关键项目：

1. **auth_token**：主要的认证令牌
2. **ct0**：CSRF令牌
3. **twid**：Twitter用户ID标识

## ⚠️ 注意事项

1. **Cookies有效期**：Twitter Cookies通常会在1-3个月后过期，过期后需要重新获取
2. **隐私保护**：不要与任何人分享您的Cookies，它们包含您的登录凭证
3. **格式正确**：确保JSON格式正确，所有引号都已转义（使用 `\"` 而不是 `"`）

## 🚀 配置完成后

1. 保存 `.env` 文件
2. 重新运行测试脚本：
   ```bash
   node test.js
   ```

## 📁 参考文件

- 示例配置：`.env.example_config`
- 详细文档：`README.md`

如果您在获取Cookies过程中遇到任何问题，请随时提问！