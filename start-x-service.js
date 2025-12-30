const express = require('express');
const cors = require('cors');
const { PlaywrightFollowService } = require('./src/services/playwrightFollowService');
const { PlaywrightDMService } = require('./src/services/playwrightDMService');
const { PlaywrightInteractionService } = require('./src/services/playwrightInteractionService');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 服务实例
let followService = null;
let dmService = null;
let interactionService = null;

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      follow: !!followService,
      dm: !!dmService,
      interaction: !!interactionService
    }
  });
});

// 状态端点
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// 初始化服务
async function initializeServices() {
  try {
    console.log('🚀 初始化服务...');
    
    followService = new PlaywrightFollowService({ headless: true });
    dmService = new PlaywrightDMService({ headless: true });
    interactionService = new PlaywrightInteractionService({ headless: true });
    
    console.log('✅ 服务初始化完成');
    return true;
  } catch (error) {
    console.error('❌ 服务初始化失败:', error.message);
    return false;
  }
}

// 测试关注功能端点
app.post('/api/test-follow', async (req, res) => {
  try {
    if (!followService) {
      return res.status(503).json({ error: '服务未初始化' });
    }
    
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: '缺少用户名参数' });
    }
    
    console.log(`🧪 测试关注用户: ${username}`);
    
    // 初始化服务
    const initSuccess = await followService.initialize();
    if (!initSuccess) {
      return res.status(503).json({ error: '关注服务初始化失败' });
    }
    
    // 检查登录状态
    const isLoggedIn = await followService.checkLoginStatus();
    if (!isLoggedIn) {
      return res.status(401).json({ error: '用户未登录，需要先登录 Twitter/X' });
    }
    
    // 测试关注
    const result = await followService.followUser({ username, element: null });
    
    res.json({
      success: result,
      message: result ? `成功关注用户 ${username}` : `关注用户 ${username} 失败`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('关注测试失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 测试私信功能端点
app.post('/api/test-dm', async (req, res) => {
  try {
    if (!dmService) {
      return res.status(503).json({ error: '服务未初始化' });
    }
    
    const { username, message } = req.body;
    if (!username || !message) {
      return res.status(400).json({ error: '缺少用户名或消息参数' });
    }
    
    console.log(`🧪 测试私信用户: ${username}`);
    
    // 初始化服务
    const initSuccess = await dmService.initialize();
    if (!initSuccess) {
      return res.status(503).json({ error: '私信服务初始化失败' });
    }
    
    // 检查登录状态
    const isLoggedIn = await dmService.checkLoginStatus();
    if (!isLoggedIn) {
      return res.status(401).json({ error: '用户未登录，需要先登录 Twitter/X' });
    }
    
    // 测试私信
    const result = await dmService.sendMessage(username, message);
    
    res.json({
      success: result,
      message: result ? `成功发送私信给 ${username}` : `发送私信给 ${username} 失败`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('私信测试失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 测试互动功能端点
app.post('/api/test-interaction', async (req, res) => {
  try {
    if (!interactionService) {
      return res.status(503).json({ error: '服务未初始化' });
    }
    
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: '缺少搜索查询参数' });
    }
    
    console.log(`🧪 测试互动搜索: ${query}`);
    
    // 初始化服务
    const initSuccess = await interactionService.initialize();
    if (!initSuccess) {
      return res.status(503).json({ error: '互动服务初始化失败' });
    }
    
    // 检查登录状态
    const isLoggedIn = await interactionService.checkLoginStatus();
    if (!isLoggedIn) {
      return res.status(401).json({ error: '用户未登录，需要先登录 Twitter/X' });
    }
    
    // 测试搜索和互动
    const result = await interactionService.searchAndInteract(query);
    
    res.json({
      success: !!result,
      message: result ? '搜索和互动测试成功' : '搜索和互动测试失败',
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('互动测试失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取服务状态端点
app.get('/api/services', (req, res) => {
  res.json({
    follow: {
      available: !!followService,
      initialized: followService?.initialized || false
    },
    dm: {
      available: !!dmService,
      initialized: dmService?.initialized || false
    },
    interaction: {
      available: !!interactionService,
      initialized: interactionService?.initialized || false
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '端点不存在' });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化服务
    const initSuccess = await initializeServices();
    if (!initSuccess) {
      console.error('服务初始化失败，服务器仍会启动但功能受限');
    }
    
    // 启动 HTTP 服务器
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 X-Auto 服务已启动`);
      console.log(`📡 端口: ${PORT}`);
      console.log(`🌐 访问: http://localhost:${PORT}/health`);
      console.log(`📊 状态: http://localhost:${PORT}/status`);
      console.log(`🧪 测试关注: POST http://localhost:${PORT}/api/test-follow`);
      console.log(`💬 测试私信: POST http://localhost:${PORT}/api/test-dm`);
      console.log(`🔄 测试互动: POST http://localhost:${PORT}/api/test-interaction`);
    });
    
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 收到关闭信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号，正在优雅关闭服务器...');
  process.exit(0);
});

// 启动服务器
startServer();