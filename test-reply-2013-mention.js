#!/usr/bin/env node

/**
 * 测试回复2013年mentions的脚本
 * 这个脚本专门用于测试回复那个2013年的mention
 */

const TwitterService = require('./src/services/twitterService');
const config = require('./src/config');

async function testReply2013Mention() {
  console.log('🧪 测试回复2013年mention...');
  console.log('📝 配置信息:');
  console.log('   - 关键词过滤:', config.autoReply.keywords.length === 0 ? '关闭（处理所有mentions）' : '开启');
  console.log('   - 回复消息:', config.autoReply.message);
  console.log('');

  let twitterService;
  
  try {
    // 初始化Twitter服务
    console.log('🚀 初始化Twitter服务...');
    twitterService = await new TwitterService().initialize();
    console.log('✅ Twitter服务初始化成功');
    console.log('');

    // 获取mentions
    console.log('📥 获取mentions...');
    const mentions = await twitterService.getMentions();
    console.log(`📊 找到 ${mentions.length} 个mentions`);
    
    if (mentions.length === 0) {
      console.log('❌ 没有找到任何mentions');
      return;
    }

    // 显示所有mentions信息
    console.log('\n📋 找到的mentions:');
    mentions.forEach((mention, index) => {
      const tweetDate = mention.tweetText.includes('2013') ? '2013年' : '其他年份';
      console.log(`   ${index + 1}. @${mention.username} (${tweetDate}): ${mention.tweetText.substring(0, 100)}...`);
    });

    // 由于现在没有关键词过滤，会处理所有mentions，但只回复第一个
    console.log('\n🎯 准备回复第一个mention...');
    
    if (mentions.length > 0) {
      const firstMention = mentions[0];
      console.log(`💬 回复对象: @${firstMention.username}`);
      console.log(`📝 Tweet内容: ${firstMention.tweetText}`);
      console.log(`🔗 Tweet链接: ${firstMention.tweetUrl}`);
      console.log('');

      // 检查是否包含2013年信息
      const is2013Mention = firstMention.tweetText.includes('2013');
      if (is2013Mention) {
        console.log('✅ 检测到2013年mention！');
      } else {
        console.log('ℹ️ 这个mention不是2013年的，但仍然会处理（因为没有关键词过滤）');
      }

      // 自定义回复消息
      const replyMessage = config.autoReply.message.replace('{username}', `@${firstMention.username}`);
      console.log(`📤 回复消息: ${replyMessage}`);
      console.log('');

      // 询问用户是否继续
      console.log('🤔 是否要实际发送回复？');
      console.log('   输入 y 发送回复，输入 n 跳过');
      
      // 这里我们先不实际发送回复，只是展示逻辑
      console.log('⏭️ 跳过实际发送回复（演示模式）');
      
      // 如果需要实际发送，取消注释下面这行：
      // await twitterService.replyToTweet(firstMention.tweetUrl, replyMessage);
      
      console.log('✅ 测试完成');
    }

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    if (twitterService) {
      await twitterService.close();
      console.log('🧹 资源清理完成');
    }
  }
}

// 运行测试
if (require.main === module) {
  testReply2013Mention()
    .then(() => {
      console.log('\n🎉 测试结束');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 测试失败:', error);
      process.exit(1);
    });
}

module.exports = testReply2013Mention;