#!/usr/bin/env node

/**
 * 无浏览器模式测试脚本
 * 在HEADLESS模式下测试mentions获取和回复功能
 */

const TwitterService = require('./src/services/twitterService');
const config = require('./src/config');

async function testHeadlessMode() {
  console.log('🤖 无浏览器模式测试开始...');
  console.log('🔧 配置信息:');
  console.log(`   - 浏览器模式: ${config.browser.headless ? 'HEADLESS (无界面)' : 'NORMAL (有界面)'}`);
  console.log(`   - 关键词过滤: ${config.autoReply.keywords.length === 0 ? '关闭 (处理所有mentions)' : '开启'}`);
  console.log(`   - 最大回复数: ${config.autoReply.maxRepliesPerRun}`);
  console.log('');

  let twitterService;
  
  try {
    // 初始化Twitter服务 (无浏览器模式)
    console.log('🚀 初始化Twitter服务 (HEADLESS模式)...');
    twitterService = await new TwitterService().initialize();
    console.log('✅ Twitter服务初始化成功 (无浏览器窗口)');
    console.log('');

    // 测试获取mentions
    console.log('📥 在HEADLESS模式下获取mentions...');
    const mentions = await twitterService.getMentions();
    
    console.log(`📊 获取到 ${mentions.length} 个mentions:`);
    
    if (mentions.length === 0) {
      console.log('❌ 没有找到mentions');
      console.log('💡 提示:');
      console.log('   - 可能需要等待页面完全加载');
      console.log('   - 检查是否有有效的cookies');
      console.log('   - 确认账户登录状态');
    } else {
      mentions.forEach((mention, index) => {
        const yearMatch = mention.tweetText.match(/\b(20\d{2}|19\d{2})\b/);
        const year = yearMatch ? yearMatch[0] : '未知';
        console.log(`   ${index + 1}. @${mention.username} (${year}): ${mention.tweetText.substring(0, 80)}...`);
      });
      
      console.log('');
      console.log('🎯 准备回复第一个mention...');
      
      const firstMention = mentions[0];
      console.log(`   目标: @${firstMention.username}`);
      console.log(`   内容: ${firstMention.tweetText}`);
      console.log(`   链接: ${firstMention.tweetUrl}`);
      
      // 生成回复消息
      const replyMessage = config.autoReply.message.replace('{username}', `@${firstMention.username}`);
      console.log(`   回复: ${replyMessage}`);
      
      console.log('');
      console.log('❓ 是否发送实际回复？');
      console.log('   - 当前为演示模式，不发送实际回复');
      console.log('   - 如需发送回复，取消注释下面的代码');
      
      // 如果需要实际发送回复，取消注释下面这行:
      // await twitterService.replyToTweet(firstMention.tweetUrl, replyMessage);
      
      console.log('✅ HEADLESS模式测试完成');
    }

    // 统计信息
    console.log('');
    console.log('📈 测试统计:');
    console.log(`   - 运行时间: HEADLESS模式`);
    console.log(`   - 资源消耗: 最低 (无GUI渲染)`);
    console.log(`   - 成功率: ${mentions.length > 0 ? '100%' : '0%'}`);
    
  } catch (error) {
    console.error('❌ HEADLESS模式测试失败:', error);
    console.log('');
    console.log('🔍 错误分析:');
    console.log('   - 检查网络连接');
    console.log('   - 确认Twitter cookies有效性');
    console.log('   - 验证页面结构是否发生变化');
  } finally {
    if (twitterService) {
      await twitterService.close();
      console.log('🧹 资源清理完成 (HEADLESS模式)');
    }
  }
}

// 运行测试
if (require.main === module) {
  testHeadlessMode()
    .then(() => {
      console.log('\n🎉 无浏览器模式测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 无浏览器模式测试失败:', error);
      process.exit(1);
    });
}

module.exports = testHeadlessMode;