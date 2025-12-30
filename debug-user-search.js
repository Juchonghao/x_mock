const PlaywrightDMService = require('./src/services/playwrightDMService.js');
const config = require('./src/config');

async function debugUserSearch() {
  const service = new PlaywrightDMService();
  
  try {
    console.log('🚀 启动用户搜索调试...');
    
    await service.initialize();
    
    // 登录状态检查
    const isLoggedIn = await service.checkLoginStatus();
    if (!isLoggedIn) {
      console.log('❌ 未登录，请先登录');
      return;
    }
    
    console.log('✅ 已登录，开始导航到私信页面...');
    
    // 导航到私信页面
    await service.page.goto('https://x.com/messages', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    await service.humanDelay(3000, 4000);
    
    // 拍摄私信页面初始状态
    await service.screenshot('debug-dm-initial.png');
    
    // 获取页面内容，分析私信页面结构
    console.log('📋 分析私信页面结构...');
    
    // 检查页面标题
    const pageTitle = await service.page.title();
    console.log(`📄 页面标题: ${pageTitle}`);
    
    // 检查当前URL
    const currentUrl = service.page.url();
    console.log(`🔗 当前URL: ${currentUrl}`);
    
    // 检查页面上的关键元素
    const elements = await service.page.evaluate(() => {
      const results = {};
      
      // 搜索框相关
      results.searchInputs = Array.from(document.querySelectorAll('input')).map(input => ({
        type: input.type,
        placeholder: input.placeholder,
        id: input.id,
        className: input.className,
        visible: input.offsetParent !== null
      }));
      
      // 可编辑区域
      results.contentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]')).map(div => ({
        placeholder: div.placeholder,
        textContent: div.textContent?.substring(0, 50),
        className: div.className,
        visible: div.offsetParent !== null
      }));
      
      // 按钮
      results.buttons = Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.substring(0, 50),
        ariaLabel: btn.ariaLabel,
        className: btn.className,
        visible: btn.offsetParent !== null
      }));
      
      // 链接
      results.links = Array.from(document.querySelectorAll('a')).map(link => ({
        href: link.href,
        text: link.textContent?.substring(0, 30),
        className: link.className,
        visible: link.offsetParent !== null
      })).slice(0, 10); // 限制数量
      
      // 特定数据测试ID
      results.dataTestIds = Array.from(document.querySelectorAll('[data-testid]')).map(el => ({
        testId: el.getAttribute('data-testid'),
        tagName: el.tagName,
        text: el.textContent?.substring(0, 30),
        visible: el.offsetParent !== null
      }));
      
      return results;
    });
    
    console.log('🔍 页面元素分析结果:');
    console.log('📋 搜索输入框:', elements.searchInputs.filter(i => i.visible));
    console.log('📝 可编辑区域:', elements.contentEditables.filter(i => i.visible));
    console.log('🔘 可见按钮:', elements.buttons.filter(b => b.visible));
    console.log('🔗 前10个链接:', elements.links.filter(l => l.visible));
    console.log('🏷️ 数据测试ID:', elements.dataTestIds.filter(i => i.visible));
    
    // 测试搜索功能
    const testUsername = '@elonmusk'; // 您可以选择其他用户进行测试
    console.log(`\n🔍 开始测试搜索用户: ${testUsername}`);
    
    // 尝试多种搜索框选择器
    const searchSelectors = [
      'input[placeholder*="Search messages"]',
      'input[placeholder*="搜索私信"]',
      'input[placeholder*="Search"]',
      'div[contenteditable="true"][placeholder*="Search"]',
      'div[contenteditable="true"][placeholder*="搜索"]',
      'input[data-testid="SearchBox_Search_Input"]',
      'div[data-testid="SearchBox_Search_Input"]'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        const input = await service.page.locator(selector).first();
        if (await input.isVisible()) {
          searchInput = input;
          console.log(`✅ 找到搜索框: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ 选择器 ${selector} 未找到`);
      }
    }
    
    if (searchInput) {
      console.log('📝 正在输入搜索内容...');
      await searchInput.click();
      await service.humanDelay(1000, 2000);
      await searchInput.fill(testUsername);
      await service.humanDelay(3000, 4000);
      
      // 拍摄搜索状态截图
      await service.screenshot('debug-search-state.png');
      
      // 检查搜索结果
      console.log('🔍 检查搜索结果...');
      
      // 获取搜索结果元素
      const searchResults = await service.page.evaluate(() => {
        const results = [];
        
        // 搜索用户相关的选择器
        const userSelectors = [
          '[data-testid*="User"]',
          '[data-testid*="user"]',
          '[data-testid*="DM"]',
          'a[href*="/"]',
          'div[role="button"]'
        ];
        
        userSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.offsetParent !== null) { // 可见元素
              results.push({
                selector,
                tagName: el.tagName,
                text: el.textContent?.substring(0, 50),
                href: el.href,
                className: el.className
              });
            }
          });
        });
        
        return results;
      });
      
      console.log('📊 搜索结果分析:');
      searchResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.selector} - ${result.text}`);
      });
      
      // 尝试点击第一个可能的用户
      if (searchResults.length > 0) {
        console.log('👆 尝试点击第一个搜索结果...');
        const firstResult = searchResults[0];
        
        try {
          await service.page.locator(firstResult.selector).first().click();
          await service.humanDelay(2000, 3000);
          
          // 拍摄点击后的状态
          await service.screenshot('debug-after-click.png');
          
          // 验证是否进入聊天页面
          const currentUrlAfter = service.page.url();
          console.log(`🔗 点击后的URL: ${currentUrlAfter}`);
          
          // 检查聊天页面特征
          const chatFeatures = await service.page.evaluate(() => {
            return {
              hasMessageInput: !!document.querySelector('input[placeholder*="Message"]') || 
                             !!document.querySelector('textarea[placeholder*="Message"]') ||
                             !!document.querySelector('[contenteditable="true"][placeholder*="Message"]'),
              hasConversationHeader: !!document.querySelector('[data-testid*="conversation"]') ||
                                   !!document.querySelector('[data-testid*="header"]'),
              hasSendButton: !!document.querySelector('button[data-testid*="send"]') ||
                            !!document.querySelector('button:has-text("Send")') ||
                            !!document.querySelector('button:has-text("发送")')
            };
          });
          
          console.log('💬 聊天页面特征:', chatFeatures);
          
          if (chatFeatures.hasMessageInput) {
            console.log('✅ 成功进入聊天页面！');
          } else {
            console.log('❌ 未检测到聊天页面特征');
          }
          
        } catch (error) {
          console.log(`❌ 点击失败: ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ 未找到搜索框');
    }
    
    console.log('\n🎯 调试完成！');
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
    await service.screenshot('debug-error.png');
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

// 运行调试
if (require.main === module) {
  debugUserSearch().catch(console.error);
}

module.exports = { debugUserSearch };