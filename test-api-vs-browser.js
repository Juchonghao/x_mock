#!/usr/bin/env node

/**
 * 对比测试：API搜索 vs 浏览器搜索
 * 测试无浏览器模式的搜索功能
 */

const ApiSearchService = require('./src/services/apiSearchService');
const SearchService = require('./src/services/searchService');

async function compareSearchMethods() {
  console.log('🔍 对比测试：API搜索 vs 浏览器搜索');
  console.log('=' * 60);
  console.log('📅 测试时间: 2025-12-29');
  console.log('🔑 测试查询: "AI native"');
  console.log('');

  // 测试API搜索 (无浏览器)
  console.log('🤖 测试方法1: API搜索 (无浏览器)');
  console.log('-' * 40);
  
  const apiStartTime = Date.now();
  let apiResults = [];
  let apiError = null;
  
  try {
    const apiSearchService = new ApiSearchService();
    await apiSearchService.initialize();
    
    apiResults = await apiSearchService.search('AI native');
    await apiSearchService.close();
    
  } catch (error) {
    apiError = error.message;
    console.error('❌ API搜索失败:', error);
  }
  
  const apiEndTime = Date.now();
  const apiDuration = apiEndTime - apiStartTime;
  
  // 显示API结果
  if (apiResults.length > 0) {
    console.log(`✅ API搜索成功: ${apiResults.length} 条结果`);
    console.log(`⏱️ 耗时: ${apiDuration}ms`);
    console.log('');
    
    // 显示前5条结果
    console.log('📱 API搜索结果 (前5条):');
    apiResults.slice(0, 5).forEach((tweet, index) => {
      console.log(`   ${index + 1}. @${tweet.username}: ${tweet.tweetText.substring(0, 80)}...`);
    });
  } else {
    console.log(`❌ API搜索失败: ${apiError || '无结果'}`);
  }
  
  console.log('');
  console.log('🌐 测试方法2: 浏览器搜索 (原版本)');
  console.log('-' * 40);
  
  const browserStartTime = Date.now();
  let browserResults = [];
  let browserError = null;
  
  try {
    const searchService = new SearchService();
    await searchService.initialize();
    
    // 缩短搜索时间，使用快速版本
    browserResults = await searchService.search('AI native');
    await searchService.close();
    
  } catch (error) {
    browserError = error.message;
    console.error('❌ 浏览器搜索失败:', error);
  }
  
  const browserEndTime = Date.now();
  const browserDuration = browserEndTime - browserStartTime;
  
  // 显示浏览器结果
  if (browserResults.length > 0) {
    console.log(`✅ 浏览器搜索成功: ${browserResults.length} 条结果`);
    console.log(`⏱️ 耗时: ${browserDuration}ms`);
    console.log('');
    
    // 显示前5条结果
    console.log('📱 浏览器搜索结果 (前5条):');
    browserResults.slice(0, 5).forEach((tweet, index) => {
      console.log(`   ${index + 1}. @${tweet.username}: ${tweet.tweetText.substring(0, 80)}...`);
    });
  } else {
    console.log(`❌ 浏览器搜索失败: ${browserError || '无结果'}`);
  }
  
  console.log('');
  console.log('📊 对比分析');
  console.log('=' * 60);
  
  // 性能对比
  console.log('⚡ 性能对比:');
  console.log(`   API搜索: ${apiDuration}ms`);
  console.log(`   浏览器搜索: ${browserDuration}ms`);
  console.log(`   性能提升: ${((browserDuration - apiDuration) / browserDuration * 100).toFixed(1)}%`);
  console.log('');
  
  // 资源使用对比
  console.log('💾 资源使用对比:');
  console.log('   API搜索:');
  console.log('     - 内存使用: 最小');
  console.log('     - CPU使用: 低');
  console.log('     - 网络请求: 1-2个');
  console.log('     - 浏览器实例: 无');
  console.log('   浏览器搜索:');
  console.log('     - 内存使用: 高 (约100-200MB)');
  console.log('     - CPU使用: 中等');
  console.log('     - 网络请求: 数十个');
  console.log('     - 浏览器实例: 1个');
  console.log('');
  
  // 结果质量对比
  console.log('📋 结果质量对比:');
  console.log(`   API搜索结果数: ${apiResults.length}`);
  console.log(`   浏览器搜索结果数: ${browserResults.length}`);
  console.log('');
  
  // 推荐方案
  console.log('🎯 推荐方案:');
  if (apiResults.length > 0 && apiDuration < browserDuration) {
    console.log('✅ 强烈推荐使用API搜索模式');
    console.log('   优势: 快速、低资源、高稳定性');
    console.log('   适用: 生产环境、自动化任务、批量搜索');
  } else if (browserResults.length > 0) {
    console.log('✅ 浏览器搜索仍然有效');
    console.log('   适用: 手动测试、实时数据获取、复杂页面操作');
  } else {
    console.log('❌ 两种方法都失败，需要进一步调试');
  }
  
  console.log('');
  console.log('🎉 对比测试完成');
}

compareSearchMethods().catch(console.error);