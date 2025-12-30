# GitHub 部署指南

## 快速使用流程

### 第一步：本地推送到 GitHub

1. 在 GitHub 上创建新仓库（如：`x-auto-reply`）

2. 在本地项目中执行：

```bash
# 初始化 git 仓库（如果还未初始化）
git init

# 添加 GitHub 仓库作为远程源
git remote add origin https://github.com/YOUR_USERNAME/x-auto-reply.git

# 添加所有文件
git add .

# 提交代码
git commit -m "初始提交"

# 推送到 GitHub
git push -u origin main
```

### 第二步：配置部署脚本

编辑 `pull-from-github.sh` 文件，设置你的 GitHub 仓库 URL：

```bash
# 找到这行：
GITHUB_REPO_URL=""

# 改为：
GITHUB_REPO_URL="https://github.com/YOUR_USERNAME/x-auto-reply.git"
```

### 第三步：运行部署脚本

```bash
./pull-from-github.sh
```

## 工作流程

### 本地开发 → GitHub → 服务器

1. **本地开发**：在本地修改代码
2. **推送到 GitHub**：
   ```bash
   git add .
   git commit -m "更新内容"
   git push origin main
   ```
3. **服务器拉取**：运行 `./pull-from-github.sh`

## 脚本功能

`pull-from-github.sh` 脚本会自动执行：

- ✅ 停止现有服务
- ✅ 从 GitHub 拉取最新代码
- ✅ 安装/更新依赖
- ✅ 启动服务（PM2）
- ✅ 健康检查

## 常用命令

在服务器上查看和管理服务：

```bash
# 查看服务状态
pm2 list

# 查看服务日志
pm2 logs x-auto-reply

# 重启服务
pm2 restart x-auto-reply

# 停止服务
pm2 stop x-auto-reply
```

## 注意事项

1. 确保 GitHub 仓库是公开的，或者配置了正确的访问权限
2. 首次运行前必须设置 `GITHUB_REPO_URL`
3. 脚本会自动处理端口冲突和服务重启
4. 所有日志都会显示在终端中，便于调试

## 故障排除

如果部署失败：

1. 检查 GitHub 仓库 URL 是否正确
2. 检查服务器网络连接
3. 查看脚本输出的错误信息
4. 检查服务器上的 PM2 日志：`pm2 logs x-auto-reply`