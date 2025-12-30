const PlaywrightFollowService = require('./src/services/playwrightFollowService.js');

class FollowUsersTest {
  constructor() {
    this.followService = null;
    this.testResults = [];
    this.headless = false; // 可视化模式，方便观察
    this.targetCount = 10;
  }

  // 记录测试结果
  recordResult(testName, success, message = '', data = null) {
    const result = {
      test: testName,
      success,
      message,
      timestamp: new Date().toISOString(),
      data
    };
    
    this.testResults.push(result);
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
    
    return result;
  }

  // 执行单个测试
  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 测试: ${testName}`);
      const result = await testFunction();
      return result;
    } catch (error) {
      console.error(`❌ 测试失败: ${testName} - ${error.message}`);
      this.recordResult(testName, false, error.message);
      return false;
    }
  }

  // 测试1: 初始化服务
  async testServiceInitialization() {
    return this.runTest('服务初始化', async () => {
      this.followService = new PlaywrightFollowService({
        headless: this.headless,
        debug: true
      });
      
      const success = await this.followService.initialize();
      
      if (success) {
        this.recordResult('服务初始化', true, '服务初始化成功');
        return true;
      } else {
        this.recordResult('服务初始化', false, '服务初始化失败');
        return false;
      }
    });
  }

  // 测试2: 登录状态检查
  async testLoginStatus() {
    return this.runTest('登录状态检查', async () => {
      const isLoggedIn = await this.followService.checkLoginStatus();
      
      if (isLoggedIn) {
        this.recordResult('登录状态检查', true, '用户已登录');
        return true;
      } else {
        this.recordResult('登录状态检查', false, '用户未登录');
        return false;
      }
    });
  }

  // 测试3: 随机关键词搜索
  async testRandomKeywordSearch() {
    return this.runTest('随机关键词搜索', async () => {
      const keywords = this.followService.randomKeywords;
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
      
      console.log(`🔍 随机选择关键词: ${randomKeyword}`);
      
      await this.followService.page.goto(`https://x.com/search?q=${encodeURIComponent(randomKeyword)}&f=user`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      
      await this.followService.humanDelay(3000, 5000);
      
      await this.followService.screenshot(`random-search-${randomKeyword}.png`);
      
