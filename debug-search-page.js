#!/usr/bin/env node

/**
 * 调试搜索页面结构的脚本
 */

const BrowserService = require('./src/services/browserService');

async function debugSearchPage() {
  console.log('🔍 调试搜索页面结构');
  console.log('=' * 50);

  let browserService;
  
  try {
    // 初始化浏览器服务
    console.log('🚀 初始化浏览器服务...');
    browserService = new BrowserService();
    await browserService.initialize();
    console.log('✅ 浏览器初始化成功');
    console.log('');

    // 导航到搜索页面
    const searchQuery = 'AI native';
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(searchQuery)}&src=typed_query&f=live`;
    console.log(`🌐 导航到: ${searchUrl}`);
    
    await browserService.page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await browserService.humanDelay(5000, 8000);
    
    console.log('📜 滚动页面加载更多内容...');
    await browserService.scrollToBottom();
    await browserService.humanDelay(3000, 5000);
    await browserService.scrollToBottom();
    await browserService.humanDelay(3000, 5000);
    await browserService.scrollToBottom();
    
    // 分析页面结构
    console.log('🔍 分析页面结构...');
    
    const pageAnalysis = await browserService.page.evaluate(() => {
      const analysis = {};
      
      // 检查基本页面元素
      analysis.pageTitle = document.title;
      analysis.currentUrl = window.location.href;
      analysis.hasLoginButton = !!document.querySelector('a[href*="/login"], button[data-testid="loginButton"]');
      analysis.hasTweetElements = !!document.querySelector('[data-testid="tweet"], [role="article"]');
      
      // 尝试多种选择器
      const selectors = [
        '[data-testid="tweet"]',
        '[role="article"]',
        'article[data-testid="tweet"]',
        'div[data-testid="tweet"]',
        '[data-testid="cellInnerDiv"]'
      ];
      
      analysis.selectorResults = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        analysis.selectorResults[selector] = elements.length;
      });
      
      // 获取页面文本内容样本
      const bodyText = document.body.textContent;
      analysis.bodyTextSample = bodyText.substring(0, 500);
      analysis.hasAiNativeContent = bodyText.toLowerCase().includes('ai') && bodyText.toLowerCase().includes('native');
      
      // 检查是否有错误信息
      analysis.errorMessages = [];
      const errorElements = document.querySelectorAll('[role="alert"], .error, .alert');
      errorElements.forEach(el => {
        analysis.errorMessages.push(el.textContent.trim());
      });
      
      // 检查网络状态
      analysis.readyState = document.readyState;
      
      return analysis;
    });
    
    console.log('📊 页面分析结果:');
    console.log(`   页面标题: ${pageAnalysis.pageTitle}`);
    console.log(`   当前URL: ${pageAnalysis.currentUrl}`);
    console.log(`   需要登录: ${pageAnalysis.hasLoginButton ? '是' : '否'}`);
    console.log(`   有tweet元素: ${pageAnalysis.hasTweetElements ? '是' : '否'}`);
    console.log('');
    
    console.log('🔍 选择器匹配结果:');
    Object.entries(pageAnalysis.selectorResults).forEach(([selector, count]) => {
      console.log(`   ${selector}: ${count} 个元素`);
    });
    console.log('');
    
    console.log('📝 页面内容样本:');
    console.log(`   ${pageAnalysis.bodyTextSample}...`);
    console.log('');
    
    console.log(`🤖 包含AI Native内容: ${pageAnalysis.hasAiNativeContent ? '是' : '否'}`);
    console.log(`⚠️ 错误信息: ${pageAnalysis.errorMessages.length > 0 ? pageAnalysis.errorMessages.join(', ') : '无'}`);
    console.log(`📡 页面状态: ${pageAnalysis.readyState}`);
    
  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
  } finally {
    if (browserService) {
      await browserService.close();
      console.log('🧹 浏览器服务关闭');
    }
  }
  
  console.log('🎉 调试完成');
}

debugSearchPage().catch(console.error);