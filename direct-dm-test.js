const PlaywrightDMService = require('./src/services/playwrightDMService.js');

async function directDMTest() {
  const service = new PlaywrightDMService();
  
  try {
    console.log('🚀 启动直接私信测试...');
    
    // 初始化浏览器
    await service.initialize();
    
    // 加载已保存的cookies
    console.log('🍪 加载已保存的cookies...');
    const cookiesLoaded = await service.loadCookies();
    if (cookiesLoaded) {
      console.log('✅ cookies加载成功');
    } else {
      console.log('⚠️ 未找到保存的cookies');
    }
    
    // 直接导航到私信页面
    console.log('💬 导航到私信页面...');
    await service.page.goto('https://x.com/messages', { 
      waitUntil: 'networkidle',
      timeout: 20000 
    });
    
    await service.humanDelay(5000, 8000);
    
    // 拍摄初始状态
    await service.screenshot('direct-dm-initial.png');
    
    // 检查当前URL
    const currentUrl = service.page.url();
    console.log(`🔗 当前URL: ${currentUrl}`);
    
    // 检查页面标题
    const pageTitle = await service.page.title();
    console.log(`📄 页面标题: ${pageTitle}`);
    
    // 详细分析页面结构
    console.log('🔍 分析私信页面结构...');
    
    const pageElements = await service.page.evaluate(() => {
      const results = {
        searchInputs: [],
        buttons: [],
        links: [],
        visibleTexts: []
      };
      
      // 搜索输入框
      const searchInputs = document.querySelectorAll('input, div[contenteditable="true"]');
      searchInputs.forEach(input => {
        if (input.offsetParent !== null) {
          results.searchInputs.push({
            tagName: input.tagName,
            placeholder: input.placeholder,
            contentEditable: input.contentEditable,
            text: input.textContent?.substring(0, 50)
          });
        }
      });
      
      // 按钮
      const buttons = document.querySelectorAll('button, div[role="button"]');
      buttons.forEach(btn => {
        if (btn.offsetParent !== null) {
          results.buttons.push({
            tagName: btn.tagName,
            text: btn.textContent?.trim()?.substring(0, 50),
            ariaLabel: btn.getAttribute('aria-label')
          });
        }
      });
      
      // 链接
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        if (link.offsetParent !== null) {
          results.links.push({
            href: link.href,
            text: link.textContent?.trim()?.substring(0, 30)
          });
        }
      });
      
      // 可见文本（查找搜索相关）
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.offsetParent !== null) {
          const text = el.textContent?.trim();
          if (text && (
            text.toLowerCase().includes('search') ||
            text.toLowerCase().includes('search messages') ||
            text.toLowerCase().includes('new message') ||
            text.toLowerCase().includes('compose')
          )) {
            results.visibleTexts.push({
              tag: el.tagName,
              text: text.substring(0, 100)
            });
          }
        }
      });
      
      return results;
    });
    
    console.log('📋 页面元素分析:');
    console.log(`- 搜索输入框 (${pageElements.searchInputs.length}个):`, pageElements.searchInputs);
    console.log(`- 按钮 (${pageElements.buttons.length}个):`, pageElements.buttons.slice(0, 5));
    console.log(`- 链接 (${pageElements.links.length}个):`, pageElements.links.slice(0, 5));
    console.log(`- 搜索相关文本 (${pageElements.visibleTexts.length}个):`, pageElements.visibleTexts);
    
    // 测试用户搜索功能
    console.log('\n🔍 开始用户搜索测试...');
    
    // 查找搜索框 - 使用更宽泛的选择器
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="搜索"]',
      'div[contenteditable="true"]',
      'textarea',
      'input[type="text"]',
      'input:not([type])'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        const elements = await service.page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible()) {
            const placeholder = await element.getAttribute('placeholder') || '';
            const text = await element.textContent() || '';
            
            if (placeholder.toLowerCase().includes('search') || 
                text.toLowerCase().includes('search') ||
                placeholder.toLowerCase().includes('搜索')) {
              searchInput = element;
              console.log(`✅ 找到搜索框: ${selector}, placeholder: "${placeholder}"`);
              break;
            }
          }
        }
        if (searchInput) break;
      } catch (e) {
        continue;
      }
    }
    
    if (searchInput) {
      // 输入测试用户名
      const testUsername = 'elonmusk';
      console.log(`📝 输入用户名: @${testUsername}`);
      
      await searchInput.click();
      await service.humanDelay(1000, 2000);
      
      await searchInput.fill(`@${testUsername}`);
      await service.humanDelay(3000, 4000);
      
      // 拍摄搜索状态
      await service.screenshot('direct-dm-search.png');
      
      // 等待搜索结果
      console.log('⏳ 等待搜索结果...');
      await service.page.waitForTimeout(5000);
      
      // 分析搜索结果
      const searchResults = await service.page.evaluate(() => {
        const results = [];
        
        // 查找用户相关元素
        const userSelectors = [
          'a[href*="/"]',
          'div[role="button"]',
          'button',
          'div[data-testid*="User"]',
          'div[data-testid*="DM"]'
        ];
        
        userSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.offsetParent !== null) {
              const text = el.textContent?.trim() || '';
              const href = el.href || '';
              
              if (text.includes('@') || href.includes('/')) {
                results.push({
                  selector,
                  text: text.substring(0, 50),
                  href: href,
                  tagName: el.tagName
                });
              }
            }
          });
        });
        
        return results;
      });
      
      console.log('📊 搜索结果分析:');
      searchResults.slice(0, 10).forEach((result, index) => {
        console.log(`${index + 1}. ${result.tagName} - ${result.text} (${result.selector})`);
      });
      
      // 尝试点击第一个可能的用户
      if (searchResults.length > 0) {
        console.log('👆 尝试点击第一个搜索结果...');
        
        const firstResult = searchResults[0];
        try {
          // 使用更可靠的选择器方法
          const elements = await service.page.locator(firstResult.selector).all();
          if (elements.length > 0) {
            await elements[0].click();
            await service.humanDelay(2000, 3000);
            
            // 拍摄点击后状态
            await service.screenshot('direct-dm-after-click.png');
            
            // 检查是否进入聊天页面
            const chatIndicators = [
              'input[placeholder*="Message"]',
              'textarea[placeholder*="Message"]',
              'div[contenteditable="true"][placeholder*="Message"]',
              '[data-testid*="conversation"]',
              '[data-testid*="message"]'
            ];
            
            let foundChat = false;
            for (const indicator of chatIndicators) {
              try {
                const element = await service.page.locator(indicator).first();
                if (await element.isVisible()) {
                  console.log(`✅ 找到聊天界面元素: ${indicator}`);
                  foundChat = true;
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            if (foundChat) {
              console.log('🎉 成功进入聊天页面！');
              
              // 测试发送消息
              console.log('📤 测试发送消息...');
              
              const messageSelectors = [
                'input[placeholder*="Message"]',
                'textarea[placeholder*="Message"]',
                'div[contenteditable="true"]'
              ];
              
              let messageInput = null;
              for (const selector of messageSelectors) {
                try {
                  const element = await service.page.locator(selector).first();
                  if (await element.isVisible()) {
                    messageInput = element;
                    console.log(`✅ 找到消息输入框: ${selector}`);
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
              
              if (messageInput) {
                // 输入测试消息
                await messageInput.fill('Hello! This is a test message.');
                await service.humanDelay(1000, 2000);
                
                // 尝试发送
                await service.page.keyboard.press('Enter');
                await service.humanDelay(2000, 3000);
                
                await service.screenshot('direct-dm-message-sent.png');
                console.log('✅ 消息发送测试完成！');
              }
              
            } else {
              console.log('❌ 未找到聊天界面特征，尝试寻找发送按钮...');
              
              // 寻找发送按钮
              const sendButtonSelectors = [
                'button[data-testid*="send"]',
                'button:has-text("Send")',
                'button:has-text("发送")',
                'div[role="button"]:has-text("Send")'
              ];
              
              let foundSendButton = false;
              for (const selector of sendButtonSelectors) {
                try {
                  const button = await service.page.locator(selector).first();
                  if (await button.isVisible()) {
                    console.log(`✅ 找到发送按钮: ${selector}`);
                    await button.click();
                    await service.humanDelay(2000, 3000);
                    
                    await service.screenshot('direct-dm-send-button.png');
                    foundSendButton = true;
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
              
              if (foundSendButton) {
                console.log('✅ 点击发送按钮成功');
              }
            }
          }
        } catch (error) {
          console.log(`❌ 点击失败: ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ 未找到搜索框');
      
      // 尝试寻找"新建消息"按钮
      console.log('🔍 寻找新建消息按钮...');
      
      const newMessageSelectors = [
        'button:has-text("New message")',
        'button:has-text("New Chat")',
        'button:has-text("新建消息")',
        'button:has-text("Compose")',
        'div[role="button"]:has-text("New")',
        '[data-testid*="compose"]'
      ];
      
      for (const selector of newMessageSelectors) {
        try {
          const button = await service.page.locator(selector).first();
          if (await button.isVisible()) {
            console.log(`✅ 找到新建消息按钮: ${selector}`);
            await button.click();
            await service.humanDelay(2000, 3000);
            
            await service.screenshot('direct-dm-new-message.png');
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    console.log('\n🎯 直接私信测试完成！');
    
  } catch (error) {
    console.error('❌ 直接私信测试失败:', error);
    await service.screenshot('direct-dm-error.png');
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

// 运行直接测试
if (require.main === module) {
  directDMTest().catch(console.error);
}

module.exports = { directDMTest };