      this.recordResult('随机关键词搜索', true, `搜索关键词: ${randomKeyword}`, { keyword: randomKeyword });
      return true;
    });
  }

  // 测试4: 用户搜索和提取
  async testUserSearchAndExtraction() {
    return this.runTest('用户搜索和提取', async () => {
      const users = await this.followService.findUsersInSearchResults();
      
      console.log(`🔍 找到 ${users.length} 个用户`);
      
      if (users.length > 0) {
        console.log('📋 用户列表:');
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.username}`);
        });
        
        this.recordResult('用户搜索和提取', true, `找到 ${users.length} 个用户`, { users });
        return true;
      } else {
        this.recordResult('用户搜索和提取', false, '未找到用户');
        return false;
      }
    });
  }

  // 测试5: 检查用户关注状态
  async testUserFollowStatus() {
    return this.runTest('检查用户关注状态', async () => {
      // 先获取一些用户
      const users = await this.followService.findUsersInSearchResults();
      
      if (users.length === 0) {
        this.recordResult('检查用户关注状态', false, '没有用户可以检查');
        return false;
      }
      
      // 检查第一个用户的关注状态
      const testUser = users[0];
      const isFollowed = await this.followService.isUserFollowed(testUser.username);
      
      console.log(`👤 用户 ${testUser.username} 的关注状态: ${isFollowed ? '已关注' : '未关注'}`);
      
      this.recordResult('检查用户关注状态', true, 
        `用户 ${testUser.username} ${isFollowed ? '已关注' : '未关注'}`, 
        { username: testUser.username, isFollowed }
      );
      
      return true;
    });
  }

  // 测试6: 关注单个用户
  async testFollowSingleUser() {
    return this.runTest('关注单个用户', async () => {
      // 获取未关注的用户
      const users = await this.followService.findUsersInSearchResults();
      
      if (users.length === 0) {
        this.recordResult('关注单个用户', false, '没有用户可以关注');
        return false;
      }
      
      // 尝试关注第一个用户
      const testUser = users[0];
      const followSuccess = await this.followService.followUser(testUser);
      
      if (followSuccess) {
        this.recordResult('关注单个用户', true, `成功关注用户 ${testUser.username}`, { user: testUser });
        return true;
      } else {
        this.recordResult('关注单个用户', false, `关注用户 ${testUser.username} 失败`);
        return false;
      }
    });
  }

  // 测试7: 随机关注多个用户
  async testRandomFollowMultipleUsers() {
    return this.runTest('随机关注多个用户', async () => {
      // 减少目标数量进行测试
      const testCount = 3;
      const followedUsers = await this.followService.followRandomUsers(testCount);
      
      console.log(`🎯 随机关注测试结果: ${followedUsers.length}/${testCount} 个用户`);
      
      if (followedUsers.length > 0) {
        console.log('📋 成功关注的用户:');
        followedUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.username}`);
        });
        
        this.recordResult('随机关注多个用户', true, 
          `成功关注 ${followedUsers.length} 个用户`, 
          { followedUsers, targetCount: testCount }
        );
        
        return true;
      } else {
        this.recordResult('随机关注多个用户', false, '未能成功关注任何用户');
        return false;
      }
    });
  }

  // 测试8: 截图功能
  async testScreenshotFunction() {
    return this.runTest('截图功能', async () => {
      await this.followService.page.goto('https://x.com/home', {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      
      await this.followService.humanDelay(2000, 3000);
      
      const screenshotPath = await this.followService.screenshot('follow-test-screenshot.png');
      
      if (screenshotPath) {
        this.recordResult('截图功能', true, `截图保存到: ${screenshotPath}`, { screenshotPath });
        return true;
      } else {
        this.recordResult('截图功能', false, '截图保存失败');
        return false;
      }
    });
  }

  // 生成测试报告
  generateReport() {
    console.log('\n📊 随机关注用户测试报告');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const successRate = ((successfulTests / totalTests) * 100).toFixed(1);
    
    console.log(`📊 总体统计:`);
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   成功: ${successfulTests}`);
    console.log(`   失败: ${totalTests - successfulTests}`);
    console.log(`   成功率: ${successRate}%`);
    
    console.log('\n📝 详细结果:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.test}: ${result.message}`);
    });
    
    // 保存详细报告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        successfulTests,
        failedTests: totalTests - successfulTests,
        successRate: `${successRate}%`
      },
      results: this.testResults
    };
    
    const reportFilename = `follow-test-results-${Date.now()}.json`;
    const reportPath = require('path').join(process.cwd(), 'sessions', reportFilename);
    
    try {
      require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 详细报告已保存到: ${reportPath}`);
    } catch (error) {
      console.error('❌ 保存报告失败:', error.message);
    }
    
    return report;
  }

  // 运行完整测试套件
  async runAllTests() {
    console.log('🎭 Playwright 随机关注用户测试工具');
    console.log(`🔧 测试配置: 目标关注数: ${this.targetCount}, 可视化模式: ${!this.headless}`);
    
    try {
      // 测试1: 初始化服务
      const initSuccess = await this.testServiceInitialization();
      if (!initSuccess) {
        console.log('❌ 服务初始化失败，停止测试');
        return;
      }
      
      // 测试2: 登录状态检查
      await this.testLoginStatus();
      
      // 测试3-5: 基础功能测试
      await this.testRandomKeywordSearch();
      await this.testUserSearchAndExtraction();
      await this.testUserFollowStatus();
      
      // 测试6: 关注单个用户
      await this.testFollowSingleUser();
      
      // 测试7: 随机关注多个用户 (主要功能)
      await this.testRandomFollowMultipleUsers();
      
      // 测试8: 截图功能
      await this.testScreenshotFunction();
      
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error.message);
    } finally {
      // 清理资源
      if (this.followService) {
        await this.followService.cleanup();
      }
      
      // 生成报告
      this.generateReport();
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const test = new FollowUsersTest();
  test.runAllTests().catch(console.error);
}

module.exports = FollowUsersTest;