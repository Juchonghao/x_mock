require('dotenv').config();
const PlaywrightDMService = require('./src/services/playwrightDMService');

/**
 * Playwright 私信服务使用示例
 * 演示如何集成到现有项目中
 */
class PlaywrightDMExample {
  constructor() {
    this.dmService = new PlaywrightDMService();
  }

  /**
   * 基本使用示例：发送单条私信
   */
  async basicUsageExample() {
    console.log('📧 基本使用示例：发送单条私信');
    console.log('=' * 50);
    
    try {
      // 1. 初始化服务
      console.log('1️⃣ 初始化 Playwright 私信服务...');
      await this.dmService.initialize();
      
      // 2. 注入 cookies 或自动登录
      console.log('2️⃣ 注入认证信息...');
      await this.dmService.injectCookies();
      
      // 3. 检查登录状态
      console.log('3️⃣ 检查登录状态...');
      const isLoggedIn = await this.dmService.checkLoginStatus();
      
      if (!isLoggedIn) {
        throw new Error('用户未登录，请检查 cookies 配置');
      }
      
      // 4. 发送私信
      const targetUsername = 'kent236896';
      const message = '你好！这是一条自动化私信，使用 Playwright 发送 🤖';
      
      console.log(`4️⃣ 发送私信给 @${targetUsername}...`);
      const success = await this.dmService.sendDirectMessage(targetUsername, message);
      
      if (success) {
        console.log('✅ 私信发送成功！');
      } else {
        console.log('❌ 私信发送失败');
      }
      
    } catch (error) {
      console.error('❌ 示例执行失败:', error.message);
    } finally {
      // 5. 清理资源
      await this.dmService.close();
    }
  }

