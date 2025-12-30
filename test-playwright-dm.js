require('dotenv').config();
const PlaywrightDMService = require('./src/services/playwrightDMService');

/**
 * Playwright 私信服务测试脚本
 * 包含单次发送和批量发送测试
 */
class PlaywrightDMTest {
  constructor() {
    this.dmService = new PlaywrightDMService();
    this.testResults = [];
  }

  async initialize() {
    try {
      console.log('🚀 初始化测试环境...');
      
      // 初始化 Playwright 服务
      await this.dmService.initialize();
      
      // 尝试加载保存的 cookies
      const cookiesLoaded = await this.dmService.loadCookies();
      
      if (!cookiesLoaded) {
        console.log('ℹ️ 未找到保存的 cookies，尝试注入配置中的 cookies...');
        await this.dmService.injectCookies();
      }
      
      // 检查登录状态
      const isLoggedIn = await this.dmService.checkLoginStatus();
      
      if (!isLoggedIn) {
        console.log('❌ 用户未登录，尝试自动登录...');
        
        // 如果有用户名和密码，尝试自动登录
        if (process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD) {
          try {
            await this.dmService.autoLogin(
              process.env.TWITTER_USERNAME,
              process.env.TWITTER_PASSWORD
            );
          } catch (loginError) {
            console.error('❌ 自动登录失败:', loginError.message);
            throw new Error('登录失败，请检查用户名和密码');
          }
        } else {
          throw new Error('用户未登录，请提供有效的 cookies 或用户名密码');
        }
      }
      
      console.log('✅ 测试环境初始化完成');
      return true;
      
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      throw error;
    }
  }

  async testSingleMessage() {
    console.log('\n🧪 测试 1: 单次私信发送');
    console.log('=' * 50);
    
    try {
      const targetUsername = process.env.TEST_USERNAME || 'kent236896';
      const testMessage = '你好！这是一条测试私信，使用 Playwright 自动化发送 🤖';
      
      console.log(`📤 发送私信给: @${targetUsername}`);
      console.log(`📝 消息内容: ${testMessage}`);
      
      const success = await this.dmService.sendDirectMessage(targetUsername, testMessage);
      
      this.testResults.push({
        test: 'single_message',
        targetUsername,
        success,
        timestamp: new Date().toISOString()
      });
      
      if (success) {
        console.log('✅ 单次私信测试成功');
      } else {
        console.log('❌ 单次私信测试失败');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ 单次私信测试出错:', error.message);
      this.testResults.push({
        test: 'single_message',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async testBatchMessages() {
    console.log('\n🧪 测试 2: 批量私信发送');
    console.log('=' * 50);
    
    try {
      // 测试用户列表
      const targetUsers = [
        process.env.TEST_USERNAME || 'kent236896',
        'allen180929',
        'fred_0201'
      ].filter((user, index, arr) => arr.indexOf(user) === index); // 去重
      
      const baseMessage = '你好！这是批量测试私信，使用 Playwright 发送';
      const message = this.dmService.generateMessageWithRandomSuffix(baseMessage);
      
      console.log(`📤 批量发送私信给 ${targetUsers.length} 个用户`);
      console.log(`👥 用户列表: ${targetUsers.join(', ')}`);
      console.log(`📝 消息内容: ${message}`);
      
      // 设置较短的间隔用于测试
      const testDelay = 30000; // 30秒间隔（测试用）
      
      const results = await this.dmService.sendBatchMessages(
        targetUsers, 
        message, 
        testDelay
      );
      
      this.testResults.push({
        test: 'batch_messages',
        targetUsers,
        results,
        timestamp: new Date().toISOString()
      });
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 批量私信完成: ${successCount}/${targetUsers.length} 成功`);
      
      return successCount > 0;
      
    } catch (error) {
      console.error('❌ 批量私信测试失败:', error.message);
      this.testResults.push({
        test: 'batch_messages',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async testMessageGeneration() {
    console.log('\n🧪 测试 3: 消息生成和风控规避');
    console.log('=' * 50);
    
    try {
      const baseMessages = [
        '你好！这是测试消息',
        'Hello! This is a test message',
        'Hi there! 👋',
        'Greetings!'
      ];
      
      const generatedMessages = [];
      
      for (const baseMessage of baseMessages) {
        const generated = this.dmService.generateMessageWithRandomSuffix(baseMessage);
        generatedMessages.push(generated);
        console.log(`📝 原始: "${baseMessage}"`);
        console.log(`✨ 生成: "${generated}"`);
        console.log('---');
      }
      
      // 测试每日限制检查
      const currentSent = this.testResults.filter(r => r.success).length;
      const canSend = this.dmService.checkDailyLimit(currentSent, 10);
      
      console.log(`📊 当前已发送: ${currentSent}`);
      console.log(`✅ 可以继续发送: ${canSend}`);
      
      this.testResults.push({
        test: 'message_generation',
        baseMessages,
        generatedMessages,
        canSend,
        timestamp: new Date().toISOString()
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ 消息生成测试失败:', error.message);
      return false;
    }
  }

  async testScreenshot() {
    console.log('\n🧪 测试 4: 截图功能');
    console.log('=' * 50);
    
    try {
      const filename = `test-screenshot-${Date.now()}.png`;
      const filePath = await this.dmService.screenshot(filename);
      
      if (filePath) {
        console.log(`✅ 截图成功保存: ${filePath}`);
        this.testResults.push({
          test: 'screenshot',
          filename,
          filePath,
          success: true,
          timestamp: new Date().toISOString()
        });
        return true;
      } else {
        throw new Error('截图保存失败');
      }
      
    } catch (error) {
      console.error('❌ 截图测试失败:', error.message);
      this.testResults.push({
        test: 'screenshot',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async testServiceStatus() {
    console.log('\n🧪 测试 5: 服务状态检查');
    console.log('=' * 50);
    
    try {
      const status = this.dmService.getStatus();
      console.log('📊 服务状态:', JSON.stringify(status, null, 2));
      
      this.testResults.push({
        test: 'service_status',
        status,
        timestamp: new Date().toISOString()
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ 状态检查失败:', error.message);
      return false;
    }
  }

  async runAllTests() {
    try {
      console.log('🧪 开始运行 Playwright 私信服务测试');
      console.log('=' * 60);
      
      // 初始化
      await this.initialize();
      
      // 运行各项测试
      await this.testServiceStatus();
      await this.testMessageGeneration();
      await this.testScreenshot();
      
      // 只在明确要求时运行实际发送测试
      const runSendTests = process.env.RUN_SEND_TESTS === 'true';
      
      if (runSendTests) {
        console.log('\n⚠️ 注意: 即将发送实际私信消息');
        await this.testSingleMessage();
        
        // 批量测试需要更长的时间，谨慎运行
        const runBatchTests = process.env.RUN_BATCH_TESTS === 'true';
        if (runBatchTests) {
          await this.testBatchMessages();
        }
      } else {
        console.log('\nℹ️ 跳过实际发送测试 (设置 RUN_SEND_TESTS=true 来启用)');
      }
      
      // 生成测试报告
      await this.generateTestReport();
      
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error.message);
      console.error(error.stack);
    } finally {
      // 清理资源
      console.log('\n🧹 清理测试环境...');
      await this.cleanup();
      console.log('✅ 测试完成');
    }
  }

  async generateTestReport() {
    console.log('\n📋 测试报告');
    console.log('=' * 60);
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success !== false).length;
    const failedTests = totalTests - successfulTests;
    
    console.log(`📊 总体统计:`);
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   成功: ${successfulTests}`);
    console.log(`   失败: ${failedTests}`);
    console.log(`   成功率: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n📝 详细结果:`);
    this.testResults.forEach((result, index) => {
      const status = result.success === false ? '❌' : '✅';
      console.log(`   ${index + 1}. ${status} ${result.test}`);
      if (result.error) {
        console.log(`      错误: ${result.error}`);
      }
    });
    
    // 保存测试报告到文件
    const reportPath = `./test-results-playwright-dm-${Date.now()}.json`;
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        totalTests,
        successfulTests,
        failedTests,
        successRate: ((successfulTests / totalTests) * 100).toFixed(1) + '%'
      },
      results: this.testResults,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n💾 详细报告已保存到: ${reportPath}`);
  }

  async cleanup() {
    try {
      await this.dmService.close();
    } catch (error) {
      console.error('❌ 清理资源失败:', error.message);
    }
  }
}

// 环境变量检查
function checkEnvironment() {
  const required = ['TWITTER_COOKIES'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.log('⚠️ 缺少必要的环境变量:');
    missing.forEach(env => console.log(`   - ${env}`));
    console.log('\n📝 请在 .env 文件中配置这些变量');
    
    // 检查是否有用户名密码作为备选方案
    if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD) {
      console.log('❌ 测试需要有效的 cookies 或用户名密码');
      return false;
    }
  }
  
  return true;
}

// 主函数
async function main() {
  console.log('🎭 Playwright 私信服务测试工具');
  console.log('=' * 60);
  
  // 检查环境
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  // 显示配置信息
  console.log('🔧 测试配置:');
  console.log(`   浏览器模式: ${process.env.HEADLESS === 'true' ? '无头模式' : '可视化模式'}`);
  console.log(`   代理使用: ${process.env.PROXY_URL ? '是' : '否'}`);
  console.log(`   实际发送: ${process.env.RUN_SEND_TESTS === 'true' ? '是' : '否 (模拟测试)'}`);
  console.log(`   批量测试: ${process.env.RUN_BATCH_TESTS === 'true' ? '是' : '否'}`);
  
  // 运行测试
  const tester = new PlaywrightDMTest();
  await tester.runAllTests();
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PlaywrightDMTest;