const BrowserService = require('./browserService');
const config = require('../config');

class TwitterService {
  constructor() {
    this.browserService = new BrowserService();
    this.repliedTweets = new Set();
    this.twitterUrl = 'https://x.com';
  }

  async initialize() {
    try {
      await this.browserService.initialize();
      await this.browserService.injectCookies(this.twitterUrl);
      return this;
    } catch (error) {
      console.error('Failed to initialize Twitter service:', error);
      throw error;
    }
  }

  async goToNotifications() {
    try {
      const notificationsUrl = `${this.twitterUrl}/notifications`;
      await this.browserService.page.goto(notificationsUrl, { waitUntil: 'networkidle2' });
      await this.browserService.humanDelay(2000, 4000);
      console.log('Navigated to notifications page');
    } catch (error) {
      console.error('Failed to go to notifications:', error);
      throw error;
    }
  }

  async getMentions() {
    try {
      await this.goToNotifications();
      
      // Click on "Mentions" tab if it exists
      try {
        const mentionsTab = await this.browserService.page.$('a[href="/notifications/mentions"]');
        if (mentionsTab) {
          await mentionsTab.click();
          await this.browserService.humanDelay(2000, 3000);
        }
      } catch (e) {
        console.warn('Could not find or click mentions tab:', e);
      }

      // 不强制等待选择器，而是使用try-catch来处理
      await this.browserService.humanDelay(3000, 5000);
      
      // Scroll to load more notifications
      await this.browserService.scrollToBottom();
      await this.browserService.humanDelay(1000, 2000);

      // Extract mentions with flexible selectors based on actual page structure
      const mentions = await this.browserService.page.evaluate((repliedTweets) => {
        // 尝试不同的选择器来获取通知元素
        let notificationElements = document.querySelectorAll('[data-testid="notification"]');
        
        // 如果没有找到，尝试使用其他可能的选择器
        if (notificationElements.length === 0) {
          // 尝试查找包含tweet的div元素
          notificationElements = document.querySelectorAll('div:has([data-testid="tweet"])');
        }
        
        // 如果还是没有找到，尝试查找所有可能的通知卡片
        if (notificationElements.length === 0) {
          notificationElements = document.querySelectorAll('[data-testid="tweet"]').closest('div');
        }
        
        const mentionsList = [];

        notificationElements.forEach(notification => {
          try {
            // Get tweet
            const tweetElement = notification.querySelector('[data-testid="tweet"]') || notification;
            if (!tweetElement) return;
            
            // Check if it's a mention notification
            const mentionText = tweetElement.querySelector('[lang]');
            if (!mentionText) return;

            // Get tweet URL
            const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
            if (!tweetLink) return;

            const tweetUrl = `https://x.com${tweetLink.getAttribute('href').split('?')[0]}`;
            const tweetId = tweetUrl.split('/').pop();

            // Skip if already replied
            if (repliedTweets.has(tweetId)) return;

            // Get username
            const usernameElement = tweetElement.querySelector('[data-testid="User-Name"]') || 
                                  tweetElement.querySelector('a[href*="/@"]');
            let username = '';
            if (usernameElement) {
              username = usernameElement.textContent.replace('@', '');
            } else {
              // 从tweet link中提取用户名
              const tweetHref = tweetLink.getAttribute('href');
              const usernameMatch = tweetHref.match(/\/@([^\/]+)\//);
              if (usernameMatch) {
                username = usernameMatch[1];
              }
            }

            // Get tweet text
            const tweetText = mentionText.textContent;

            mentionsList.push({
              tweetId,
              tweetUrl,
              username,
              tweetText
            });
          } catch (e) {
            console.error('Error extracting mention:', e);
          }
        });

        return mentionsList;
      }, this.repliedTweets);
      
      // 如果没有找到mentions但页面已经加载完成，返回空数组而不是失败
      if (mentions.length === 0) {
        console.log('没有找到新的mentions');
      }

      console.log(`Found ${mentions.length} new mentions`);
      return mentions;
    } catch (error) {
      console.error('Failed to get mentions:', error);
      throw error;
    }
  }

  async filterMentionsByKeywords(mentions) {
    try {
      const keywords = config.autoReply.keywords;
      if (!keywords || keywords.length === 0) {
        console.warn('No keywords configured. All mentions will be processed.');
        return mentions;
      }

      const filteredMentions = mentions.filter(mention => {
        const lowerText = mention.tweetText.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
      });

      console.log(`Filtered to ${filteredMentions.length} mentions matching keywords`);
      return filteredMentions;
    } catch (error) {
      console.error('Failed to filter mentions:', error);
      throw error;
    }
  }

  async replyToTweet(tweetUrl, replyMessage) {
    try {
      // Navigate to the tweet
      await this.browserService.page.goto(tweetUrl, { waitUntil: 'networkidle2' });
      await this.browserService.humanDelay(2000, 3000);

      // Click on reply button
      const replyButton = await this.browserService.page.waitForSelector('[data-testid="reply"]', { timeout: 10000 });
      await replyButton.click();
      await this.browserService.humanDelay(1000, 2000);

      // Type reply message
      const replyTextArea = await this.browserService.page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      await replyTextArea.click();
      await this.browserService.humanDelay(500, 1000);
      await replyTextArea.type(replyMessage, { delay: 50 }); // Type with delay to mimic human
      await this.browserService.humanDelay(1000, 2000);

      // Click tweet button
      const tweetButton = await this.browserService.page.waitForSelector('[data-testid="tweetButton"]', { timeout: 10000 });
      await tweetButton.click();
      await this.browserService.humanDelay(3000, 5000);

      console.log(`Replied to tweet: ${tweetUrl}`);
      return true;
    } catch (error) {
      console.error('Failed to reply to tweet:', error);
      throw error;
    }
  }

  async autoReply() {
    try {
      console.log('Starting auto-reply process...');

      // Get all mentions
      const mentions = await this.getMentions();
      
      // Filter mentions by keywords
      const filteredMentions = await this.filterMentionsByKeywords(mentions);
      
      // 🔥 关键修改: 只回复第一条匹配的mention
      const firstMention = filteredMentions[0];
      
      if (!firstMention) {
        console.log('No mentions to process.');
        return 0;
      }
      
      try {
        console.log(`🎯 Processing FIRST mention from @${firstMention.username}: ${firstMention.tweetText}`);
        
        // Customize reply message with username
        const replyMessage = config.autoReply.message.replace('{username}', `@${firstMention.username}`);
        
        // Reply to the first mention only
        await this.replyToTweet(firstMention.tweetUrl, replyMessage);
        
        // Mark as replied
        this.repliedTweets.add(firstMention.tweetId);
        
        console.log(`✅ Successfully replied to first mention from @${firstMention.username}`);
        console.log(`📊 Auto-reply process completed. Replied to 1 tweet out of ${filteredMentions.length} filtered mentions.`);
        
        return 1;
        
      } catch (error) {
        console.error(`Failed to process first mention from @${firstMention.username}:`, error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to run auto-reply:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.browserService.close();
      console.log('Twitter service closed');
    } catch (error) {
      console.error('Failed to close Twitter service:', error);
      throw error;
    }
  }
}

module.exports = TwitterService;