  /**
   * 批量发送示例
   */
  async batchSendingExample() {
    console.log('\n📦 批量发送示例');
    console.log('=' * 50);
    
    try {
      // 初始化服务
      await this.dmService.initialize();
      await this.dmService.injectCookies();
      
      // 检查登录状态
      const isLoggedIn = await this.dmService.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('用户未登录');
      }
      
      // 用户列表
      const targetUsers = [
        'kent236896',
        'allen180929',
        'fred_0201',
        'Alex09936200'
      ];
      
      // 生成防风控消息
      const baseMessage = '你好！这是批量私信测试';
      const personalizedMessage = this.dmService.generateMessageWithRandomSuffix(baseMessage);
      
      console.log(`📤 准备发送私信给 ${targetUsers.length} 个用户`);
      console.log(`📝 消息: ${personalizedMessage}`);
      
      // 批量发送（注意：生产环境建议间隔至少5分钟）
      const results = await this.dmService.sendBatchMessages(
        targetUsers, 
        personalizedMessage, 
        300000 // 5分钟间隔
      );
      
      // 统计结果
      const successCount = results.filter(r => r.success).length;
      console.log(`📊 发送完成: ${successCount}/${targetUsers.length} 成功`);
      
      // 保存结果
      this.saveBatchResults(results);
      
    } catch (error) {
      console.error('❌ 批量发送失败:', error.message);
    } finally {
      await this.dmService.close();
    }
  }

  /**
   * 高级使用示例：自定义流程
   */
  async advancedUsageExample() {
    console.log('\n🔧 高级使用示例：自定义流程');
    console.log('=' * 50);
    
    try {
      // 初始化
      await this.dmService.initialize();
      
      // 手动加载 cookies
      const cookiesLoaded = await this.dmService.loadCookies();
      if (!cookiesLoaded) {
        await this.dmService.injectCookies();
      }
      
      // 自定义用户搜索和私信流程
      await this.customDMFlow();
      
    } catch (error) {
      console.error('❌ 高级示例失败:', error.message);
    } finally {
      await this.dmService.close();
    }
  }

  /**
   * 自定义私信流程
   */
  async customDMFlow() {
    const targetUsername = 'kent236896';
    const customMessage = '自定义私信流程测试 ✨';
    
    console.log(`🎯 自定义流程: 私信 @${targetUsername}`);
    
    // 1. 访问用户页面
    await this.dmService.page.goto(`https://x.com/${targetUsername}`, {
      waitUntil: 'domcontentloaded'
    });
    await this.dmService.humanDelay(3000, 5000);
    
    // 2. 截图记录
    await this.dmService.screenshot(`custom-flow-${targetUsername}.png`);
    
    // 3. 自定义搜索和选择用户
    const userFound = await this.dmService.searchAndSelectUser(targetUsername);
    
    if (userFound) {
      // 4. 自定义消息发送
      const messageSent = await this.dmService.typeAndSendMessage(customMessage);
      
      if (messageSent) {
        console.log('✅ 自定义流程完成');
        await this.dmService.screenshot(`custom-flow-sent-${targetUsername}.png`);
      }
    }
  }

  /**
   * 保存批量发送结果
   */
  saveBatchResults(results) {
    const fs = require('fs');
    const resultsPath = `./batch-dm-results-${Date.now()}.json`;
    
    const report = {
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      },
      results: results
    };
    
    fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));
    console.log(`💾 结果已保存到: ${resultsPath}`);
  }

  /**
   * 集成到现有项目的示例
   */
  integrateWithExistingProject() {
    console.log('\n🔗 集成到现有项目示例');
    console.log('=' * 50);
    
    console.log(`
// 在你的主文件中引入
const PlaywrightDMService = require('./src/services/playwrightDMService');

// 在路由或控制器中使用
app.post('/send-dm', async (req, res) => {
  try {
    const { username, message } = req.body;
    
    const dmService = new PlaywrightDMService();
    await dmService.initialize();
    await dmService.injectCookies();
    
    const success = await dmService.sendDirectMessage(username, message);
    
    await dmService.close();
    
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量发送接口
app.post('/batch-send-dm', async (req, res) => {
  try {
    const { users, message, delay } = req.body;
    
    const dmService = new PlaywrightDMService();
    await dmService.initialize();
    await dmService.injectCookies();
    
    const results = await dmService.sendBatchMessages(users, message, delay);
    
    await dmService.close();
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
    `);
  }

  /**
   * 错误处理和恢复示例
   */
  errorHandlingExample() {
    console.log('\n🛡️ 错误处理和恢复示例');
    console.log('=' * 50);
    
    console.log(`
// 完整的错误处理示例
async function robustDMSending(username, message) {
  const dmService = new PlaywrightDMService();
  let retries = 3;
  
  while (retries > 0) {
    try {
      await dmService.initialize();
      await dmService.injectCookies();
      
      const success = await dmService.sendDirectMessage(username, message);
      
      if (success) {
        console.log('✅ 私信发送成功');
        break;
      } else {
        throw new Error('发送失败');
      }
      
    } catch (error) {
      console.error(\`❌ 尝试 \${4-retries} 失败:\`, error.message);
      retries--;
      
      if (retries > 0) {
        console.log(\`⏳ 等待 5 秒后重试...\`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('❌ 所有重试均失败');
        throw error;
      }
    } finally {
      await dmService.close();
    }
  }
}
    `);
  }

  /**
   * 运行所有示例
   */
  async runAllExamples() {
    console.log('🎭 Playwright 私信服务使用示例');
    console.log('=' * 60);
    
    //指导 显示集成
    this.integrateWithExistingProject();
    
    // 显示错误处理示例
    this.errorHandlingExample();
    
    // 运行基本示例（需要有效的 cookies）
    const runBasic = process.env.RUN_BASIC_EXAMPLE === 'true';
    if (runBasic) {
      await this.basicUsageExample();
    } else {
      console.log('\nℹ️ 跳过基本示例 (设置 RUN_BASIC_EXAMPLE=true 来启用)');
    }
    
    // 运行批量示例（谨慎使用）
    const runBatch = process.env.RUN_BATCH_EXAMPLE === 'true';
    if (runBatch) {
      console.log('\n⚠️ 注意: 即将运行批量发送示例');
      await this.batchSendingExample();
    } else {
      console.log('\nℹ️ 跳过批量示例 (设置 RUN_BATCH_EXAMPLE=true 来启用)');
    }
    
    // 运行高级示例
    const runAdvanced = process.env.RUN_ADVANCED_EXAMPLE === 'true';
    if (runAdvanced) {
      await this.advancedUsageExample();
    } else {
      console.log('\nℹ️ 跳过高级示例 (设置 RUN_ADVANCED_EXAMPLE=true 来启用)');
    }
    
    console.log('\n✅ 所有示例展示完成');
  }
}

// 环境检查
function checkEnvForExamples() {
  const required = ['TWITTER_COOKIES'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.log('⚠️ 缺少环境变量:', missing.join(', '));
    console.log('📝 请在 .env 文件中配置这些变量以运行实际示例');
    return false;
  }
  
  return true;
}

// 主函数
async function main() {
  console.log('🎯 Playwright 私信服务 - 完整使用指南');
  console.log('=' * 60);
  
  // 检查环境
  const envReady = checkEnvForExamples();
  
  // 显示功能特性
  console.log('✨ 主要功能特性:');
  console.log('   🤖 基于 Playwright，更稳定');
  console.log('   🛡️ 内置风控规避机制');
  console.log('   📦 支持批量发送');
  console.log('   🍪 自动 cookies 管理');
  console.log('   📸 截图记录功能');
  console.log('   🔄 异常恢复机制');
  console.log('   ⏱️ 真人行为模拟');
  
  // 创建示例实例
  const example = new PlaywrightDMExample();
  
  if (envReady) {
    await example.runAllExamples();
  } else {
    console.log('\n📖 仍然展示代码示例和使用指导...');
    example.integrateWithExistingProject();
    example.errorHandlingExample();
  }
}

// 如果直接运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PlaywrightDMExample;