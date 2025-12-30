#!/usr/bin/env node

/**
 * 搜索测试 - 不使用自动滚动，直接提取可见内容
 */

const BrowserService = require('./src/services/browserService');

async function searchNoScroll() {
  console.log('🔍 搜索测试 (无滚动): "AI native"');
  console.log('=' * 50);

  let browserService;
  
  try {
    console.log('🚀 初始化浏览器...');
    browserService = new BrowserService();
    await browserService.initialize();
    console.log('✅ 浏览器初始化成功');
    
    // 注入cookies
    console.log('🍪 注入cookies...');
    await browserService.injectCookies('https://x.com');
    
    // 搜索 "AI native"
    const searchQuery = 'AI native';
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(searchQuery)}&src=typed_query&f=live`;
    
    console.log(`🔎 搜索: "${searchQuery}"`);
    console.log(`🌐 导航到搜索页面...`);
    
    // 导航到搜索页面 - 增加超时时间
    await browserService.page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // 等待页面加载
    console.log('⏳ 等待页面加载 (8秒)...');
    await browserService.humanDelay(8000, 8000);
    
    // 不使用自动滚动，只等待页面自然加载
    console.log('⏳ 等待内容自然加载...');
    await browserService.humanDelay(5000, 5000);
    
    // 立即提取搜索结果
    console.log('📊 提取可见的搜索结果...');
    const results = await browserService.page.evaluate((query) => {
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
      
      console.log(`找到 ${tweetElements.length} 个tweet元素`);
      
      tweetElements.forEach((tweetElement, index) => {
        try {
          // 获取推文文本
          const textElement = tweetElement.querySelector('[lang]');
          if (!textElement) return;
          
          const tweetText = textElement.textContent.trim();
          
          // 检查是否包含搜索关键词或相关关键词
          const keywords = ['ai', 'native', 'artificial', 'intelligence'];
          const isRelevant = keywords.some(keyword => 
            tweetText.toLowerCase().includes(keyword)
          );
          
          if (!isRelevant) return; // 只保留相关结果
          
          // 获取推文链接
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
          
          // 获取时间
          let timeText = '';
          const timeElement = tweetElement.querySelector('time, [datetime]');
          if (timeElement) {
            timeText = timeElement.textContent || timeElement.getAttribute('datetime') || '';
          }
          
          tweets.push({
            tweetId,
            username,
            tweetText,
            tweetUrl,
            timeText,
            relevanceScore: tweetText.toLowerCase().includes(query.toLowerCase()) ? 2 : 1
          });
          
        } catch (e) {
          console.error('提取tweet时出错:', e);
        }
      });
      
      return tweets;
    }, searchQuery);
    
    if (results.length === 0) {
      console.log('❌ 没有找到相关的tweets');
      
      // 检查页面状态
      const pageStatus = await browserService.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyText: document.body.textContent.substring(0, 200),
          hasLoginButton: !!document.querySelector('a[href*="/login"], button[data-testid="loginButton"]'),
          hasSearchBox: !!document.querySelector('input[placeholder*="search" i], [data-testid="SearchBox_Input"]')
        };
      });
      
      console.log('📋 页面状态检查:');
      console.log(`   标题: ${pageStatus.title}`);
      console.log(`   URL: ${pageStatus.url}`);
      console.log(`   有登录按钮: ${pageStatus.hasLoginButton ? '是' : '否'}`);
      console.log(`   有搜索框: ${pageStatus.hasSearchBox ? '是' : '否'}`);
      console.log(`   页面内容: ${pageStatus.bodyText}...`);
      
    } else {
      console.log(`✅ 找到 ${results.length} 条相关tweets`);
      console.log('');
      
      // 显示前5条结果
      const top5Results = results.slice(0, 5);
      
      console.log('🎯 AI Native 搜索结果总结:');
      console.log('=' * 40);
      
      top5Results.forEach((tweet, index) => {
        console.log(`📱 结果 ${index + 1}:`);
        console.log(`   👤 用户: @${tweet.username}`);
        console.log(`   📝 内容: ${tweet.tweetText.substring(0, 150)}${tweet.tweetText.length > 150 ? '...' : ''}`);
        console.log(`   ⏰ 时间: ${tweet.timeText}`);
        console.log(`   🔗 链接: ${tweet.tweetUrl}`);
        console.log('');
      });
      
      console.log('📊 搜索总结:');
      console.log(`   总相关结果: ${results.length}`);
      console.log(`   显示前5条: ${top5Results.length}`);
      
      return top5Results;
    }
    
  } catch (error) {
    console.error('❌ 搜索过程中出现错误:', error);
  } finally {
    if (browserService) {
      await browserService.close();
      console.log('🧹 浏览器关闭');
    }
  }
  
  console.log('🎉 搜索完成');
}

searchNoScroll().catch(console.error);