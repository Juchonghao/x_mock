#!/usr/bin/env node

require('dotenv').config();

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 直接检查与特定用户的私信对话
 */
async function testDirectConversationCheck() {
  console.log('🔍 开始直接检查与特定用户的私信对话');
  console.log('🎯 检查与 @allen180929 和 @Alex09936200 的对话');
  console.log('=' .repeat(70));

  const targetUsers = ['allen180929', 'Alex09936200'];
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

    // 创建会话目录
    const sessionDir = './sessions';
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // 逐个检查每个目标用户
    for (const username of targetUsers) {
      console.log(`\n--- 检查与 @${username} 的对话 ---`);
      
      try {
        // 直接访问与该用户的私信页面
        console.log(`🔗 访问与 @${username} 的私信对话...`);
        await page.goto(`https://x.com/i/messages/${username}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 拍摄页面截图
        await page.screenshot({ 
          path: path.join(sessionDir, `direct-conversation-${username}.png`), 
          fullPage: true 
        });

        // 检查页面状态
        const currentUrl = await page.url();
        console.log(`当前URL: ${currentUrl}`);
        
        // 检查页面内容
        const pageContent = await page.content();
        
        // 检查是否成功进入对话
        if (currentUrl.includes(`/messages/${username}`)) {
          console.log(`✅ 成功进入与 @${username} 的私信对话`);
          
          // 查找消息内容
          const messageSelectors = [
            'div[lang]', // 消息文本通常有lang属性
            'span[data-testid="tweetText"]',
            'article',
            'div[data-testid="cellInnerDiv"]',
            '[data-testid="tweetText"]',
            'div[role="group"] div[role="button"]'
          ];
          
          let messagesFound = false;
          for (const selector of messageSelectors) {
            try {
              const messageElements = await page.$$(selector);
              console.log(`找到 ${messageElements.length} 个可能的消息元素使用选择器: ${selector}`);
              
              for (let i = 0; i < messageElements.length; i++) {
                try {
                  const msgElement = messageElements[i];
                  const msgText = await page.evaluate(el => el.textContent, msgElement);
                  
                  if (msgText && msgText.length > 0) {
                    // 检查是否包含我们发送的消息内容
                    if (msgText.includes('X自动化机器人') || msgText.includes('测试私信') || msgText.includes('这是一条来自')) {
                      console.log(`✅ 找到我们发送的消息给 @${username}: ${msgText.substring(0, 100)}...`);
                      messagesFound = true;
                    } else {
                      console.log(`💬 其他消息内容: ${msgText.substring(0, 100)}...`);
                    }
                  }
                } catch (e) {
                  continue;
                }
              }
              
              if (messagesFound) {
                break; // 找到消息后退出
              }
            } catch (e) {
              console.log(`使用选择器 "${selector}" 查找消息时出错:`, e.message);
              continue;
            }
          }
          
          if (!messagesFound) {
            console.log(`⚠️ 未在与 @${username} 的对话中找到我们发送的消息`);
            
            // 检查整个页面内容中是否包含我们的消息
            const ourMessageContent = [
              'X自动化机器人',
              '测试私信', 
              '这是一条来自',
              '来自X自动化机器人的测试私信'
            ];
            
            for (const content of ourMessageContent) {
              if (pageContent.includes(content)) {
                console.log(`✅ 在页面内容中找到我们的消息片段: "${content}"`);
                messagesFound = true;
                break;
              }
            }
            
            if (!messagesFound) {
              console.log(`ℹ️ 页面内容摘要 (前500字符): ${pageContent.substring(0, 500)}...`);
            }
          }
        } else {
          console.log(`❌ 未成功进入与 @${username} 的私信对话`);
          console.log(`💡 可能原因:`);
          console.log(`   - 用户不存在`);
          console.log(`   - 用户隐私设置限制`);
          console.log(`   - 需要额外验证`);
          console.log(`   - 消息在请求文件夹中`);
        }
        
      } catch (error) {
        console.error(`❌ 检查与 @${username} 的对话时出错:`, error.message);
      }
    }
    
    // 现在检查私信主页面，看看是否有请求或过滤的消息
    console.log('\n--- 检查私信主页面是否有请求消息 ---');
    
    await page.goto('https://x.com/i/messages', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 拍摄私信主页面截图
    await page.screenshot({ 
      path: path.join(sessionDir, 'messages-main-page.png'), 
      fullPage: true 
    });
    
    // 查找可能的标签或过滤器
    const filterSelectors = [
      'a[href*="/messages/requests"]',
      'a[href*="/messages/inbox"]',
      'div[role="tab"]',
      'nav a',
      'div[aria-label*="filter"]',
      'button[aria-label*="filter"]'
    ];
    
    console.log('🔍 查找消息过滤器或标签...');
    
    for (const selector of filterSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`找到 ${elements.length} 个过滤器元素使用选择器: ${selector}`);
        
        for (const element of elements) {
          try {
            const textContent = await page.evaluate(el => el.textContent, element);
            const href = await page.evaluate(el => el.getAttribute('href'), element);
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), element);
            
            console.log(`  - 文本: "${textContent}", 链接: "${href}", ARIA标签: "${ariaLabel}"`);
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.log(`使用选择器 "${selector}" 时出错:`, e.message);
        continue;
      }
    }
    
    // 检查是否有"请求"或"Requests"链接
    try {
      const requestsLink = await page.$('a:has-text("Requests"), a:has-text("requests"), a:has-text("请求")');
      if (requestsLink) {
        console.log('✅ 找到"请求"链接，这可能是消息所在的位置');
        const requestsHref = await page.evaluate(el => el.getAttribute('href'), requestsLink);
        console.log(`请求页面链接: ${requestsHref}`);
      }
    } catch (e) {
      console.log('未找到"请求"链接');
    }

    console.log('\n✅ 直接对话检查完成');
    console.log('💡 请查看截图文件以了解与目标用户的私信状态');

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
testDirectConversationCheck().then(() => {
  console.log('\n🏁 直接对话检查脚本执行完毕');
  process.exit(0);
}).catch(error => {
  console.error('❌ 检查脚本执行失败:', error);
  process.exit(1);
});