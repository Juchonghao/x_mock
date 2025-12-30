const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 从cookies目录读取cookies
const cookiesDir = path.join(__dirname, 'cookies');
let cookies = [];

// 尝试从cookies目录读取cookies
const cookieFiles = [
  path.join(cookiesDir, 'x.com_cookies.json'),
  path.join(cookiesDir, 'x_cookies.json'),
  path.join(__dirname, 'cookies.json')
];

for (const cookieFile of cookieFiles) {
  if (fs.existsSync(cookieFile)) {
    cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
    console.log(`✅ 从 ${path.basename(cookieFile)} 加载了 ${cookies.length} 个cookies`);
    break;
  }
}

if (cookies.length === 0) {
  console.log('⚠️ 未找到cookies文件，将尝试不使用cookies直接访问');
}

// 目标用户列表
const targetUsers = ['kent236896', 'allen180929', 'fred_0201', 'Alex09936200'];

console.log('🚀 开始修复下拉菜单用户点击问题');
console.log('🎯 目标用户:', targetUsers.join(', '));
console.log('💡 本次测试专门修复下拉菜单中的用户点击功能');
console.log('='.repeat(60));

(async () => {
  let browser;
  try {
    // 启动浏览器
    console.log('📡 启动浏览器...');
    browser = await puppeteer.launch({ 
      headless: false, // 设置为false以显示浏览器
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // 禁用图片加载以提高性能
        '--disable-javascript' // 临时禁用JavaScript以加快页面加载
      ]
    });
    
    console.log('✅ 浏览器启动成功');
    
    // 创建页面
    const page = await browser.newPage();
    
    // 设置cookies
    if (cookies.length > 0) {
      console.log('🍪 设置cookies...');
      await page.setCookie(...cookies);
      
      console.log('✅ Cookies设置完成');
    } else {
      console.log('⚠️ 无cookies，跳过设置');
    }
    
    // 访问Twitter
    if (cookies.length > 0) {
      // 如果有cookies，直接访问主页
      console.log('🔗 访问Twitter主页验证登录...');
      await page.goto('https://x.com/home', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      console.log('✅ 成功访问Twitter主页');
    } else {
      // 如果没有cookies，需要先登录
      console.log('🔐 未找到cookies，需要先登录');
      console.log('📋 请在浏览器中完成登录，然后导航到消息页面');
      await page.goto('https://x.com/login', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // 等待用户手动登录
      console.log('⏳ 等待用户手动登录...请在登录后按回车继续');
      await new Promise(resolve => {
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', () => {
          resolve();
        });
      });
    }
    
    // 导航到消息页面
    console.log('💬 导航到消息页面...');
    await page.goto('https://x.com/i/messages', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    console.log('📝 开始给 4 个用户发送私信...');
    
    // 测试结果统计
    const testResults = {
      totalUsers: targetUsers.length,
      successful: 0,
      failedUsers: []
    };
    
    // 修复版本：打开新聊天对话框
    const openNewChatDropdownFix = async (page) => {
      console.log('🔍 查找新消息按钮...');
      
      // 优先查找特定的新聊天按钮
      const newChatSelectors = [
        'button[data-testid="dm-new-chat-button"]', // 优先：特定的新聊天按钮
        'button[data-testid="newDm"]',
        'a[href="/i/messages/compose"]',
        'div[role="button"][data-testid*="new"]',
        'button[aria-label*="New"]',
        'button[aria-label*="新"]',
        'button[aria-label*="Message"]',
        'button:has-text("New message")',
        'button:has-text("新消息")'
      ];
      
      // 先尝试标准选择器
      for (const selector of newChatSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            console.log(`✅ 找到新消息按钮: ${selector}`);
            await element.click();
            console.log('✅ 点击新消息按钮');
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      // 如果标准选择器没找到，尝试更广泛的搜索
      console.log('⚠️ 标准选择器未找到，尝试更广泛的搜索...');
      const allButtons = await page.$$('.css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-2yi16.r-6g1h8b.r-1ny4l3l.r-1q142lx.r-1q142lx');
      const allAElements = await page.$$('a');
      const allDivButtons = await page.$$('div[role="button"]');
      const allButtonsGeneric = await page.$$('button');
      
      const allElements = [...allButtons, ...allAElements, ...allDivButtons, ...allButtonsGeneric];
      
      console.log(`找到 ${allElements.length} 个可能的按钮元素`);
      
      for (const element of allElements) {
        try {
          const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), element);
          const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), element);
          
          if (ariaLabel && (ariaLabel.includes('Direct Message') || ariaLabel.includes('私信') || ariaLabel.includes('消息'))) {
            console.log(`✅ 通过aria-label找到新消息按钮: "${ariaLabel}"`);
            console.log('按钮详情 - aria-label:', ariaLabel, 'data-testid:', dataTestId);
            await element.click();
            console.log('✅ 点击新消息按钮');
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      console.log('❌ 未找到新消息按钮');
      return false;
    };
    
    // 修复版本：在新聊天界面中搜索用户（专门处理下拉菜单）
    const searchUserInNewChatDropdownFix = async (page, username) => {
      console.log(`🔍 在新聊天界面中搜索用户 @${username}...`);
      
      // 等待页面元素加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 页面信息调试
      const pageInfo = await page.evaluate(() => {
        const elements = document.querySelectorAll('input, textarea, div[contenteditable], [role="combobox"], [role="searchbox"]');
        return {
          url: window.location.href,
          title: document.title,
          elementCount: document.querySelectorAll('*').length,
          inputCount: elements.length,
          allElements: Array.from(elements).map(el => ({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            ariaLabel: el.getAttribute('aria-label'),
            dataTestId: el.getAttribute('data-testid'),
            placeholder: el.getAttribute('placeholder'),
            contentEditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role'),
            visible: el.offsetParent !== null
          }))
        };
      });
      
      console.log(`🔍 页面信息: URL=${pageInfo.url}, 标题="${pageInfo.title}", 总元素数=${pageInfo.elementCount}, 输入相关元素=${pageInfo.inputCount}`);
      
      console.log('📋 页面元素详情 (前10个):');
      pageInfo.allElements.slice(0, 10).forEach((detail, index) => {
        console.log(`  ${index + 1}. tagName: ${detail.tagName}, id: "${detail.id}", className: "${detail.className}", ` +
                   `aria-label: "${detail.ariaLabel}", data-testid: "${detail.dataTestId}", ` +
                   `placeholder: "${detail.placeholder}", contentEditable: ${detail.contentEditable}, role: ${detail.role}, visible: ${detail.visible}`);
      });
      
      // Check for input-like elements
      const inputCount = pageInfo.inputCount;
      
      console.log(`🔍 页面上共有 ${inputCount} 个输入相关元素`);
      
      // Get all input-like elements and their properties for debugging
      const inputDetails = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea, div[contenteditable], [role="combobox"], [role="searchbox"]');
        return Array.from(inputs).map(input => ({
          tagName: input.tagName,
          placeholder: input.placeholder,
          ariaLabel: input.getAttribute('aria-label'),
          dataTestId: input.getAttribute('data-testid'),
          type: input.type,
          id: input.id,
          name: input.name,
          className: input.className,
          contentEditable: input.getAttribute('contenteditable'),
          role: input.getAttribute('role'),
          visible: input.offsetParent !== null
        }));
      });
      
      console.log('📋 页面输入元素详情:');
      inputDetails.forEach((detail, index) => {
        console.log(`  ${index + 1}. tagName: ${detail.tagName}, placeholder: "${detail.placeholder}", ` +
                   `aria-label: "${detail.ariaLabel}", data-testid: "${detail.dataTestId}", ` +
                   `type: ${detail.type}, contentEditable: ${detail.contentEditable}, role: ${detail.role}, visible: ${detail.visible}`);
      });
      
      // 首先检查是否已经存在搜索输入框
      let searchInput = null;
      let foundSelector = '';
      
      // 特定的搜索输入框选择器
      const specificSelectors = [
        'input[data-testid="searchInput"]',
        'input[placeholder="Search name or username"]',
        'input[placeholder="Search"]',
        'input[placeholder*="Search"]',
        'input[aria-label*="Search"]',
        'input[aria-label="Search"]'
      ];
      
      for (const selector of specificSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const placeholder = await page.evaluate(el => el.placeholder, element);
            if (placeholder === 'Search name or username') {
              console.log(`✅ 找到目标搜索输入框: ${selector} (placeholder: "${placeholder}")`);
              searchInput = element;
              foundSelector = selector;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      // Check if we found the specific search input during our page analysis
      if (!searchInput && inputDetails.length > 0) {
        // Look for the specific search input we know exists
        for (const input of inputDetails) {
          if (input.placeholder && input.placeholder.includes('Search name or username')) {
            console.log(`✅ 找到目标搜索输入框: ${input.placeholder}`);
            // Find this element on the page and use it
            searchInput = await page.$(`input[placeholder="${input.placeholder}"]`);
            if (searchInput) {
              foundSelector = `input[placeholder="${input.placeholder}"]`;
              console.log('✅ 使用已识别的搜索输入框');
              break;
            }
          }
        }
      }
      
      // 使用evaluate方法查找可能的搜索输入框
      const searchInputHandle = await page.evaluateHandle(() => {
        // 查找所有可能的搜索输入框元素
        const elements = document.querySelectorAll('input, textarea, div[contenteditable], [role="combobox"], [role="searchbox"]');
        for (const el of elements) {
          // 检查元素属性
          const placeholder = el.getAttribute('placeholder');
          const ariaLabel = el.getAttribute('aria-label');
          const dataTestId = el.getAttribute('data-testid');
          const type = el.getAttribute('type');
          const contentEditable = el.getAttribute('contenteditable');
          const role = el.getAttribute('role');
          
          // 优先查找特定的搜索输入框
          if (placeholder && placeholder === 'Search name or username') {
            // 额外检查：元素是否可见且可交互
            const style = window.getComputedStyle(el);
            if (style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null) {
              console.log('Found target search input:', placeholder, ariaLabel, dataTestId, contentEditable, role);
              return el;
            }
          }
          
          // 检查是否是搜索相关的输入框
          if ((placeholder && (placeholder.toLowerCase().includes('search') || 
                              placeholder.toLowerCase().includes('name') || 
                              placeholder.toLowerCase().includes('username'))) ||
              (ariaLabel && ariaLabel.toLowerCase().includes('search')) ||
              (dataTestId && (dataTestId.includes('search') || dataTestId.includes('Search'))) ||
              (type === 'text' && el.offsetParent !== null) ||
              (contentEditable === 'true' && el.offsetParent !== null) ||
              (role === 'combobox' || role === 'searchbox')) { // If it's a text input that's visible
            // 额外检查：元素是否可见且可交互
            const style = window.getComputedStyle(el);
            if (style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null) {
              console.log('Found potential search input:', placeholder, ariaLabel, dataTestId, contentEditable, role);
              return el;
            }
          }
        }
        return null;
      });
      
      if (searchInputHandle && searchInputHandle.asElement()) {
        searchInput = searchInputHandle.asElement();
        foundSelector = 'evaluate method';
        console.log('✅ 通过evaluate方法找到搜索输入框');
      }
      
      if (!searchInput) {
        console.log('❌ 未找到搜索输入框');
        return false;
      }
      
      // 点击搜索框并输入用户名
      console.log(`📝 输入用户名 @${username} 到搜索框...`);
      await page.evaluate(element => {
        element.focus();
        element.click();
      }, searchInput);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 清空搜索框
      await page.evaluate(element => {
        element.value = '';
      }, searchInput);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 输入用户名
      await searchInput.type(username, { delay: 100 });
      
      // 等待搜索结果 - 增加等待时间 to allow dropdown to appear
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // 拍摄搜索后截图
      await page.screenshot({ 
        path: `search_${username}_result.png`, 
        fullPage: false 
      });
      console.log(`📸 已保存搜索结果截图: search_${username}_result.png`);
      
      // 检查下拉菜单中是否包含目标用户
      const dropdownResults = await page.evaluate((username) => {
        // 查找下拉菜单中的用户元素
        const userElements = document.querySelectorAll('div[role="option"], div[data-testid="UserCell"], div[aria-label*="User"]');
        const foundUsers = [];
        
        userElements.forEach((el, index) => {
          const textContent = el.textContent || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const dataTestId = el.getAttribute('data-testid') || '';
          
          // 检查用户名是否在文本内容中
          if (textContent.includes(username) || ariaLabel.includes(username) || 
              textContent.toLowerCase().includes(username.toLowerCase())) {
            foundUsers.push({
              index: index,
              textContent: textContent.substring(0, 100), // 只取前100个字符
              ariaLabel: ariaLabel,
              dataTestId: dataTestId,
              elementId: el.id,
              elementClass: el.className
            });
          }
        });
        
        return foundUsers;
      }, username);
      
      if (dropdownResults.length > 0) {
        console.log(`✅ 在下拉菜单中找到用户 @${username}:`);
        dropdownResults.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.textContent} (aria-label: "${user.ariaLabel}")`);
        });
        return true;
      } else {
        console.log(`❌ 未在下拉菜单中找到用户 @${username}`);
        // 再次截图，可能是因为搜索结果还没加载完成
        await page.screenshot({ 
          path: `search_${username}_result_retry.png`, 
          fullPage: false 
        });
        console.log(`📸 已保存重试截图: search_${username}_result_retry.png`);
        
        // 再次检查
        await new Promise(resolve => setTimeout(resolve, 3000));
        const dropdownResultsRetry = await page.evaluate((username) => {
          const userElements = document.querySelectorAll('div[role="option"], div[data-testid="UserCell"], div[aria-label*="User"]');
          const foundUsers = [];
          
          userElements.forEach((el, index) => {
            const textContent = el.textContent || '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            
            if (textContent.includes(username) || ariaLabel.includes(username) || 
                textContent.toLowerCase().includes(username.toLowerCase())) {
              foundUsers.push({
                index: index,
                textContent: textContent.substring(0, 100),
                ariaLabel: ariaLabel
              });
            }
          });
          
          return foundUsers;
        }, username);
        
        if (dropdownResultsRetry.length > 0) {
          console.log(`✅ 重试后在下拉菜单中找到用户 @${username}:`);
          dropdownResultsRetry.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.textContent} (aria-label: "${user.ariaLabel}")`);
          });
          return true;
        }
        
        return false;
      }
    };
    
    // 修复版本：开始与用户聊天（专门处理下拉菜单点击）
    const startChatWithUserDropdownFix = async (page, username) => {
      console.log(`🔍 查找并点击用户 @${username}...`);
      
      // 使用evaluate方法查找用户元素
      const userElement = await page.evaluateHandle((username) => {
        // 查找下拉菜单中的用户元素
        const userElements = document.querySelectorAll('div[role="option"], div[data-testid="UserCell"], div[aria-label*="User"]');
        
        for (const el of userElements) {
          const textContent = el.textContent || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          
          // 检查是否包含目标用户名
          if (textContent.includes(username) || ariaLabel.includes(username) || 
              textContent.toLowerCase().includes(username.toLowerCase())) {
            console.log('Found user element:', textContent, ariaLabel);
            return el;
          }
        }
        
        return null;
      }, username);
      
      if (!userElement || !userElement.asElement()) {
        console.log(`❌ 未找到用户 @${username} 的元素`);
        return false;
      }
      
      console.log('✅ 找到用户元素，尝试点击...');
      
      try {
        // 方法1: 直接点击
        await userElement.asElement().click();
        console.log('✅ 直接点击下拉菜单元素成功');
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = await page.url();
        console.log(`直接点击后URL: ${currentUrl}`);
        
        // 检查是否成功进入聊天页面
        if (currentUrl.includes('/messages/') || currentUrl.includes('/chat/')) {
          console.log(`✅ 成功进入与 @${username} 的聊天界面`);
          return true;
        }
      } catch (clickError) {
        console.log(`⚠️ 直接点击下拉菜单元素失败:`, clickError.message);
        
        // 方法2: 使用page.evaluate点击
        try {
          await page.evaluate(element => {
            element.click();
          }, userElement.asElement());
          console.log('✅ 使用evaluate方法点击下拉菜单元素成功');
          
          // 等待页面加载
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const currentUrl = await page.url();
          console.log(`evaluate点击后URL: ${currentUrl}`);
          
          if (currentUrl.includes('/messages/') || currentUrl.includes('/chat/')) {
            console.log(`✅ 成功进入与 @${username} 的聊天界面`);
            return true;
          }
        } catch (evalError) {
          console.log(`⚠️ evaluate方法点击也失败:`, evalError.message);
          
          // 方法3: 使用坐标点击
          try {
            const box = await userElement.asElement().boundingBox();
            if (box) {
              await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
              console.log('✅ 使用坐标点击成功');
              
              // 等待页面加载
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              const currentUrl = await page.url();
              console.log(`坐标点击后URL: ${currentUrl}`);
              
              if (currentUrl.includes('/messages/') || currentUrl.includes('/chat/')) {
                console.log(`✅ 成功进入与 @${username} 的聊天界面`);
                return true;
              }
            }
          } catch (mouseError) {
            console.log(`⚠️ 坐标点击也失败:`, mouseError.message);
          }
        }
      }
      
      return false;
    };
    
    // 遍历目标用户
    for (let i = 0; i < targetUsers.length; i++) {
      const username = targetUsers[i];
      console.log(`\n--- 处理用户 ${i + 1}/${targetUsers.length}: @${username} ---`);
      
      const currentPageUrl = await page.url();
      console.log(`当前页面URL: ${currentPageUrl}`);
      
      // 检查页面状态
      let chatStarted = false;
      
      // 检查页面状态更精确
      const isSpecificChat = currentPageUrl.includes(`/chat/`) && currentPageUrl.includes(`/${username}`);
      const isNewChatInterface = currentPageUrl.includes('/messages') && !currentPageUrl.includes(`/chat/`) && !currentPageUrl.includes(`/${username}`);
      
      // Check if we're on the chat page but still need to search for a user (has search input)
      const hasSearchInput = await page.evaluate(() => {
        const searchInputs = document.querySelectorAll('input[placeholder="Search name or username"]');
        return searchInputs.length > 0;
      });
      
      if (isSpecificChat) {
        // 已在与目标用户的聊天页面
        console.log(`✅ 已在与 @${username} 的聊天页面`);
        chatStarted = true;
      } else if (isNewChatInterface) {
        // 仍在新聊天界面，需要搜索用户
        console.log(`🔍 在新聊天界面，搜索用户 @${username}...`);
        
        // 搜索用户 - 修复版本
        console.log(`🔍 搜索用户 @${username}...`);
        // 等待页面元素加载完成
        await new Promise(resolve => setTimeout(resolve, 8000));
        const userFound = await searchUserInNewChatDropdownFix(page, username);
        
        if (!userFound) {
          console.log(`❌ 未找到用户 @${username}`);
          testResults.failedUsers.push({ username, reason: '未找到用户' });
          continue;
        }
        
        // 点击用户开始聊天 - 修复版本（专门处理下拉菜单点击）
        console.log(`💬 点击用户开始聊天...`);
        chatStarted = await startChatWithUserDropdownFix(page, username);
        
        if (!chatStarted) {
          console.log(`❌ 无法开始与 @${username} 的聊天`);
          testResults.failedUsers.push({ username, reason: '无法开始聊天' });
          continue;
        }
      } else if (hasSearchInput) {
        // 页面上有搜索输入框，说明我们're in the right place to search for users
        console.log('✅ 检测到搜索输入框，直接搜索用户');
        
        // 搜索用户 - 修复版本
        console.log(`🔍 搜索用户 @${username}...`);
        // 等待页面元素加载完成
        await new Promise(resolve => setTimeout(resolve, 2000));
        const userFound = await searchUserInNewChatDropdownFix(page, username);
        
        if (!userFound) {
          console.log(`❌ 未找到用户 @${username}`);
          testResults.failedUsers.push({ username, reason: '未找到用户' });
          continue;
        }
        
        // 点击用户开始聊天 - 修复版本（专门处理下拉菜单点击）
        console.log(`💬 点击用户开始聊天...`);
        chatStarted = await startChatWithUserDropdownFix(page, username);
        
        if (!chatStarted) {
          console.log(`❌ 无法开始与 @${username} 的聊天`);
          testResults.failedUsers.push({ username, reason: '无法开始聊天' });
          continue;
        }
      } else {
        // 不确定页面状态，返回到消息列表重新开始
        console.log('⚠️ 不确定页面状态，返回消息列表重新开始...');
        await page.goto('https://x.com/i/messages', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // 重新点击新消息按钮
        console.log(`💬 重新点击新消息按钮来搜索 @${username}...`);
        const newChatOpened = await openNewChatDropdownFix(page);
        if (!newChatOpened) {
          console.log(`❌ 无法重新打开新聊天对话框`);
          testResults.failedUsers.push({ username, reason: '无法打开新聊天对话框' });
          continue;
        }
        
        // 搜索用户 - 修复版本
        console.log(`🔍 搜索用户 @${username}...`);
        // 等待页面元素加载完成
        await new Promise(resolve => setTimeout(resolve, 8000));
        const userFound = await searchUserInNewChatDropdownFix(page, username);
        
        if (!userFound) {
          console.log(`❌ 未找到用户 @${username}`);
          testResults.failedUsers.push({ username, reason: '未找到用户' });
          continue;
        }
        
        // 点击用户开始聊天 - 修复版本（专门处理下拉菜单点击）
        console.log(`💬 点击用户开始聊天...`);
        chatStarted = await startChatWithUserDropdownFix(page, username);
        
        if (!chatStarted) {
          console.log(`❌ 无法开始与 @${username} 的聊天`);
          testResults.failedUsers.push({ username, reason: '无法开始聊天' });
          continue;
        }
      }
      
      // 检查是否需要PIN验证
      const currentUrl = await page.url();
      console.log(`当前URL: ${currentUrl}`);
      
      if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
        console.log(`🔐 检测到需要PIN验证...`);
        
        // 处理PIN验证
        const pinInput = await page.$('input[data-testid="ocfEnterTextTextInput"]');
        if (pinInput) {
          console.log('🔐 找到PIN输入框，需要输入PIN码');
          // 这里需要输入PIN码，但由于我们不知道PIN码，所以跳过
          console.log('⚠️ 由于不知道PIN码，跳过此用户');
          testResults.failedUsers.push({ username, reason: '需要PIN验证' });
          continue;
        }
      }
      
      // 如果成功进入聊天页面，发送消息
      if (chatStarted) {
        console.log(`💬 准备发送消息给 @${username}...`);
        
        // 查找消息输入框
        const messageInputSelectors = [
          'div[data-testid="dmComposerTextInput"]',
          'textarea[aria-label="发送消息"]',
          'textarea[aria-label="Send message"]',
          'div[contenteditable="true"][data-testid*="message"]',
          'div[contenteditable="true"][role="textbox"]',
          'textarea[role="textbox"]'
        ];
        
        let messageInput = null;
        for (const selector of messageInputSelectors) {
          try {
            messageInput = await page.$(selector);
            if (messageInput) {
              console.log(`✅ 找到消息输入框: ${selector}`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (!messageInput) {
          console.log(`❌ 未找到消息输入框`);
          testResults.failedUsers.push({ username, reason: '未找到消息输入框' });
          continue;
        }
        
        // 输入消息
        const message = `Hello @${username}! This is an automated message.`;
        await messageInput.click();
        await messageInput.type(message);
        
        // 查找发送按钮
        const sendButtonSelectors = [
          'button[data-testid="dmComposerSendButton"]',
          'button[aria-label="发送"]',
          'button[aria-label="Send"]',
          'button:has-text("Send")',
          'button:has-text("发送")'
        ];
        
        let sendButton = null;
        for (const selector of sendButtonSelectors) {
          try {
            sendButton = await page.$(selector);
            if (sendButton) {
              console.log(`✅ 找到发送按钮: ${selector}`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (sendButton) {
          await sendButton.click();
          console.log(`✅ 消息已发送给 @${username}`);
          testResults.successful++;
        } else {
          console.log(`❌ 未找到发送按钮`);
          testResults.failedUsers.push({ username, reason: '未找到发送按钮' });
        }
      } else {
        console.log(`❌ 无法与 @${username} 开始聊天`);
        testResults.failedUsers.push({ username, reason: '无法开始聊天' });
      }
      
      // 等待一段时间再处理下一个用户
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // 输出测试结果
    console.log('\n📊 下拉菜单修复版本测试结果报告');
    console.log('='.repeat(60));
    console.log(`📈 总用户数: ${testResults.totalUsers}`);
    console.log(`✅ 成功发送: ${testResults.successful}`);
    console.log(`❌ 发送失败: ${testResults.totalUsers - testResults.successful}`);
    
    if (testResults.failedUsers.length > 0) {
      console.log('\n❌ 发送失败的用户:');
      testResults.failedUsers.forEach(failedUser => {
        console.log(`  - @${failedUser.username} (原因: ${failedUser.reason})`);
      });
    }
    
    console.log(`\n🎯 成功率: ${((testResults.successful / testResults.totalUsers) * 100).toFixed(1)}%`);
    if (testResults.successful === 0) {
      console.log('😞 所有私信发送失败，需要进一步调试');
    } else if (testResults.successful === testResults.totalUsers) {
      console.log('🎉 全部私信发送成功！');
    } else {
      console.log(`📈 部分成功，需要优化失败的用户处理`);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    if (browser) {
      await browser.close();
      console.log('✅ 浏览器已关闭');
    }
    console.log('✅ 测试完成');
  }
  
  console.log('\n🏁 下拉菜单修复版本测试脚本执行完毕');
  console.log('💡 请检查目标用户的私信收件箱，消息应该已经发送');
})();
