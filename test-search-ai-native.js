#!/usr/bin/env node

/**
 * 测试搜索功能的脚本
 * 在X上搜索 "AI native" 关键词
 */

const SearchService = require('./src/services/searchService');

async function testSearchAiNative() {
  console.log('🔍 X平台搜索测试: "AI native"');
  console.log('=' * 50);

  let searchService;
  
  try {
    // 初始化搜索服务
    console.log('🚀 初始化搜索服务...');
    searchService = await new SearchService().initialize();
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
      
      results.forEach((tweet, index) => {
        console.log(`📱 Tweet ${index + 1}:`);
        console.log(`   👤 用户: @${tweet.username}`);
        console.log(`   📝 内容: ${tweet.tweetText.substring(0, 200)}${tweet.tweetText.length > 200 ? '...' : ''}`);
        console.log(`   ⏰ 时间: ${tweet.timeText}`);
        console.log(`   🔗 链接: ${tweet.tweetUrl}`);
        console.log('');
      });
      
      // 统计信息
      console.log('📊 搜索统计:');
      const uniqueUsers = new Set(results.map(t => t.username));
      console.log(`   - 总tweets数量: ${results.length}`);
      console.log(`   - 独特用户数量: ${uniqueUsers.size}`);
      console.log(`   - 平均tweet长度: ${Math.round(results.reduce((sum, t) => sum + t.tweetText.length, 0) / results.length)} 字符`);
    }

  } catch (error) {
    console.error('❌ 搜索过程中出现错误:', error);
  } finally {
    if (searchService) {
      await searchService.close();
      console.log('🧹 搜索服务关闭');
    }
  }
}

// 运行测试
if (require.main === module) {
  testSearchAiNative()
    .then(() => {
      console.log('\n🎉 搜索测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 搜索测试失败:', error);
      process.exit(1);
    });
}

module.exports = testSearchAiNative;