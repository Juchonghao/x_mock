#!/usr/bin/env node

/**
 * 快速搜索测试脚本 - 优化超时时间
 * 在X上搜索 "AI native" 关键词并获取前5条结果
 */

const SearchService = require('./src/services/searchService');

async function testSearchAiNativeFast() {
  console.log('🔍 X平台快速搜索测试: "AI native"');
  console.log('=' * 50);

  let searchService;
  
  try {
    // 初始化搜索服务 - 增加超时时间
    console.log('🚀 初始化搜索服务...');
    searchService = new SearchService();
    
    // 重写initialize方法以增加超时时间
    const originalInitialize = searchService.initialize.bind(searchService);
    searchService.initialize = async function() {
      await this.browserService.initialize();
      
      // 增加导航超时时间
      const originalInjectCookies = this.browserService.injectCookies.bind(this.browserService);
      this.browserService.injectCookies = async function(url) {
        try {
          if (!config.twitter.cookies) {
            console.warn('No cookies provided. Please update .env file.');
            return;
          }

          // Navigate to a blank page first
          await this.page.goto('about:blank');

          // Parse cookies from string
          const cookies = JSON.parse(config.twitter.cookies);
          
          // Inject cookies
          await this.page.setCookie(...cookies);
          console.log('Cookies injected successfully');

          // Navigate to X with increased timeout
          await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // 增加到60秒
          console.log('Navigated to', url);

        } catch (error) {
          console.error('Failed to inject cookies:', error);
          throw error;
        }
      };
      
      await this.browserService.injectCookies('https://x.com');
      return this;
    };
    
    await searchService.initialize();
    console.log('✅ 搜索服务初始化成功');
    console.log('');

    // 搜索 "AI native"
    const searchQuery = 'AI native';
    console.log(`🔎 搜索关键词: "${searchQuery}"`);
    console.log('');
    
    const results = await searchService.search(searchQuery);
    
    if (results.length === 0) {
      console.log('❌ 没有找到相关的tweets');
      console.log('💡 可能的原因:');
      console.log('   - 搜索结果需要更多时间加载');
      console.log('   - 需要滚动页面获取更多结果');
      console.log('   - 页面结构可能有变化');
    } else {
      console.log(`✅ 找到 ${results.length} 条相关tweets:`);
      console.log('');
      
      // 只显示前5条
      const top5Results = results.slice(0, 5);
      
      top5Results.forEach((tweet, index) => {
        console.log(`📱 Tweet ${index + 1}:`);
        console.log(`   👤 用户: @${tweet.username}`);
        console.log(`   📝 内容: ${tweet.tweetText.substring(0, 200)}${tweet.tweetText.length > 200 ? '...' : ''}`);
        console.log(`   ⏰ 时间: ${tweet.timeText}`);
        console.log(`   🔗 链接: ${tweet.tweetUrl}`);
        console.log('');
      });
      
      // 统计信息
      console.log('📊 搜索统计:');
      console.log(`   总结果数: ${results.length}`);
      console.log(`   显示前5条: ${top5Results.length}`);
      
      // 计算相关度评分
      const avgRelevance = top5Results.reduce((sum, tweet) => sum + (tweet.relevanceScore || 0), 0) / top5Results.length;
      console.log(`   平均相关度: ${avgRelevance.toFixed(2)}`);
      
    }
    
  } catch (error) {
    console.error('❌ 搜索过程中出现错误:', error.message);
  } finally {
    if (searchService) {
      await searchService.close();
      console.log('🧹 搜索服务关闭');
    }
  }
  
  console.log('🎉 快速搜索测试完成');
}

// 引入config
const config = require('./src/config');

testSearchAiNativeFast().catch(console.error);