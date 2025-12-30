const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'X-Auto 服务运行正常',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// 状态端点
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    port: PORT,
    node_version: process.version
  });
});

// 简单的测试端点
app.get('/test', (req, res) => {
  res.json({
    message: '服务测试成功',
    timestamp: new Date().toISOString()
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    error: '端点不存在',
    available_endpoints: ['/health', '/status', '/test']
  });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 X-Auto 服务已启动`);
  console.log(`📡 端口: ${PORT}`);
  console.log(`🌐 健康检查: http://localhost:${PORT}/health`);
  console.log(`📊 服务状态: http://localhost:${PORT}/status`);
  console.log(`🧪 测试端点: http://localhost:${PORT}/test`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 收到关闭信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号，正在优雅关闭服务器...');
  process.exit(0);
});