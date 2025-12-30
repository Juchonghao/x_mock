const PlaywrightDMService = require('./src/services/playwrightDMService.js');

async function detailedDMFunctionTest() {
  const service = new PlaywrightDMService();
  
  try {
    console.log('🚀 启动详细私信功能测试...');
    
    await service.initialize();
    
    // 加载cookies
    console.log('🍪 加载已保存的cookies...');
    const cookiesLoaded = await service.loadCookies();
    if (cookiesLoaded) {
      console.log('✅ cookies加载成功');
    }
    
    // 导航到私信页面
    console.log('💬 导航到私信页面...');
    await service.page.goto('https://x.com/messages', { 
      waitUntil: 'networkidle',
      timeout: 20000 
    });
    
    await service.humanDelay(3000, 5000);
    
    // 拍摄初始状态
    await service.screenshot('detailed-dm-initial.png');
    
    console.log('🔍 分析私信页面结构...');
    
    // 查找关键元素
    const elements = await service.page.evaluate(() => {
      const results = {
        searchBoxes: [],
        newChatButtons: [],
        conversationItems: [],
        allButtons: []
      };
      
      // 搜索框
      const inputs = document.querySelectorAll('input, div[contenteditable="true"]');
      inputs.forEach(input => {
        if (input.offsetParent !== null) {
          results.searchBoxes.push({
            tagName: input.tagName,
            placeholder: input.placeholder,
            id: input.id,
            className: input.className
          });
        }
      });
      
      // 新聊天按钮
      const buttons = document.querySelectorAll('button, div[role="button"]');
      buttons.forEach(btn => {
        if (btn.offsetParent !== null) {
          const text = btn.textContent?.trim() || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          
          results.allButtons.push({
            tagName: btn.tagName,
            text: text.substring(0, 50),
            ariaLabel: ariaLabel,
            className: btn.className
          });
          
          if (text.toLowerCase().includes('new') || 
              text.toLowerCase().includes('start') ||
              text.toLowerCase().includes('chat') ||
              text.toLowerCase().includes('message') ||
              ariaLabel.toLowerCase().includes('new') ||
              ariaLabel.toLowerCase().includes('start')) {
            results.newChatButtons.push({
              tagName: btn.tagName,
              text: text.substring(0, 50),
              ariaLabel: ariaLabel
            });
          }
        }
      });
      
      // 对话项目
      const conversationSelectors = [
        '[data-testid*="DM"]',
        '[data-testid*="Message"]',
        '[data-testid*="Thread"]',
        'a[href*="/messages/"]'
      ];
      
      conversationSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) {
            results.conversationItems.push({
              selector: selector,
              text: el.textContent?.trim()?.substring(0, 30),
              href: el.href || ''
            });
          }
        });
      });
      
      return results;
    });
    
    console.log('📊 页面元素分析:');
    console.log(`- 搜索框 (${elements.searchBoxes.length}个):`, elements.searchBoxes);
    console.log(`- 新聊天按钮 (${elements.newChatButtons.length}个):`, elements.newChatButtons);
    console.log(`- 对话项目 (${elements.conversationItems.length}个):`, elements.conversationItems);
    console.log(`- 所有按钮 (${elements.allButtons.length}个):`, elements.allButtons.slice(0, 10));
    
    // 测试用户搜索功能
    console.log('\n🔍 测试用户搜索功能...');
    
    // 查找搜索框
    let searchInput = null;
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="搜索"]',
      'div[contenteditable="true"]'
    ];
    
    for (const selector of searchSelectors) {
      try {
        const inputs = await service.page.locator(selector).all();
        for (const input of inputs) {
          if (await input.isVisible()) {
            const placeholder = await input.getAttribute('placeholder') || '';
            const text = await input.textContent() || '';
            
            if (placeholder.toLowerCase().includes('search') || 
                text.toLowerCase().includes('search') ||
                placeholder.toLowerCase().includes('搜索')) {
              searchInput = input;
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
      
      await service.screenshot('detailed-dm-search.png');
      
      // 查找搜索结果
      console.log('🔍 查找搜索结果...');
      const searchResults = await service.page.evaluate(() => {
        const results = [];
        
        const selectors = [
          'a[href*="/"]',
          'div[role="button"]',
          'div[data-testid*="User"]',
          'div[data-testid*="Typeahead"]'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.offsetParent !== null) {
              const text = el.textContent?.trim() || '';
              const href = el.href || '';
              
              if (text.includes('@') || text.toLowerCase().includes('elonmusk') || href.includes('elonmusk')) {
                results.push({
                  selector,
                  text: text.substring(0, 50),
                  href: href
                });
              }
            }
          });
        });
        
        return results;
      });
      
      console.log('📋 搜索结果:', searchResults);
      
      if (searchResults.length > 0) {
        // 点击第一个结果
        console.log('👆 点击第一个搜索结果...');
        const firstResult = searchResults[0];
        
        try {
          await service.page.locator(firstResult.selector).first().click();
          await service.humanDelay(2000, 3000);
          
          await service.screenshot('detailed-dm-after-click.png');
          
          // 验证是否进入聊天页面
          const isInChat = await service.verifyInDirectMessage();
          if (isInChat) {
            console.log('✅ 成功进入聊天页面！');
          } else {
            console.log('⚠️ 未进入聊天页面，尝试寻找发送按钮...');
            
            const sendButtonFound = await service.findAndClickSendMessageButton();
            if (sendButtonFound) {
              await service.humanDelay(2000, 3000);
              const isInChat2 = await service.verifyInDirectMessage();
              if (isInChat2) {
                console.log('✅ 通过发送按钮进入聊天页面！');
              }
            }
          }
          
        } catch (error) {
          console.log(`❌ 点击失败: ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ 未找到搜索框，尝试寻找新建聊天按钮...');
      
      // 尝试点击新建聊天按钮
      if (elements.newChatButtons.length > 0) {
        const newChatButton = elements.newChatButtons[0];
        console.log(`🆕 点击新建聊天按钮: ${newChatButton.text}`);
        
        try {
          await service.page.locator('button, div[role="button"]').filter({ 
            hasText: new RegExp(newChatButton.text, 'i') 
          }).first().click();
          
          await service.humanDelay(3000, 5000);
          await service.screenshot('detailed-dm-new-chat.png');
          
          // 在新页面中查找搜索框
          console.log('🔍 在新页面中查找搜索框...');
          
          // 等待搜索页面加载
          await service.page.waitForTimeout(5000);
          
          const newSearchResults = await service.page.evaluate(() => {
            const results = [];
            const inputs = document.querySelectorAll('input, div[contenteditable="true"]');
            inputs.forEach(input => {
              if (input.offsetParent !== null) {
                results.push({
                  tagName: input.tagName,
                  placeholder: input.placeholder,
                  text: input.textContent?.substring(0, 50)
                });
              }
            });
            return results;
          });
          
          console.log('📋 新页面搜索框:', newSearchResults);
          
        } catch (error) {
          console.log(`❌ 点击新建聊天按钮失败: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎯 详细私信功能测试完成！');
    
  } catch (error) {
    console.error('❌ 详细私信功能测试失败:', error);
    await service.screenshot('detailed-dm-error.png');
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

// 运行详细测试
if (require.main === module) {
  detailedDMFunctionTest().catch(console.error);
}

module.exports = { detailedDMFunctionTest };