const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Oxylabs 代理测试脚本
 * 用于验证代理配置和连接状态
 */

class OxylabsTester {
  constructor() {
    this.ipPoolPath = path.join(__dirname, '../data/oxylabs-ip-pool.json');
    this.testUrl = 'http://httpbin.org/ip'; // 用于测试IP的公共API
    this.timeout = 10000; // 10秒超时
  }

  // 加载IP池配置
  loadIPPools() {
    try {
      const data = fs.readFileSync(this.ipPoolPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ 无法加载IP池配置:', error.message);
      return [];
    }
  }

  // 测试单个代理
  async testProxy(proxyConfig, testName = '') {
    const { url, username, password } = proxyConfig;
    
    try {
      console.log(`🔍 测试代理: ${testName || url}`);
      
      // 配置代理
      const proxy = {
        host: new URL(url).hostname,
        port: new URL(url).port || 8000,
        auth: {
          username: username,
          password: password
        }
      };

      const response = await axios.get(this.testUrl, {
        proxy: proxy,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const ipInfo = response.data;
      console.log(`✅ 代理工作正常: ${ipInfo.origin}`);
      
      return {
        success: true,
        ip: ipInfo.origin,
        proxy: proxyConfig,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      console.log(`❌ 代理失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
        proxy: proxyConfig
      };
    }
  }

  // 测试所有代理
  async testAllProxies() {
    console.log('🚀 开始测试Oxylabs代理...\n');
    
    const proxies = this.loadIPPools();
    const results = [];
    
    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      const testName = `${proxy.provider} - ${proxy.location} (${proxy.city}, ${proxy.country})`;
      
      const result = await this.testProxy(proxy, testName);
      results.push(result);
      
      // 间隔2秒避免过快请求
      if (i < proxies.length - 1) {
        await this.delay(2000);
      }
    }
    
    return results;
  }

  // 批量测试（并发）
  async testProxiesBatch() {
    console.log('🚀 开始批量测试Oxylabs代理...\n');
    
    const proxies = this.loadIPPools();
    
    // 创建测试Promise数组
    const testPromises = proxies.map((proxy, index) => 
      this.testProxy(proxy, `${proxy.location} (${index + 1}/${proxies.length})`)
        .then(result => ({ ...result, index }))
    );
    
    // 并发执行测试
    const results = await Promise.allSettled(testPromises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason.message,
          proxy: proxies[index],
          index
        };
      }
    });
  }

  // 生成测试报告
  generateReport(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n📊 测试报告');
    console.log('='.repeat(50));
    console.log(`总代理数量: ${results.length}`);
    console.log(`成功连接: ${successful.length}`);
    console.log(`连接失败: ${failed.length}`);
    console.log(`成功率: ${((successful.length / results.length) * 100).toFixed(1)}%\n`);

    if (successful.length > 0) {
      console.log('✅ 可用代理:');
      successful.forEach((result, index) => {
        const proxy = result.proxy;
        console.log(`  ${index + 1}. ${proxy.location} (${proxy.city}, ${proxy.country})`);
        console.log(`     IP: ${result.ip}`);
        console.log(`     类型: ${proxy.proxyType}`);
        console.log(`     URL: ${proxy.url.split('@')[1] || proxy.url}`);
        console.log('');
      });
    }

    if (failed.length > 0) {
      console.log('❌ 不可用代理:');
      failed.forEach((result, index) => {
        const proxy = result.proxy;
        console.log(`  ${index + 1}. ${proxy.location} - ${result.error}`);
        console.log(`     URL: ${proxy.url.split('@')[1] || proxy.url}`);
        console.log('');
      });
    }
    
    return {
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / results.length) * 100
      },
      successful,
      failed
    };
  }

  // 验证配置文件
  validateConfig() {
    console.log('🔍 验证配置文件...\n');
    
    try {
      const proxies = this.loadIPPools();
      
      if (proxies.length === 0) {
        throw new Error('IP池为空');
      }
      
      let validCount = 0;
      let invalidCount = 0;
      
      proxies.forEach((proxy, index) => {
        const validation = this.validateProxyConfig(proxy, index + 1);
        if (validation.valid) {
          validCount++;
        } else {
          invalidCount++;
          console.log(`❌ 代理 ${index + 1}: ${validation.errors.join(', ')}`);
        }
      });
      
      console.log(`\n配置验证结果: ${validCount} 有效, ${invalidCount} 无效\n`);
      return validCount > 0;
      
    } catch (error) {
      console.error(`❌ 配置验证失败: ${error.message}\n`);
      return false;
    }
  }

  // 验证单个代理配置
  validateProxyConfig(proxy, index) {
    const errors = [];
    
    // 检查必要字段
    if (!proxy.url) errors.push('缺少URL');
    if (!proxy.username) errors.push('缺少用户名');
    if (!proxy.password) errors.push('缺少密码');
    if (!proxy.location) errors.push('缺少地理位置');
    if (!proxy.provider) errors.push('缺少提供商');
    
    // 验证URL格式
    if (proxy.url) {
      try {
        new URL(proxy.url);
      } catch {
        errors.push('URL格式无效');
      }
    }
    
    // 验证Oxylabs特定格式
    if (proxy.url && proxy.url.includes('oxylabs.io')) {
      if (!proxy.url.includes('residential.oxylabs.io') && !proxy.url.includes('datacenter.oxylabs.io')) {
        errors.push('Oxylabs URL格式不正确');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 生成配置建议
  generateRecommendations(results) {
    console.log('\n💡 配置建议');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
      console.log('❌ 没有可用的代理，请检查:');
      console.log('1. Oxylabs账户余额是否充足');
      console.log('2. 用户名和密码是否正确');
      console.log('3. 网络连接是否正常');
      return;
    }
    
    console.log('✅ 可用代理推荐用于生产环境:');
    
    // 按地理位置分组
    const geoGroups = {};
    successful.forEach(result => {
      const geo = result.proxy.location;
      if (!geoGroups[geo]) {
        geoGroups[geo] = [];
      }
      geoGroups[geo].push(result);
    });
    
    Object.entries(geoGroups).forEach(([geo, proxies]) => {
      console.log(`\n🌍 ${geo}:`);
      proxies.forEach((proxy, index) => {
        console.log(`  ${index + 1}. ${proxy.proxy.city}, ${proxy.proxy.country} (${proxy.proxy.proxyType})`);
        console.log(`     IP: ${proxy.ip}`);
      });
    });
    
    console.log('\n📋 下一步操作:');
    console.log('1. 将可用代理配置复制到 data/ip-pool.json');
    console.log('2. 更新 .env 文件中的 Twitter cookies');
    console.log('3. 运行部署脚本: ./deploy.sh deploy');
  }
}

// 主执行逻辑
async function main() {
  const tester = new OxylabsTester();
  
  console.log('🧪 Oxylabs 代理测试工具\n');
  console.log('=' * 50);
  
  // 1. 验证配置
  if (!tester.validateConfig()) {
    console.log('请先修复配置错误后重试');
    process.exit(1);
  }
  
  // 2. 选择测试模式
  const args = process.argv.slice(2);
  const mode = args[0] || 'batch'; // 'batch' 或 'sequential'
  
  let results;
  if (mode === 'sequential') {
    results = await tester.testAllProxies();
  } else {
    results = await tester.testProxiesBatch();
  }
  
  // 3. 生成报告
  const report = tester.generateReport(results);
  
  // 4. 生成建议
  tester.generateRecommendations(results);
  
  // 5. 保存结果到文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(__dirname, `../logs/oxylabs-test-report-${timestamp}.json`);
  
  try {
    const fs = require('fs');
    const logsDir = path.dirname(reportFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp,
      report,
      mode
    }, null, 2));
    
    console.log(`\n📄 详细报告已保存到: ${reportFile}`);
  } catch (error) {
    console.log(`\n⚠️ 无法保存报告文件: ${error.message}`);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = OxylabsTester;