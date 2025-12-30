#!/usr/bin/env node

/**
 * 深度搜索mentions的脚本
 * 专门用于找到和回复2013年的mention
 */

const TwitterService = require('./src/services/twitterService');
const config = require('./src/config');

async function deepMentionSearch() {
  console.log('🔍 深度搜索mentions...');
  console.log('📝 配置信息:');
  console.log('   - 关键词过滤:', config.autoReply.keywords.length === 0 ? '关闭（处理所有mentions）' : '开启');
  console.log('   - 关键词列表:', config.autoReply.keywords);
  console.log('   - 回复消息:', config.autoReply.message);
  console.log('');

  let twitterService;
  
  try {
    // 初始化Twitter服务
    console.log('🚀 初始化Twitter服务...');
    twitterService = await new TwitterService().initialize();
    console.log('✅ Twitter服务初始化成功');
    console.log('');

    // 方法1: 直接访问通知页面
    console.log('📋 方法1: 搜索通知页面...');
    await searchNotifications(twitterService);

    // 方法2: 访问mentions直接页面
    console.log('\n📋 方法2: 访问mentions页面...');
    await searchMentionsDirect(twitterService);

    // 方法3: 搜索用户时间线中的mentions
    console.log('\n📋 方法3: 搜索用户时间线...');
    await searchUserTimeline(twitterService);

  } catch (error) {
    console.error('❌ 搜索过程中出现错误:', error);
  } finally {
    if (twitterService) {
      await twitterService.close();
      console.log('🧹 资源清理完成');
    }
  }
}

async function searchNotifications(twitterService) {
  try {
    await twitterService.goToNotifications();
    
    // 多次滚动以加载更多内容
    for (let i = 0; i < 5; i++) {
      await twitterService.browserService.scrollToBottom();
      await twitterService.browserService.humanDelay(2000, 3000);
      console.log(`   滚动第 ${i + 1} 次...`);
    }

    // 获取mentions
    const mentions = await twitterService.getMentions();
    console.log(`   在通知中找到 ${mentions.length} 个mentions`);
    
    if (mentions.length > 0) {
      displayMentions(mentions, '通知页面');
    }
    
  } catch (error) {
    console.error('   通知页面搜索失败:', error.message);
  }
}

async function searchMentionsDirect(twitterService) {
  try {
    // 直接访问mentions页面
    const mentionsUrl = 'https://x.com/i/notifications/mentions';
    await twitterService.browserService.page.goto(mentionsUrl, { waitUntil: 'networkidle2' });
    await twitterService.browserService.humanDelay(3000, 5000);
    
    console.log('   已访问mentions直接页面');

    // 多次滚动
    for (let i = 0; i < 5; i++) {
      await twitterService.browserService.scrollToBottom();
      await twitterService.browserService.humanDelay(2000, 3000);
    }

    // 提取mentions
    const mentions = await twitterService.browserService.page.evaluate(() => {
      const mentionsList = [];
      
      // 尝试多种选择器
      const selectors = [
        '[data-testid="notification"]',
        '[data-testid="tweet"]',
        'article',
        'div[role="article"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        elements.forEach(element => {
          try {
            // 查找tweet内容
            const tweetText = element.querySelector('[lang]')?.textContent || '';
            const tweetLink = element.querySelector('a[href*="/status/"]');
            
            if (tweetText && tweetLink) {
              const tweetUrl = `https://x.com${tweetLink.getAttribute('href').split('?')[0]}`;
              const tweetId = tweetUrl.split('/').pop();
              
              // 获取用户名
              const usernameElement = element.querySelector('[data-testid="User-Name"]') || 
                                    element.querySelector('a[href*="/@"]');
              let username = '';
              if (usernameElement) {
                username = usernameElement.textContent.replace('@', '');
              } else {
                const tweetHref = tweetLink.getAttribute('href');
                const usernameMatch = tweetHref.match(/\/@([^\/]+)\//);
                if (usernameMatch) {
                  username = usernameMatch[1];
                }
              }

              mentionsList.push({
                tweetId,
                tweetUrl,
                username,
                tweetText
              });
            }
          } catch (e) {
            // 忽略单个元素的错误
          }
        });
        
        if (mentionsList.length > 0) break;
      }
      
      return mentionsList;
    });
    
    console.log(`   在mentions页面找到 ${mentions.length} 个mentions`);
    
    if (mentions.length > 0) {
      displayMentions(mentions, 'mentions直接页面');
    }
    
  } catch (error) {
    console.error('   mentions页面搜索失败:', error.message);
  }
}

async function searchUserTimeline(twitterService) {
  try {
    // 访问用户时间线
    const timelineUrl = 'https://x.com';
    await twitterService.browserService.page.goto(timelineUrl, { waitUntil: 'networkidle2' });
    await twitterService.browserService.humanDelay(3000, 5000);
    
    console.log('   已访问用户时间线');

    // 滚动查找mentions
    for (let i = 0; i < 3; i++) {
      await twitterService.browserService.scrollToBottom();
      await twitterService.browserService.humanDelay(2000, 3000);
    }

    // 提取页面上的所有tweets
    const tweets = await twitterService.browserService.page.evaluate(() => {
      const tweetsList = [];
      const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
      
      tweetElements.forEach(element => {
        try {
          const tweetText = element.querySelector('[lang]')?.textContent || '';
          const tweetLink = element.querySelector('a[href*="/status/"]');
          
          if (tweetText && tweetLink) {
            const tweetUrl = `https://x.com${tweetLink.getAttribute('href').split('?')[0]}`;
            const tweetId = tweetUrl.split('/').pop();
            
            // 检查是否包含@符号（可能是mention）
            if (tweetText.includes('@')) {
              tweetsList.push({
                tweetId,
                tweetUrl,
                tweetText
              });
            }
          }
        } catch (e) {
          // 忽略单个元素的错误
        }
      });
      
      return tweetsList;
    });
    
    console.log(`   在时间线中找到 ${tweets.length} 个包含@的tweets`);
    
    if (tweets.length > 0) {
      displayMentions(tweets.map(t => ({
        tweetId: t.tweetId,
        tweetUrl: t.tweetUrl,
        username: 'unknown',
        tweetText: t.tweetText
      })), '用户时间线');
    }
    
  } catch (error) {
    console.error('   时间线搜索失败:', error.message);
  }
}

function displayMentions(mentions, source) {
  console.log(`\n📋 在${source}找到的mentions:`);
  mentions.forEach((mention, index) => {
    const yearMatch = mention.tweetText.match(/2013/);
    const yearInfo = yearMatch ? '✅ 2013年!' : '';
    console.log(`   ${index + 1}. @${mention.username} ${yearInfo}`);
    console.log(`      内容: ${mention.tweetText.substring(0, 100)}${mention.tweetText.length > 100 ? '...' : ''}`);
    console.log(`      链接: ${mention.tweetUrl}`);
    console.log('');
  });
}

// 运行搜索
if (require.main === module) {
  deepMentionSearch()
    .then(() => {
      console.log('\n🎉 深度搜索完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 搜索失败:', error);
      process.exit(1);
    });
}

module.exports = deepMentionSearch;