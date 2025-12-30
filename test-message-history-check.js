#!/usr/bin/env node

require('dotenv').config();

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 检查私信历史记录，验证消息是否真正发送成功
 */
async function testMessageHistoryCheck() {
  console.log('🔍 开始检查私信历史记录');
  console.log('🎯 验证已发送的私信是否出现在历史记录中');
  console.log('=' .repeat(70));

  let browser, page;

  try {
    // 启动浏览器
    console.log('📡 启动浏览器...');
    browser = await puppeteer.launch({ 
      headless: false, // 设置为false以便观察
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ]
    });
    
    page = await browser.newPage();
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('✅ 浏览器启动成功');

    // 从环境变量获取cookies
    const cookiesString = process.env.TWITTER_COOKIES;
    if (!cookiesString) {
      console.log('❌ 未配置TWITTER_COOKIES，请检查.env文件');
      return;
    }

    // 解析并设置cookies
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('🍪 Cookies设置完成');

    // 访问Twitter私信页面
    console.log('💬 访问私信页面...');
    await page.goto('https://x.com/i/messages', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ 成功访问私信页面');

    // 创建会话目录
    const sessionDir = './sessions';
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // 拍摄私信页面截图
    await page.screenshot({ 
      path: path.join(sessionDir, 'message-history-check.png'), 
      fullPage: true 
    });

    // 查找最近的对话
    console.log('🔍 查找最近的对话...');
    
    // 多种选择器尝试找到对话列表
    const conversationSelectors = [
      'div[data-testid="conversation"]',
      'div[aria-label="Timeline: Direct message conversations"] div[role="button"]',
      '[data-testid="CellInnerDiv"]',
      'div[role="button"]',
      'div[data-testid="conversation"]'
    ];
    
    let conversationsFound = false;
    
    for (const selector of conversationSelectors) {
      try {
        const conversations = await page.$$(selector);
        console.log(`找到 ${conversations.length} 个元素使用选择器: ${selector}`);
        
        if (conversations.length > 0) {
          conversationsFound = true;
          
          for (let i = 0; i < Math.min(conversations.length, 5); i++) { // 只检查前5个
            try {
              const conversation = conversations[i];
              const textContent = await page.evaluate(el => el.textContent, conversation);
              console.log(`对话 ${i + 1}: ${textContent.substring(0, 100)}...`); // 只显示前100个字符
              
              // 检查是否包含目标用户的对话
              if (textContent.includes('allen180929') || textContent.includes('Alex09936200')) {
                console.log(`✅ 找到与目标用户的对话: ${textContent.substring(0, 50)}...`);
              }
            } catch (e) {
              console.log(`获取对话 ${i + 1} 内容时出错:`, e.message);
              continue;
            }
          }
          break; // 找到对话后退出循环
        }
      } catch (e) {
        console.log(`使用选择器 "${selector}" 查找对话时出错:`, e.message);
        continue;
      }
    }
    
    if (!conversationsFound) {
      console.log('⚠️ 未找到任何对话元素，尝试其他方法...');
      
      // 尝试查找最近的消息
      const messageSelectors = [
        'article[data-testid="conversation"]',
        '[data-testid="cellInnerDiv"]',
        'div[aria-label*="Conversation"]',
        'div[role="link"]',
        'div[role="button"]'
      ];
      
      for (const selector of messageSelectors) {
        try {
          const elements = await page.$$(selector);
          console.log(`使用 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (let i = 0; i < Math.min(elements.length, 3); i++) {
            try {
              const element = elements[i];
              const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), element);
              const textContent = await page.evaluate(el => el.textContent, element);
              
              console.log(`元素 ${i + 1} - aria-label: ${ariaLabel}`);
              console.log(`元素 ${i + 1} - 文本内容: ${textContent.substring(0, 100)}...`);
            } catch (e) {
              console.log(`获取元素 ${i + 1} 信息时出错:`, e.message);
              continue;
            }
          }
          break;
        } catch (e) {
          console.log(`使用选择器 "${selector}" 时出错:`, e.message);
          continue;
        }
      }
    }
    
    // 检查页面内容
    const pageContent = await page.content();
    console.log('\n📋 页面内容摘要:');
    
    // 搜索与目标用户相关的部分
    const targetUsers = ['allen180929', 'Alex09936200', 'kent236896', 'fred_0201'];
    
    for (const user of targetUsers) {
      const regex = new RegExp(`${user}[^]{0,200}`, 'i'); // 查找用户名称后200个字符
      const matches = pageContent.match(regex);
      if (matches) {
        console.log(`✅ 找到与 @${user} 相关的内容: ${matches[0].substring(0, 150)}...`);
      } else {
        console.log(`ℹ️ 未在页面中找到 @${user} 的直接引用`);
      }
    }
    
    // 检查是否有关于"未读消息"或"新消息"的指示
    const unreadIndicators = [
      'unread',
      'Unread', 
      'new',
      'New',
      'message',
      'Message',
      '私信',
      'DM',
      'dm'
    ];
    
    console.log('\n🔍 检查未读消息指示器...');
    for (const indicator of unreadIndicators) {
      if (pageContent.toLowerCase().includes(indicator.toLowerCase())) {
        console.log(`✅ 找到 "${indicator}" 相关内容`);
      }
    }
    
    // 尝试点击进入特定对话（如果找到）
    console.log('\n🎯 尝试查看与特定用户的对话...');
    
    const targetUserSelectors = [
      `[href*="/messages/${encodeURIComponent('allen180929')}"]`,
      `[href*="/messages/${encodeURIComponent('Alex09936200')}"]`,
      `[aria-label*="allen180929"]`,
      `[aria-label*="Alex09936200"]`,
      `:text("allen180929")`,
      `:text("Alex09936200")`
    ];
    
    for (const selector of targetUserSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ 找到 @${selector.includes('allen180929') ? 'allen180929' : 'Alex09936200'} 的对话链接`);
          
          // 点击进入对话
          await element.click();
          console.log(`💬 点击进入对话...`);
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 拍摄对话页面截图
          await page.screenshot({ 
            path: path.join(sessionDir, `conversation-detail-check.png`), 
            fullPage: true 
          });
          
          // 检查对话页面内容
          const conversationContent = await page.content();
          console.log('📋 对话页面内容摘要:');
          console.log(conversationContent.substring(0, 500) + '...');
          
          // 查找消息内容
          const messageContentSelectors = [
            'div[lang]', // 消息文本通常有lang属性
            'span[data-testid="tweetText"]',
            'div[role="group"] div[role="button"]', 
            '[data-testid="cellInnerDiv"]'
          ];
          
          for (const msgSelector of messageContentSelectors) {
            try {
              const messageElements = await page.$$(msgSelector);
              console.log(`在对话中找到 ${messageElements.length} 个消息元素`);
              
              for (let j = 0; j < messageElements.length; j++) {
                try {
                  const msgElement = messageElements[j];
                  const msgText = await page.evaluate(el => el.textContent, msgElement);
                  if (msgText && msgText.length > 0) {
                    console.log(`消息 ${j + 1}: ${msgText.substring(0, 100)}...`);
                  }
                } catch (e) {
                  continue;
                }
              }
              break; // 找到消息后退出
            } catch (e) {
              continue;
            }
          }
          
          // 返回到消息列表
          await page.goBack();
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        }
      } catch (e) {
        console.log(`尝试使用选择器 "${selector}" 时出错:`, e.message);
        continue;
      }
    }
    
    console.log('\n✅ 私信历史记录检查完成');
    console.log('💡 请检查截图文件以查看私信历史记录状态');

  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    if (browser) {
      await browser.close();
      console.log('✅ 浏览器已关闭');
    }
    console.log('✅ 检查完成');
  }
}

// 运行检查
testMessageHistoryCheck().then(() => {
  console.log('\n🏁 私信历史记录检查脚本执行完毕');
  process.exit(0);
}).catch(error => {
  console.error('❌ 检查脚本执行失败:', error);
  process.exit(1);
});