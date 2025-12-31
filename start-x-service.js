const express = require('express');
const cors = require('cors');
const TwitterAuthService = require('./services/twitter-auth');
const TwitterAutomationService = require('./services/twitter-automation');

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化服务
const authService = new TwitterAuthService();
const automationService = new TwitterAutomationService();

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

// Auth Token 认证端点
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('开始 Auth Token 认证...');
    const authSuccess = await authService.loginWithAuthToken();
    
    res.json({
      success: authSuccess,
      message: authSuccess ? 'Auth Token 认证成功' : 'Auth Token 认证失败',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('认证过程出错:', error);
    res.status(500).json({
      success: false,
      message: '认证过程出错',
      error: error.message
    });
  }
});

// 验证认证状态端点
app.get('/api/auth/status', async (req, res) => {
  try {
    const isAuthenticated = authService.isAuthenticated();
    const verified = await authService.verifyAuthStatus();
    
    res.json({
      authenticated: isAuthenticated,
      verified: verified,
      status: verified ? 'authenticated' : 'unauthenticated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '验证认证状态失败',
      error: error.message
    });
  }
});

// 关注用户端点
app.post('/api/twitter/follow', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: '用户名不能为空'
      });
    }

    console.log(`API 请求关注用户: @${username}`);
    const result = await automationService.followUser(username);
    
    res.json(result);
  } catch (error) {
    console.error('关注用户 API 出错:', error);
    res.status(500).json({
      success: false,
      message: '关注用户失败',
      error: error.message
    });
  }
});

// 点赞推文端点
app.post('/api/twitter/like', async (req, res) => {
  try {
    const { tweetUrl } = req.body;
    
    if (!tweetUrl) {
      return res.status(400).json({
        success: false,
        message: '推文 URL 不能为空'
      });
    }

    console.log(`API 请求点赞推文: ${tweetUrl}`);
    const result = await automationService.likeTweet(tweetUrl);
    
    res.json(result);
  } catch (error) {
    console.error('点赞推文 API 出错:', error);
    res.status(500).json({
      success: false,
      message: '点赞推文失败',
      error: error.message
    });
  }
});

// 评论推文端点
app.post('/api/twitter/comment', async (req, res) => {
  try {
    const { tweetUrl, comment } = req.body;
    
    if (!tweetUrl || !comment) {
      return res.status(400).json({
        success: false,
        message: '推文 URL 和评论内容不能为空'
      });
    }

    console.log(`API 请求评论推文: ${tweetUrl}`);
    const result = await automationService.commentOnTweet(tweetUrl, comment);
    
    res.json(result);
  } catch (error) {
    console.error('评论推文 API 出错:', error);
    res.status(500).json({
      success: false,
      message: '评论推文失败',
      error: error.message
    });
  }
});

// 批量关注端点
app.post('/api/twitter/batch-follow', async (req, res) => {
  try {
    const { usernames, delayMs } = req.body;
    
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({
        success: false,
        message: '用户名列表不能为空'
      });
    }

    console.log(`API 请求批量关注 ${usernames.length} 个用户`);
    const results = await automationService.batchFollow(usernames, delayMs || 5000);
    
    res.json({
      success: true,
      message: `批量关注完成，处理了 ${usernames.length} 个用户`,
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('批量关注 API 出错:', error);
    res.status(500).json({
      success: false,
      message: '批量关注失败',
      error: error.message
    });
  }
});

// 获取操作历史端点
app.get('/api/twitter/history', (req, res) => {
  try {
    const history = automationService.getOperationHistory();
    
    res.json({
      success: true,
      history: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取操作历史失败',
      error: error.message
    });
  }
});

// 清除操作历史端点
app.delete('/api/twitter/history', (req, res) => {
  try {
    automationService.clearHistory();
    
    res.json({
      success: true,
      message: '操作历史已清除',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '清除操作历史失败',
      error: error.message
    });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    error: '端点不存在',
    available_endpoints: [
      '/health',
      '/status', 
      '/test',
      '/api/auth/login',
      '/api/auth/status',
      '/api/twitter/follow',
      '/api/twitter/like',
      '/api/twitter/comment',
      '/api/twitter/batch-follow',
      '/api/twitter/history'
    ]
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
  console.log(`🔐 Auth Token 认证: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`✅ 关注用户: POST http://localhost:${PORT}/api/twitter/follow`);
  console.log(`❤️  点赞推文: POST http://localhost:${PORT}/api/twitter/like`);
  console.log(`💬 评论推文: POST http://localhost:${PORT}/api/twitter/comment`);
  console.log(`👥 批量关注: POST http://localhost:${PORT}/api/twitter/batch-follow`);
  console.log(`📋 操作历史: GET http://localhost:${PORT}/api/twitter/history`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 收到关闭信号，正在优雅关闭服务器...');
  
  // 关闭浏览器和自动化服务
  try {
    await automationService.close();
    console.log('✅ 自动化服务已关闭');
  } catch (error) {
    console.error('❌ 关闭自动化服务时出错:', error);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 收到终止信号，正在优雅关闭服务器...');
  
  // 关闭浏览器和自动化服务
  try {
    await automationService.close();
    console.log('✅ 自动化服务已关闭');
  } catch (error) {
    console.error('❌ 关闭自动化服务时出错:', error);
  }
  
  process.exit(0);
});