/**
 * Twitter搜索服务
 * 用于在X/Twitter上搜索特定关键词
 */

const BrowserService = require('./browserService');

class SearchService {
  constructor() {
    this.browserService = new BrowserService();
    this.twitterUrl = 'https://x.com';
  }

  async initialize() {
    try {
      await this.browserService.initialize();
      await this.browserService.injectCookies(this.twitterUrl);
      return this;
    } catch (error) {
      console.error('Failed to initialize Search service:', error);
      throw error;
    }
  }

  async search(query) {
    try {
      console.log(`🔍 开始搜索: "${query}"`);
      
      // 导航到搜索页面 - 增加超时处理
      const searchUrl = `${this.twitterUrl}/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
      console.log('🌐 导航到搜索页面...');
      await this.browserService.page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 // 60秒超时
      });
      await this.browserService.humanDelay(3000, 5000);

      // 智能滚动加载更多内容
      console.log('📜 滚动加载搜索结果...');
      await this.browserService.scrollToBottom();
      await this.browserService.humanDelay(2000, 3000);
      await this.browserService.scrollToBottom();
      await this.browserService.humanDelay(2000, 3000);

      // 分批提取搜索结果 - 增加重试机制
      console.log('📊 提取搜索结果...');
      const searchResults = await this.extractSearchResultsWithRetry(query, 3);
      
      console.log(`✅ 成功找到 ${searchResults.length} 条相关tweets`);
      return searchResults;
      
    } catch (error) {
      console.error('❌ 搜索过程中出现错误:', error);
      
      // 错误恢复：尝试获取任何可见的tweets
      try {
        console.log('🔄 尝试错误恢复模式...');
        const fallbackResults = await this.fallbackSearch(query);
        if (fallbackResults.length > 0) {
          console.log(`✅ 恢复模式成功: 找到 ${fallbackResults.length} 条结果`);
          return fallbackResults;
        }
      } catch (fallbackError) {
        console.error('❌ 恢复模式也失败:', fallbackError);
      }
      
      throw error;
    }
  }

  async extractSearchResultsWithRetry(query, maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试提取 (${attempt}/${maxRetries})...`);
        
        const results = await this.browserService.page.evaluate((query) => {
          const tweets = [];
          
          // 优化的tweet选择器
          const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
          console.log(`找到 ${tweetElements.length} 个tweet元素`);
          
          tweetElements.forEach((tweetElement, index) => {
            try {
              // 获取tweet文本
              const textElement = tweetElement.querySelector('[lang]');
              if (!textElement) return;
              
              const tweetText = textElement.textContent.trim();
              
              // 过滤包含搜索关键词的tweets
              if (tweetText.toLowerCase().includes(query.toLowerCase())) {
                // 获取用户名 - 多种方法
                let username = '';
                
                // 方法1: 从用户名元素获取
                const usernameElement = tweetElement.querySelector('[data-testid="User-Name"]');
                if (usernameElement) {
                  username = usernameElement.textContent.replace('@', '').trim();
                } else {
                  // 方法2: 从链接中提取
                  const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
                  if (tweetLink) {
                    const tweetHref = tweetLink.getAttribute('href');
                    const usernameMatch = tweetHref.match(/\/@([^\/]+)\//);
                    if (usernameMatch) {
                      username = usernameMatch[1];
                    }
                  }
                }
                
                // 获取tweet URL
                const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
                if (!tweetLink) return;
                
                const tweetUrl = `https://x.com${tweetLink.getAttribute('href').split('?')[0]}`;
                const tweetId = tweetUrl.split('/').pop();
                
                // 获取时间信息
                const timeElement = tweetElement.querySelector('time');
                const timeText = timeElement ? timeElement.getAttribute('datetime') || timeElement.textContent : '';
                
                tweets.push({
                  tweetId,
                  username,
                  tweetText,
                  tweetUrl,
                  timeText,
                  relevanceScore: tweetText.toLowerCase().includes(query.toLowerCase()) ? 2 : 1
                });
              }
            } catch (e) {
              console.error(`Error extracting tweet ${index}:`, e);
            }
          });
          
          return tweets;
        }, query);
        
        if (results.length > 0) {
          return results;
        } else {
          console.log(`⚠️ 尝试 ${attempt} 未找到结果，等待重试...`);
          if (attempt < maxRetries) {
            await this.browserService.humanDelay(2000, 3000);
            await this.browserService.scrollToBottom();
          }
        }
        
      } catch (error) {
        console.error(`❌ 尝试 ${attempt} 失败:`, error.message);
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
    
    return [];
  }

  async fallbackSearch(query) {
    console.log('🔍 执行恢复搜索模式...');
    
    // 尝试获取任何可见的tweets作为fallback
    const results = await this.browserService.page.evaluate((query) => {
      const tweets = [];
      
      // 尝试多种选择器
      const selectors = [
        '[data-testid="tweet"]',
        '[role="article"]',
        'article[data-testid="tweet"]'
      ];
      
      let tweetElements = [];
      for (const selector of selectors) {
        tweetElements = document.querySelectorAll(selector);
        if (tweetElements.length > 0) break;
      }
      
      console.log(`Fallback: 找到 ${tweetElements.length} 个tweet元素`);
      
      tweetElements.forEach((tweetElement) => {
        try {
          const textElement = tweetElement.querySelector('[lang]');
          if (!textElement) return;
          
          const tweetText = textElement.textContent.trim();
          
          // 即使没有完全匹配关键词，也尝试获取基本信息
          const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
          if (!tweetLink) return;
          
          const tweetUrl = `https://x.com${tweetLink.getAttribute('href').split('?')[0]}`;
          const tweetId = tweetUrl.split('/').pop();
          
          // 获取用户名
          let username = '';
          const tweetHref = tweetLink.getAttribute('href');
          const usernameMatch = tweetHref.match(/\/@([^\/]+)\//);
          if (usernameMatch) {
            username = usernameMatch[1];
          }
          
          tweets.push({
            tweetId,
            username,
            tweetText,
            tweetUrl,
            timeText: '',
            relevanceScore: tweetText.toLowerCase().includes(query.toLowerCase()) ? 2 : 1,
            isFallback: true
          });
          
        } catch (e) {
          console.error('Fallback extraction error:', e);
        }
      });
      
      return tweets;
    }, query);
    
    return results;
  }

  async close() {
    try {
      await this.browserService.close();
      console.log('Search service closed');
    } catch (error) {
      console.error('Failed to close Search service:', error);
      throw error;
    }
  }
}

module.exports = SearchService;