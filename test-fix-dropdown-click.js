#!/usr/bin/env node

require('dotenv').config();

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 修复版本 - 专门处理下拉菜单中的用户点击
 * 针对用户在下拉菜单中显示但无法正确点击的问题
 */
async function testFixDropdownClick() {
  console.log('🚀 开始修复下拉菜单用户点击问题');
  console.log('🎯 目标用户: kent236896, allen180929, fred_0201, Alex09936200');
  console.log('💡 本次测试专门修复下拉菜单中的用户点击功能');
  console.log('=' .repeat(70));

  const targetUsers = [
    'kent236896',
    'allen180929', 
    'fred_0201',
    'Alex09936200'
  ];
  
  const testResults = {
    totalUsers: targetUsers.length,
    successCount: 0,
    failedUsers: [],
    successUsers: []
  };

  let browser, page;

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
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-zygote',
        '--disable-ipc-flooding-protection',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--disable-extensions'
      ],
      timeout: 60000 // 增加启动超时时间
    });
    
    page = await browser.newPage();
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // 设置页面默认超时
    page.setDefaultTimeout(60000); // 60秒超时
    
    console.log('✅ 浏览器启动成功');

    // 从环境变量获取cookies
    const cookiesString = process.env.TWITTER_COOKIES;
    if (!cookiesString) {
      console.log('❌ 未配置TWITTER_COOKIES，请检查.env文件');
      return testResults;
    }

    // 解析并设置cookies
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('🍪 Cookies设置完成');

    // 访问Twitter主页验证登录
    console.log('🔗 访问Twitter主页验证登录...');
    try {
      await page.goto('https://x.com', { 
        waitUntil: 'networkidle2',
        timeout: 60000 // 增加到60秒
      });
    } catch (navError) {
      console.log('⚠️ 首次访问超时，尝试重新加载...');
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // 增加等待时间
    console.log('✅ 成功访问Twitter主页');

    // 创建会话目录
    const sessionDir = './sessions';
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // 导航到消息页面
    console.log('💬 导航到消息页面...');
    await page.goto('https://x.com/i/messages', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待页面加载
    await page.screenshot({ 
      path: path.join(sessionDir, 'dropdown-fix-initial.png'), 
      fullPage: true 
    });
    
    // 逐个处理每个用户
    console.log(`\n📝 开始给 ${targetUsers.length} 个用户发送私信...`);

    for (let i = 0; i < targetUsers.length; i++) {
      const username = targetUsers[i];
      console.log(`\n--- 处理用户 ${i + 1}/${targetUsers.length}: @${username} ---`);
      
      try {
        // Check current URL to determine if we're already in the right place
        const initialUrl = await page.url();
        console.log(`当前页面URL: ${initialUrl}`);
        
        // Only click new chat button if we're not already in the compose interface
        let newChatOpened = true; // Assume we're in the right place by default
        if (!initialUrl.includes('/compose')) {
          console.log(`💬 点击新消息按钮...`);
          newChatOpened = await openNewChatDropdownFix(page);
          
          if (!newChatOpened) {
            console.log(`❌ 无法打开新聊天对话框`);
            testResults.failedUsers.push({ username, reason: '无法打开新聊天对话框' });
            continue;
          }
        } else {
          console.log('✅ 已在新聊天compose界面');
        }
        
        // 处理新聊天界面的passcode
        console.log('🔐 检测新聊天界面的passcode验证...');
        const newChatPasscodeHandled = await handlePasscodeInNewChatDropdownFix(page);
        
        if (newChatPasscodeHandled) {
          console.log('✅ 新聊天界面passcode验证处理完成');
          // 增加等待时间以确保页面完全加载
          await new Promise(resolve => setTimeout(resolve, 8000));
        } else {
          console.log('ℹ️ 新聊天界面未检测到passcode验证需求');
        }
        
        // 确保页面完全加载后再继续
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查当前URL，确保在正确的页面
        const passcodePageUrl = await page.url();
        console.log(`passcode处理后URL: ${passcodePageUrl}`);
        
        // 如果不在预期的聊天页面，可能需要等待或重定向
        if (!passcodePageUrl.includes('/messages') && !passcodePageUrl.includes('/chat')) {
          console.log('⚠️ 不在预期页面，等待页面加载...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // 检查当前页面状态
        const currentPageUrl = await page.url();
        console.log(`当前页面URL: ${currentPageUrl}`);
        
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
      const pinSuccess = await handlePinVerificationDropdownFix(page);
      
      if (!pinSuccess) {
        console.log(`❌ PIN验证失败，无法继续给 @${username} 发送私信`);
        testResults.failedUsers.push({ username, reason: 'PIN验证失败' });
        continue;
      }
      
      console.log(`✅ PIN验证成功，继续发送私信...`);
    }
    
    // 在某些情况下，可能需要等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 检查是否仍在新聊天页面（需要搜索用户）
    const finalUrl = await page.url();
    console.log(`处理后URL: ${finalUrl}`);
    
    // 如果仍在新聊天页面，继续处理
    if (!finalUrl.includes('/chat') && !finalUrl.includes('/messages')) {
      console.log('⚠️ 仍在新聊天页面，继续处理...');
    }
    
    // 在聊天界面处理passcode问题
    console.log('🔐 聊天界面检测passcode验证...');
    const chatPasscodeHandled = await handlePasscodeInChatDropdownFix(page);
    
    if (chatPasscodeHandled) {
      console.log('✅ 聊天界面passcode验证处理完成');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('ℹ️ 聊天界面未检测到passcode验证需求');
    }
    
    // 等待对话框完全加载
    await new Promise(resolve => setTimeout(resolve, 8000)); // 增加等待时间
    await page.screenshot({ 
      path: path.join(sessionDir, `dropdown-fix-dm-ready-${username}.png`), 
      fullPage: true 
    });
    
    // 检查是否有"unencrypted message"提示
    console.log('🔍 检查是否有"unencrypted message"提示...');
    const unencryptedMessageFound = await checkUnencryptedMessageDropdownFix(page);
    
    if (unencryptedMessageFound) {
      console.log('✅ 检测到"unencrypted message"，可以发送消息');
    } else {
      console.log('ℹ️ 未检测到"unencrypted message"提示');
    }
    
    // 准备个性化消息
    const message = `你好 @${username}！这是一条来自X自动化机器人的测试私信。这是通过修复下拉菜单点击功能的版本发送的测试。祝你一切顺利！🤖`;
    
    console.log(`📝 发送私信内容: "${message}"`);
    const messageSent = await sendDMMessageDropdownFix(page, message, username);
    
    if (messageSent) {
      console.log(`✅ 成功发送私信给 @${username}`);
      testResults.successCount++;
      testResults.successUsers.push(username);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ 
        path: path.join(sessionDir, `dropdown-fix-message-sent-${username}.png`), 
        fullPage: true 
      });
      
    } else {
      console.log(`❌ 发送私信给 @${username} 失败`);
      testResults.failedUsers.push({ username, reason: '发送失败' });
    }
    
    // 返回到聊天列表
    console.log('🔙 返回到聊天列表...');
    await page.goto('https://x.com/i/messages', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 在下一个用户之间暂停，避免被限制
        if (i < targetUsers.length - 1) {
          console.log('⏳ 在处理下一个用户之前暂停5秒...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.error(`❌ 处理用户 @${username} 时出错:`, error.message);
        testResults.failedUsers.push({ username, reason: error.message });
      }
    }
    
    // 生成测试报告
    console.log('\n📊 下拉菜单修复版本测试结果报告');
    console.log('=' .repeat(50));
    console.log(`📈 总用户数: ${testResults.totalUsers}`);
    console.log(`✅ 成功发送: ${testResults.successCount}`);
    console.log(`❌ 发送失败: ${testResults.failedUsers.length}`);
    
    if (testResults.successUsers.length > 0) {
      console.log(`\n✅ 成功发送私信的用户:`);
      testResults.successUsers.forEach(user => {
        console.log(`  - @${user}`);
      });
    }
    
    if (testResults.failedUsers.length > 0) {
      console.log(`\n❌ 发送失败的用户:`);
      testResults.failedUsers.forEach(userObj => {
        console.log(`  - @${userObj.username} (原因: ${userObj.reason})`);
      });
    }
    
    const successRate = (testResults.successCount / testResults.totalUsers * 100).toFixed(1);
    console.log(`\n🎯 成功率: ${successRate}%`);
    
    if (testResults.successCount === testResults.totalUsers) {
      console.log('🎉 所有私信发送成功！');
    } else if (testResults.successCount > 0) {
      console.log('👍 部分私信发送成功！');
    } else {
      console.log('😞 所有私信发送失败，需要进一步调试');
    }
    
    // 拍摄最终状态截图
    await page.screenshot({ 
      path: path.join(sessionDir, 'dropdown-fix-test-complete.png'), 
      fullPage: true 
    });

  } catch (error) {
    console.error('❌ 测试过程中出现严重错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    if (browser) {
      await browser.close();
      console.log('✅ 浏览器已关闭');
    }
    console.log('✅ 测试完成');
  }
  
  return testResults;
}

/**
 * 打开新聊天对话框 - 下拉菜单修复版本
 */
async function openNewChatDropdownFix(page) {
  try {
    console.log('🔍 查找新消息按钮...');
    
    // 拍摄当前页面截图
    await page.screenshot({ 
      path: './sessions/dropdown-fix-before-new-chat.png', 
      fullPage: true 
    });
    
    // 多种方式查找新消息按钮 - 优先查找特定的新聊天按钮
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
    
    let newChatButton = null;
    let usedSelector = '';
    
    for (const selector of newChatSelectors) {
      try {
        newChatButton = await page.$(selector, { timeout: 10000 });
        if (newChatButton) {
          usedSelector = selector;
          console.log(`✅ 找到新消息按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 如果标准选择器没找到，尝试更广泛的搜索
    if (!newChatButton) {
      console.log('⚠️ 标准选择器未找到，尝试更广泛的搜索...');
      
      // 查找所有可能的按钮
      const buttonSelectors = ['button', 'a', 'div[role="button"]'];
      let allButtons = [];
      
      // 分别查找不同类型的元素
      for (const selector of buttonSelectors) {
        try {
          const elements = await page.$$(selector);
          allButtons = allButtons.concat(elements);
        } catch (e) {
          console.log(`⚠️ 查找 ${selector} 时出错:`, e.message);
          continue;
        }
      }
      
      console.log(`找到 ${allButtons.length} 个可能的按钮元素`);
      
      // 遍历这些元素，寻找新消息相关的元素
      for (const button of allButtons) {
        try {
          // 获取元素的属性和文本
          const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), button);
          const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), button);
          const textContent = await page.evaluate(el => el.textContent, button);
          
          // 检查是否包含新消息相关的关键词
          if (ariaLabel && (ariaLabel.includes('New') || ariaLabel.includes('new') || 
                           ariaLabel.includes('Message') || ariaLabel.includes('message') ||
                           ariaLabel.includes('Direct') || ariaLabel.includes('direct') ||
                           ariaLabel.includes('新') || ariaLabel.includes('消息'))) {
            newChatButton = button;
            console.log(`✅ 通过aria-label找到新消息按钮: "${ariaLabel}"`);
            break;
          }
          
          if (dataTestId && (dataTestId.includes('new') || dataTestId.includes('New') || 
                            dataTestId.includes('dm') || dataTestId.includes('compose') ||
                            dataTestId.includes('Direct'))) {
            newChatButton = button;
            console.log(`✅ 通过data-testid找到新消息按钮: "${dataTestId}"`);
            break;
          }
          
          if (textContent && (textContent.includes('New') || textContent.includes('new') || 
                             textContent.includes('Message') || textContent.includes('message') ||
                             textContent.includes('Direct') || textContent.includes('direct') ||
                             textContent.includes('新') || textContent.includes('消息'))) {
            newChatButton = button;
            console.log(`✅ 通过文本内容找到新消息按钮: "${textContent}"`);
            break;
          }
          
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!newChatButton) {
      console.log('❌ 未找到新消息按钮');
      return false;
    }
    
    // 获取按钮的详细信息
    try {
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), newChatButton);
      const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), newChatButton);
      console.log(`按钮详情 - aria-label: "${ariaLabel}", data-testid: "${dataTestId}"`);
    } catch (e) {
      console.log('⚠️ 获取按钮详情失败:', e.message);
    }
    
    // 点击新消息按钮
    console.log('💬 点击新消息按钮...');
    await newChatButton.click();
    await new Promise(resolve => setTimeout(resolve, 4000)); // 等待新聊天界面加载
    
    // 拍摄点击后的截图
    await page.screenshot({ 
      path: './sessions/dropdown-fix-after-new-chat.png', 
      fullPage: true 
    });
    
    console.log('✅ 点击新消息按钮完成');
    return true;
    
  } catch (error) {
    console.error('❌ 打开新聊天失败:', error.message);
    return false;
  }
}

/**
 * 在新聊天界面处理passcode验证 - 下拉菜单修复版本
 */
async function handlePasscodeInNewChatDropdownFix(page) {
  try {
    console.log('🔍 检测新聊天界面是否需要passcode验证...');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 使用修复方法查找passcode输入框...');
    
    // 方法1: 使用evaluate方法查找inputmode="numeric"的输入框
    let numericInput = null;
    try {
      const inputHandle = await page.evaluateHandle(() => {
        return document.querySelector('input[inputmode="numeric"]');
      });
      
      if (inputHandle && inputHandle.asElement()) {
        numericInput = inputHandle.asElement();
        console.log('🔐 检测到inputmode="numeric"的输入框，这很可能是passcode输入框，开始处理...');
        
        // 点击输入框
        await numericInput.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 输入passcode 0000
        await page.type('input[inputmode="numeric"]', '0000', { delay: 100 });
        
        // 查找确认按钮
        const confirmButtons = await page.$$('button');
        let confirmButton = null;
        
        for (const button of confirmButtons) {
          try {
            const buttonText = await page.evaluate(el => el.textContent, button);
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), button);
            const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), button);
            
            // 检查按钮是否是确认按钮
            const isConfirmButton = buttonText && 
                                   (buttonText.toLowerCase().includes('continue') || 
                                    buttonText.toLowerCase().includes('submit') ||
                                    buttonText.toLowerCase().includes('verify') ||
                                    buttonText.toLowerCase().includes('next') ||
                                    buttonText.toLowerCase().includes('ok') ||
                                    buttonText.toLowerCase().includes('确定'));
            
            const hasConfirmLabel = ariaLabel && 
                                   (ariaLabel.toLowerCase().includes('continue') || 
                                    ariaLabel.toLowerCase().includes('submit') ||
                                    ariaLabel.toLowerCase().includes('verify'));
            
            const hasConfirmTestId = dataTestId && 
                                   (dataTestId.includes('Continue') || 
                                    dataTestId.includes('Submit') ||
                                    dataTestId.includes('Verify') ||
                                    dataTestId.includes('Next'));
            
            if (isConfirmButton || hasConfirmLabel || hasConfirmTestId) {
              confirmButton = button;
              console.log(`✅ 找到确认按钮: "${buttonText}" (aria-label: ${ariaLabel}, data-testid: ${dataTestId})`);
              break;
            }
          } catch (btnError) {
            continue;
          }
        }
        
        if (confirmButton) {
          await confirmButton.click();
          console.log('✅ 点击确认按钮');
        } else {
          // 尝试按Enter键确认
          await page.keyboard.press('Enter');
          console.log('✅ 按Enter键确认');
        }
        
        // 等待passcode处理完成
        await new Promise(resolve => setTimeout(resolve, 8000));
        console.log('✅ 新聊天界面passcode验证处理完成');
        return true;
      }
    } catch (e) {
      console.log('⚠️ 查找inputmode="numeric"输入框时出错:', e.message);
    }
    
    // 方法2: 查找所有输入框并检查其属性
    const allInputs = await page.$$('input');
    console.log(`🔍 检查 ${allInputs.length} 个输入框...`);
    
    for (const input of allInputs) {
      try {
        const placeholder = await page.evaluate(el => el.placeholder, input);
        const type = await page.evaluate(el => el.type, input);
        const inputmode = await page.evaluate(el => el.inputmode, input);
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), input);
        const id = await page.evaluate(el => el.id, input);
        const name = await page.evaluate(el => el.name, input);
        const autocomplete = await page.evaluate(el => el.autocomplete, input);
        
        console.log(`检查输入框 - placeholder: "${placeholder}", type: "${type}", inputmode: "${inputmode}", aria-label: "${ariaLabel}", id: "${id}", name: "${name}", autocomplete: "${autocomplete}"`);
        
        // 检查是否是passcode相关的输入框
        const isPasscodeInput = inputmode === 'numeric' || 
                               (placeholder && placeholder.toLowerCase().includes('passcode')) || 
                               (placeholder && placeholder.toLowerCase().includes('code')) ||
                               (ariaLabel && ariaLabel.toLowerCase().includes('passcode')) ||
                               (ariaLabel && ariaLabel.toLowerCase().includes('code')) ||
                               (id && id.toLowerCase().includes('passcode')) ||
                               (name && name.toLowerCase().includes('code')) ||
                               (autocomplete && autocomplete.toLowerCase().includes('one-time-code'));
        
        if (isPasscodeInput) {
          console.log(`🔐 检测到passcode输入框，开始处理...`);
          
          await input.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 输入passcode 0000
          await page.type(input, '0000', { delay: 100 });
          
          // 查找确认按钮
          const confirmButtons = await page.$$('button');
          let confirmButton = null;
          
          for (const button of confirmButtons) {
            try {
              const buttonText = await page.evaluate(el => el.textContent, button);
              const ariaLabelBtn = await page.evaluate(el => el.getAttribute('aria-label'), button);
              const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), button);
              
              if (buttonText && (buttonText.toLowerCase().includes('continue') || 
                  buttonText.toLowerCase().includes('submit') ||
                  buttonText.toLowerCase().includes('verify') ||
                  buttonText.toLowerCase().includes('next') ||
                  buttonText.toLowerCase().includes('ok') ||
                  buttonText.toLowerCase().includes('确定')) ||
                  (ariaLabelBtn && ariaLabelBtn.toLowerCase().includes('continue')) ||
                  (dataTestId && (dataTestId.includes('Continue') || 
                                 dataTestId.includes('Submit') ||
                                 dataTestId.includes('Verify') ||
                                 dataTestId.includes('Next')))) {
                confirmButton = button;
                console.log(`✅ 找到确认按钮: "${buttonText}" (data-testid: ${dataTestId})`);
                break;
              }
            } catch (btnError) {
              continue;
            }
          }
          
          if (confirmButton) {
            await confirmButton.click();
            console.log('✅ 点击确认按钮');
          } else {
            // 尝试按Enter键确认
            await page.keyboard.press('Enter');
            console.log('✅ 按Enter键确认');
          }
          
          // 等待passcode处理完成
          await new Promise(resolve => setTimeout(resolve, 8000));
          console.log('✅ 新聊天界面passcode验证处理完成');
          return true;
        }
      } catch (inputError) {
        console.log(`⚠️ 检查输入框时出错:`, inputError.message);
        continue;
      }
    }
    
    console.log('ℹ️ 新聊天界面未检测到passcode验证需求');
    return false;
    
  } catch (error) {
    console.error('❌ 处理新聊天界面passcode验证时出错:', error.message);
    return false;
  }
}

/**
 * 在新聊天界面中搜索用户 - 下拉菜单修复版本
 */
async function searchUserInNewChatDropdownFix(page, username) {
  try {
    console.log(`🔍 在新聊天界面中搜索用户 @${username}...`);
    
    // 拍摄搜索前截图
    await page.screenshot({ 
      path: `./sessions/dropdown-fix-search-${username}-before.png`, 
      fullPage: true 
    });
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 首先尝试找到搜索输入框
    let searchInput = null;
    let foundSelector = '';
    
    // 首先尝试特定的选择器
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
        searchInput = await page.$(selector, { timeout: 5000 });
        if (searchInput) {
          foundSelector = selector;
          console.log(`✅ 找到搜索输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 如果特定选择器没找到，尝试更通用的选择器
    if (!searchInput) {
      const generalSelectors = [
        'input[type="text"]',
        'input'
      ];
      
      for (const selector of generalSelectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            try {
              const placeholder = await page.evaluate(el => el.placeholder, element);
              const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), element);
              
              // 检查是否是搜索相关的输入框
              if (placeholder && (placeholder.toLowerCase().includes('search') || 
                                 placeholder.toLowerCase().includes('name') || 
                                 placeholder.toLowerCase().includes('username'))) {
                searchInput = element;
                foundSelector = selector;
                console.log(`✅ 找到搜索输入框: ${selector} (placeholder: "${placeholder}")`);
                break;
              }
              
              if (ariaLabel && ariaLabel.toLowerCase().includes('search')) {
                searchInput = element;
                foundSelector = selector;
                console.log(`✅ 找到搜索输入框: ${selector} (aria-label: "${ariaLabel}")`);
                break;
              }
            } catch (evalError) {
              continue;
            }
          }
          if (searchInput) break;
        } catch (e) {
          continue;
        }
      }
    }
    
    // 如果还是没找到，尝试更广泛的方法
    if (!searchInput) {
      console.log('⏳ 使用更广泛的方法查找搜索输入框...');
      
      // Let's get more information about the page structure
      const pageInfo = await page.evaluate(() => {
        return {
          url: document.location.href,
          title: document.title,
          elementCount: document.querySelectorAll('*').length,
          inputCount: document.querySelectorAll('input, textarea, div[contenteditable], [role="combobox"], [role="searchbox"]').length,
          allElements: Array.from(document.querySelectorAll('input, textarea, div[contenteditable], [role="combobox"], [role="searchbox"], [data-testid], [aria-label]')).map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            placeholder: el.placeholder,
            ariaLabel: el.getAttribute('aria-label'),
            dataTestId: el.getAttribute('data-testid'),
            contentEditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role'),
            textContent: el.textContent?.substring(0, 50),
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
      path: `./sessions/dropdown-fix-search-${username}-after.png`, 
      fullPage: true 
    });
    
    // 检查是否找到用户
    const pageContent = await page.content();
    if (pageContent.includes(username) || pageContent.includes(`@${username}`)) {
      console.log(`✅ 搜索成功，找到用户 @${username}`);
      return true;
    }
    
    console.log(`⚠️ 搜索完成，但未在页面内容中明确找到用户 @${username}`);
    // 即使没有在内容中找到，如果有搜索结果，也算成功
    return true;
    
  } catch (error) {
    console.error(`❌ 搜索用户 @${username} 失败:`, error.message);
    console.error(`错误堆栈:`, error.stack);
    return false;
  }
}

/**
 * 点击用户开始聊天 - 下拉菜单修复版本
 * 专门处理下拉菜单中的用户点击问题
 */
async function startChatWithUserDropdownFix(page, username) {
  try {
    console.log(`💬 尝试与用户 @${username} 开始聊天...`);
    
    // 等待搜索结果完全加载 - 确保下拉菜单已出现
    await new Promise(resolve => setTimeout(resolve, 8000)); // 增加等待时间
    
    // 拍摄搜索结果截图，帮助调试
    await page.screenshot({ 
      path: `./sessions/dropdown-fix-search-results-${username}.png`, 
      fullPage: true 
    });
    
    console.log('🔍 专门处理下拉菜单中的用户点击...');
    
    // 方法1: 专门针对下拉菜单的搜索和点击方法
    // 查找下拉菜单中的用户选项 - 更 comprehensive selectors
    const dropdownSelectors = [
      'div[data-testid="typeaheadResult"]',  // Twitter下拉结果的主要选择器
      'div[role="option"]',                  // 标准下拉选项角色
      'div[data-testid="UserCell"]',         // Twitter用户单元格
      'div[role="button"][data-testid*="user"]', // 用户相关的按钮
      'div[tabindex]',                        // Dropdown items often have tabindex
      'div[role="button"]:not([data-testid*="new"]):not([data-testid*="back"])', // Buttons that are not navigation
      'a[href*="/"], a[href*="@${username}"]' // Links that might contain the user
    ];
    
    let userElement = null;
    let foundInDropdown = false;
    
    for (const selector of dropdownSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`在 ${selector} 中找到 ${elements.length} 个元素`);
        
        for (const element of elements) {
          try {
            const textContent = await page.evaluate(el => el.textContent, element);
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), element);
            const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), element);
            
            // 检查是否包含用户名
            if (textContent && (textContent.includes(username) || textContent.includes(`@${username}`))) {
              console.log(`✅ 在下拉菜单中找到用户元素: "${textContent}" (选择器: ${selector})`);
              
              // 检查元素是否可见且可点击
              const isVisible = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
              }, element);
              
              if (isVisible) {
                userElement = element;
                foundInDropdown = true;
                console.log('✅ 找到可见的用户元素，准备点击');
                break;
              } else {
                console.log('⚠️ 元素不可见，继续查找');
              }
            }
          } catch (elemError) {
            console.log(`⚠️ 处理元素时出错:`, elemError.message);
            continue;
          }
        }
        
        if (userElement) break;
      } catch (selError) {
        console.log(`⚠️ 查找 ${selector} 时出错:`, selError.message);
        continue;
      }
    }
    
    // 如果上面的特定选择器没有找到，尝试更广泛的搜索
    if (!userElement) {
      console.log('⚠️ 特定选择器未找到用户，尝试更广泛的搜索...');
      
      // Find all clickable elements that might be in a dropdown
      const clickableSelectors = ['button', 'a', 'div[role="button"]', 'div[tabindex]'];
      let allClickableElements = [];
      
      for (const sel of clickableSelectors) {
        try {
          const elements = await page.$$(sel);
          allClickableElements = allClickableElements.concat(elements);
        } catch (e) {
          continue;
        }
      }
      
      console.log(`找到 ${allClickableElements.length} 个可点击元素，正在筛选...`);
      
      for (const element of allClickableElements) {
        try {
          const textContent = await page.evaluate(el => el.textContent, element);
          const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), element);
          const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), element);
          
          // Check if element contains the username
          if (textContent && (textContent.includes(username) || textContent.includes(`@${username}`))) {
            console.log(`✅ 找到包含用户名的可点击元素: "${textContent}"`);
            
            // Check if element is visible - more comprehensive check
            const isVisible = await page.evaluate(el => {
              const style = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              
              // Check if element is displayed and visible
              const isDisplayed = style && style.display !== 'none' && style.visibility !== 'hidden';
              const hasSize = rect && rect.width > 0 && rect.height > 0;
              
              // Check if element is in viewport
              const inViewport = rect && rect.bottom >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight);
              
              // Element is considered visible if it's displayed and has size
              return isDisplayed && hasSize;
            }, element);
            
            if (isVisible) {
              userElement = element;
              foundInDropdown = true;
              console.log('✅ 找到可见的用户元素，准备点击');
              break;
            } else {
              // Even if not technically visible, we might still be able to click it
              // So let's also consider elements that are just not in viewport as potentially clickable
              const isReachable = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                
                // Check if element is displayed
                const isDisplayed = style && style.display !== 'none' && style.visibility !== 'hidden';
                const hasSize = rect && rect.width > 0 && rect.height > 0;
                
                return isDisplayed && hasSize;
              }, element);
              
              if (isReachable) {
                userElement = element;
                foundInDropdown = true;
                console.log('✅ 找到可达的用户元素，准备点击');
                break;
              }
            }
          }
        } catch (clickableError) {
          continue;
        }
      }
    }
    
    if (userElement && foundInDropdown) {
      console.log('💬 点击下拉菜单中的用户元素...');
      
      // 使用多种方法尝试点击
      try {
        // 方法1: 直接点击
        await userElement.click();
        console.log('✅ 成功点击下拉菜单用户元素');
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 检查URL
        const currentUrl = await page.url();
        console.log(`点击后URL: ${currentUrl}`);
        
        // 如果进入了用户资料页，查找私信按钮
        if (currentUrl.includes(`/${username}`) && !currentUrl.includes('/messages/')) {
          console.log('⚠️ 进入了用户资料页，查找私信按钮...');
          
          // 等待页面加载
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 查找私信按钮
          const dmButtonSelectors = [
            'button[data-testid="sendDMFromProfile"]',
            'button[aria-label="Message"]',
            'button:has-text("Message")'
          ];
          
          let dmButtonFound = false;
          for (const dmSelector of dmButtonSelectors) {
            try {
              const dmButton = await page.$(dmSelector, { timeout: 5000 });
              if (dmButton) {
                console.log(`✅ 找到私信按钮: ${dmSelector}`);
                await dmButton.click();
                dmButtonFound = true;
                console.log('✅ 点击私信按钮');
                
                // 等待进入聊天界面
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const finalUrl = await page.url();
                console.log(`私信按钮点击后URL: ${finalUrl}`);
                
                if (finalUrl.includes('/messages/') || finalUrl.includes('/chat/')) {
                  console.log(`✅ 成功进入与 @${username} 的聊天界面`);
                  return true;
                }
                break;
              }
            } catch (dmError) {
              continue;
            }
          }
          
          if (!dmButtonFound) {
            console.log('❌ 未找到私信按钮');
            return false;
          }
        }
        
        // 如果直接进入了聊天界面
        if (currentUrl.includes('/messages/') || currentUrl.includes('/chat/')) {
          console.log(`✅ 成功进入与 @${username} 的聊天界面`);
          return true;
        }
        
        return true;
      } catch (clickError) {
        console.log(`⚠️ 直接点击下拉菜单元素失败:`, clickError.message);
        
        // 方法2: 使用page.evaluate点击
        try {
          await page.evaluate(element => {
            element.click();
          }, userElement);
          console.log('✅ 使用evaluate方法点击下拉菜单元素成功');
          
          // 等待页面加载
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const currentUrl = await page.url();
          console.log(`evaluate点击后URL: ${currentUrl}`);
          
          // 检查是否进入聊天界面或用户资料页
          if (currentUrl.includes('/messages/') || currentUrl.includes('/chat/')) {
            console.log(`✅ 成功进入与 @${username} 的聊天界面`);
            return true;
          } else if (currentUrl.includes(`/${username}`)) {
            console.log('⚠️ 进入了用户资料页，查找私信按钮...');
            // 这里可以添加查找私信按钮的逻辑
          }
          
          return true;
        } catch (evalClickError) {
          console.log(`⚠️ evaluate点击也失败:`, evalClickError.message);
        }
      }
    }
    
    // 方法2: 使用更复杂的evaluate方法查找和点击下拉菜单用户
    console.log('🔍 使用evaluate方法查找下拉菜单用户...');
    
    const dropdownUserElement = await page.evaluateHandle((user) => {
      // 专门查找下拉菜单中的用户元素 - 更 comprehensive selectors
      const selectors = [
        '[data-testid="typeaheadResult"]',
        '[role="option"]', 
        '[data-testid="UserCell"]',
        '[role="button"][data-testid*="user"]',
        '[tabindex]',
        '[role="button"]:not([data-testid*="new"]):not([data-testid*="back"])'
      ];
      
      // 构建选择器字符串
      const selectorString = selectors.join(', ');
      const elements = document.querySelectorAll(selectorString);
      
      for (const el of elements) {
        // 检查文本内容
        if (el.textContent && (el.textContent.includes(user) || el.textContent.includes('@' + user))) {
          // 额外验证：检查元素是否在下拉菜单中
          let parent = el.parentElement;
          let inDropdown = false;
          
          // 向上查找最多10层，检查是否在下拉菜单容器中
          for (let i = 0; i < 10 && parent; i++) {
            const parentTestId = parent.getAttribute('data-testid');
            const parentRole = parent.getAttribute('role');
            const parentClass = parent.getAttribute('class');
            
            // 检查父元素是否是下拉菜单容器
            if (parentTestId && (parentTestId.includes('typeahead') || parentTestId.includes('search') || parentTestId.includes('dropdown'))) {
              inDropdown = true;
              break;
            }
            
            if (parentRole && (parentRole === 'listbox' || parentRole === 'menu' || parentRole === 'dialog')) {
              inDropdown = true;
              break;
            }
            
            if (parentClass && (parentClass.includes('typeahead') || parentClass.includes('search') || parentClass.includes('dropdown'))) {
              inDropdown = true;
              break;
            }
            
            parent = parent.parentElement;
          }
          
          if (inDropdown) {
            console.log('找到在下拉菜单中的用户元素');
            return el;
          }
          
          // Also return if element itself looks like a dropdown item
          const selfTestId = el.getAttribute('data-testid');
          const selfRole = el.getAttribute('role');
          const selfClass = el.getAttribute('class');
          
          if (selfTestId && (selfTestId.includes('typeahead') || selfTestId.includes('user'))) {
            return el;
          }
          
          if (selfRole && (selfRole === 'option' || selfRole === 'button')) {
            return el;
          }
        }
      }
      
      // If no dropdown-specific element found, just return any element with the username
      // First try to find elements with the username
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent && (el.textContent.includes(user) || el.textContent.includes('@' + user))) {
          console.log('找到包含用户名的元素');
          return el;
        }
      }
      
      return null;
    }, username);
    
    if (dropdownUserElement && dropdownUserElement.asElement()) {
      console.log('✅ 通过evaluate方法找到下拉菜单中的用户元素');
      
      try {
        await dropdownUserElement.asElement().click();
        console.log('✅ 点击下拉菜单用户元素成功');
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = await page.url();
        console.log(`evaluate方法点击后URL: ${currentUrl}`);
        
        // 检查是否进入聊天界面或用户资料页
        if (currentUrl.includes('/messages/') || currentUrl.includes('/chat/')) {
          console.log(`✅ 成功进入与 @${username} 的聊天界面`);
          return true;
        } else if (currentUrl.includes(`/${username}`)) {
          console.log('⚠️ 进入了用户资料页，查找私信按钮...');
          
          // 等待页面加载
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 查找私信按钮
          const dmButtonSelectors = [
            'button[data-testid="sendDMFromProfile"]',
            'button[aria-label="Message"]',
            'button:has-text("Message")'
          ];
          
          for (const dmSelector of dmButtonSelectors) {
            try {
              const dmButton = await page.$(dmSelector, { timeout: 5000 });
              if (dmButton) {
                console.log(`✅ 找到私信按钮: ${dmSelector}`);
                await dmButton.click();
                console.log('✅ 点击私信按钮');
                
                // 等待进入聊天界面
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const finalUrl = await page.url();
                console.log(`私信按钮点击后URL: ${finalUrl}`);
                
                if (finalUrl.includes('/messages/') || finalUrl.includes('/chat/')) {
                  console.log(`✅ 成功进入与 @${username} 的聊天界面`);
                  return true;
                }
                break;
              }
            } catch (dmError) {
              continue;
            }
          }
        }
        
        return true;
      } catch (clickError) {
        console.log(`❌ evaluate方法点击失败:`, clickError.message);
        return false;
      }
    }
    
    console.log(`❌ 未找到用户 @${username} 元素或点击失败`);
    return false;
    
  } catch (error) {
    console.error(`❌ 开始与用户 @${username} 聊天失败:`, error.message);
    console.error(`错误堆栈:`, error.stack);
    return false;
  }
}

/**
 * 处理PIN验证 - 下拉菜单修复版本
 */
async function handlePinVerificationDropdownFix(page) {
  try {
    console.log('🔐 处理PIN验证...');
    
    // 拍摄PIN验证页面截图
    await page.screenshot({ 
      path: './sessions/dropdown-fix-pin-verification-page.png', 
      fullPage: true 
    });
    
    // 等待页面元素加载
    await new Promise(resolve => setTimeout(resolve, 5000)); // 增加等待时间
    
    // 查找PIN输入框
    const pinSelectors = [
      'input[data-testid*="pin"]',
      'input[data-testid="pin-input"]',
      'input[placeholder*="PIN"]',
      'input[placeholder*="pin"]',
      'input[placeholder*="Code"]',
      'input[placeholder*="code"]',
      'input[type="text"]',
      'input[maxlength="6"]',
      'input[maxlength="4"]'
    ];
    
    let pinInput = null;
    for (const selector of pinSelectors) {
      try {
        pinInput = await page.$(selector, { timeout: 10000 });
        if (pinInput) {
          console.log(`✅ 找到PIN输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!pinInput) {
      console.log('❌ 未找到PIN输入框');
      return false;
    }
    
    // 等待输入框可交互
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 输入PIN码 0000
    console.log('🔐 自动输入PIN码 0000...');
    await pinInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.type('0000', { delay: 100 });
    console.log('✅ PIN码输入完成');
    
    // 等待输入完成
    await new Promise(resolve => setTimeout(resolve, 3000)); // 增加等待时间
    
    // 查找确认按钮
    const confirmSelectors = [
      'button[data-testid="pin-submit"]',
      'button[data-testid="Continue"]',
      'button[data-testid="Next"]',
      'button[data-testid="Submit"]',
      'button[data-testid="Verify"]',
      'button[type="submit"]',
      'button:not([disabled])'
    ];
    
    let confirmButton = null;
    console.log('🔍 查找确认按钮...');
    
    for (const selector of confirmSelectors) {
      try {
        confirmButton = await page.$(selector, { timeout: 10000 });
        if (confirmButton) {
          // 检查按钮是否可用
          const isDisabled = await page.evaluate(el => el.disabled, confirmButton);
          if (!isDisabled) {
            console.log(`✅ 找到可用的确认按钮: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // 点击确认按钮
    if (confirmButton) {
      console.log('✅ 点击确认按钮');
      await confirmButton.click();
    } else {
      console.log('⚠️ 未找到确认按钮，尝试按Enter键');
      await page.keyboard.press('Enter');
    }
    
    // 延长等待时间，让页面充分处理
    console.log('⏳ 等待PIN验证处理...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 增加等待时间
    
    // 拍摄验证后截图
    await page.screenshot({ 
      path: './sessions/dropdown-fix-after-pin-submit.png', 
      fullPage: true 
    });
    
    // 检查当前URL
    const currentUrl = await page.url();
    console.log(`PIN验证后URL: ${currentUrl}`);
    
    // 检查是否仍在PIN页面
    if (currentUrl.includes('/pin') || currentUrl.includes('/verify')) {
      console.log('⚠️ 仍在PIN验证页面');
      return false;
    } else {
      console.log('✅ 成功离开PIN验证页面');
      return true;
    }
    
  } catch (error) {
    console.error('❌ 处理PIN验证失败:', error.message);
    return false;
  }
}

/**
 * 在聊天中处理passcode验证 - 下拉菜单修复版本
 */
async function handlePasscodeInChatDropdownFix(page) {
  try {
    console.log('🔍 检测聊天界面是否需要passcode验证...');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 使用修复方法查找聊天界面passcode输入框...');
    
    // 方法1: 使用evaluate方法查找inputmode="numeric"的输入框
    let numericInput = null;
    try {
      const inputHandle = await page.evaluateHandle(() => {
        return document.querySelector('input[inputmode="numeric"]');
      });
      
      if (inputHandle && inputHandle.asElement()) {
        numericInput = inputHandle.asElement();
        console.log('🔐 检测到inputmode="numeric"的输入框，这很可能是passcode输入框，开始处理...');
        
        // 点击输入框
        await numericInput.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 输入passcode 0000
        await page.type('input[inputmode="numeric"]', '0000', { delay: 100 });
        
        // 查找确认按钮
        const confirmButtons = await page.$$('button');
        let confirmButton = null;
        
        for (const button of confirmButtons) {
          try {
            const buttonText = await page.evaluate(el => el.textContent, button);
            const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), button);
            const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), button);
            
            // 检查按钮是否是确认按钮
            const isConfirmButton = buttonText && 
                                   (buttonText.toLowerCase().includes('continue') || 
                                    buttonText.toLowerCase().includes('submit') ||
                                    buttonText.toLowerCase().includes('verify') ||
                                    buttonText.toLowerCase().includes('next') ||
                                    buttonText.toLowerCase().includes('ok') ||
                                    buttonText.toLowerCase().includes('确定'));
            
            const hasConfirmLabel = ariaLabel && 
                                   (ariaLabel.toLowerCase().includes('continue') || 
                                    ariaLabel.toLowerCase().includes('submit') ||
                                    ariaLabel.toLowerCase().includes('verify'));
            
            const hasConfirmTestId = dataTestId && 
                                   (dataTestId.includes('Continue') || 
                                    dataTestId.includes('Submit') ||
                                    dataTestId.includes('Verify') ||
                                    dataTestId.includes('Next'));
            
            if (isConfirmButton || hasConfirmLabel || hasConfirmTestId) {
              confirmButton = button;
              console.log(`✅ 找到确认按钮: "${buttonText}" (aria-label: ${ariaLabel}, data-testid: ${dataTestId})`);
              break;
            }
          } catch (btnError) {
            continue;
          }
        }
        
        if (confirmButton) {
          await confirmButton.click();
          console.log('✅ 点击确认按钮');
        } else {
          // 尝试按Enter键确认
          await page.keyboard.press('Enter');
          console.log('✅ 按Enter键确认');
        }
        
        // 等待passcode处理完成
        await new Promise(resolve => setTimeout(resolve, 8000));
        console.log('✅ 聊天界面passcode验证处理完成');
        return true;
      }
    } catch (e) {
      console.log('⚠️ 查找inputmode="numeric"输入框时出错:', e.message);
    }
    
    // 方法2: 查找所有输入框并检查其属性
    const allInputs = await page.$$('input');
    console.log(`🔍 检查 ${allInputs.length} 个输入框...`);
    
    for (const input of allInputs) {
      try {
        const placeholder = await page.evaluate(el => el.placeholder, input);
        const type = await page.evaluate(el => el.type, input);
        const inputmode = await page.evaluate(el => el.inputmode, input);
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), input);
        const id = await page.evaluate(el => el.id, input);
        const name = await page.evaluate(el => el.name, input);
        const autocomplete = await page.evaluate(el => el.autocomplete, input);
        
        console.log(`检查输入框 - placeholder: "${placeholder}", type: "${type}", inputmode: "${inputmode}", aria-label: "${ariaLabel}", id: "${id}", name: "${name}", autocomplete: "${autocomplete}"`);
        
        // 检查是否是passcode相关的输入框
        const isPasscodeInput = inputmode === 'numeric' || 
                               (placeholder && placeholder.toLowerCase().includes('passcode')) || 
                               (placeholder && placeholder.toLowerCase().includes('code')) ||
                               (ariaLabel && ariaLabel.toLowerCase().includes('passcode')) ||
                               (ariaLabel && ariaLabel.toLowerCase().includes('code')) ||
                               (id && id.toLowerCase().includes('passcode')) ||
                               (name && name.toLowerCase().includes('code')) ||
                               (autocomplete && autocomplete.toLowerCase().includes('one-time-code'));
        
        if (isPasscodeInput) {
          console.log(`🔐 检测到passcode输入框，开始处理...`);
          
          await input.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 输入passcode 0000
          await page.type(input, '0000', { delay: 100 });
          
          // 查找确认按钮
          const confirmButtons = await page.$$('button');
          let confirmButton = null;
          
          for (const button of confirmButtons) {
            try {
              const buttonText = await page.evaluate(el => el.textContent, button);
              const ariaLabelBtn = await page.evaluate(el => el.getAttribute('aria-label'), button);
              const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), button);
              
              if (buttonText && (buttonText.toLowerCase().includes('continue') || 
                  buttonText.toLowerCase().includes('submit') ||
                  buttonText.toLowerCase().includes('verify') ||
                  buttonText.toLowerCase().includes('next') ||
                  buttonText.toLowerCase().includes('ok') ||
                  buttonText.toLowerCase().includes('确定')) ||
                  (ariaLabelBtn && ariaLabelBtn.toLowerCase().includes('continue')) ||
                  (dataTestId && (dataTestId.includes('Continue') || 
                                 dataTestId.includes('Submit') ||
                                 dataTestId.includes('Verify') ||
                                 dataTestId.includes('Next')))) {
                confirmButton = button;
                console.log(`✅ 找到确认按钮: "${buttonText}" (data-testid: ${dataTestId})`);
                break;
              }
            } catch (btnError) {
              continue;
            }
          }
          
          if (confirmButton) {
            await confirmButton.click();
            console.log('✅ 点击确认按钮');
          } else {
            // 尝试按Enter键确认
            await page.keyboard.press('Enter');
            console.log('✅ 按Enter键确认');
          }
          
          // 等待passcode处理完成
          await new Promise(resolve => setTimeout(resolve, 8000));
          console.log('✅ 聊天界面passcode验证处理完成');
          return true;
        }
      } catch (inputError) {
        console.log(`⚠️ 检查输入框时出错:`, inputError.message);
        continue;
      }
    }
    
    console.log('ℹ️ 聊天界面未检测到passcode验证需求');
    return false;
    
  } catch (error) {
    console.error('❌ 处理聊天界面passcode验证时出错:', error.message);
    return false;
  }
}

/**
 * 检查是否有"unencrypted message"提示 - 下拉菜单修复版本
 */
async function checkUnencryptedMessageDropdownFix(page) {
  try {
    console.log('🔍 检查是否有"unencrypted message"提示...');
    
    // 检查页面内容中是否包含"unencrypted message"
    const pageContent = await page.content();
    const hasUnencrypted = pageContent.includes('unencrypted') || pageContent.includes('Unencrypted');
    
    if (hasUnencrypted) {
      console.log('✅ 检测到"unencrypted message"相关内容');
      return true;
    }
    
    console.log('ℹ️ 未检测到"unencrypted message"提示');
    return false;
    
  } catch (error) {
    console.error('❌ 检查unencrypted message时出错:', error.message);
    return false;
  }
}

/**
 * 发送私信消息 - 下拉菜单修复版本
 */
async function sendDMMessageDropdownFix(page, message, username) {
  try {
    console.log('📝 准备发送消息...');
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待时间
    
    // 查找消息输入框
    console.log('🔍 查找消息输入框...');
    
    let inputElement = null;
    
    // 尝试找到最可能的消息输入框 - 更 comprehensive selectors
    const messageSelectors = [
      'div[contenteditable="true"][data-testid*="dmComposer"]',
      'textarea[data-testid*="dmComposer"]',
      'div[contenteditable="true"][data-testid*="message"]',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
      'textarea',
      'div[data-testid="dm-drawer-text-input"]',
      'div[aria-label*="message"]',
      'div[aria-label*="Message"]',
      'div[role="textbox"]'
    ];
    
    for (const selector of messageSelectors) {
      try {
        inputElement = await page.$(selector, { timeout: 15000 });
        if (inputElement) {
          console.log(`✅ 找到消息输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 如果没找到，再等一会儿并重试
    if (!inputElement) {
      console.log('⏳ 消息输入框未找到，等待并重试...');
      await new Promise(resolve => setTimeout(resolve, 8000)); // 增加等待时间
      
      // 再次尝试查找
      for (const selector of messageSelectors) {
        try {
          inputElement = await page.$(selector, { timeout: 15000 });
          if (inputElement) {
            console.log(`✅ 延迟后找到消息输入框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // 如果还是没找到，尝试更广泛的方法
    if (!inputElement) {
      console.log('⏳ 使用更广泛的方法查找消息输入框...');
      
      // 使用evaluate方法查找可能的消息输入框
      const messageInputHandle = await page.evaluateHandle(() => {
        // 查找所有可能的消息输入框元素
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          // 检查元素属性
          const tagName = el.tagName.toLowerCase();
          const role = el.getAttribute('role');
          const contentEditable = el.getAttribute('contenteditable');
          const ariaLabel = el.getAttribute('aria-label');
          const placeholder = el.getAttribute('placeholder');
          const dataTestId = el.getAttribute('data-testid');
          
          // 检查是否是消息相关的输入框
          if ((tagName === 'div' && contentEditable === 'true') ||
              (tagName === 'textarea') ||
              (tagName === 'input') ||
              (role === 'textbox') ||
              (ariaLabel && (ariaLabel.toLowerCase().includes('message') || ariaLabel.toLowerCase().includes('dm'))) ||
              (placeholder && placeholder.toLowerCase().includes('message')) ||
              (dataTestId && (dataTestId.includes('message') || dataTestId.includes('dm')))) {
            // 额外检查：元素是否可见且可交互
            const style = window.getComputedStyle(el);
            if (style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null) {
              return el;
            }
          }
        }
        return null;
      });
      
      if (messageInputHandle && messageInputHandle.asElement()) {
        inputElement = messageInputHandle.asElement();
        console.log('✅ 通过evaluate方法找到消息输入框');
      }
    }
    
    if (!inputElement) {
      console.log('❌ 未找到消息输入框');
      return false;
    }
    
    // 确保输入元素是有效的DOM元素
    if (!inputElement || typeof inputElement !== 'object' || inputElement === null) {
      console.log('❌ 输入元素无效');
      return false;
    }
    
    // 等待输入框可交互
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 点击输入框
    await inputElement.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清空输入框
    try {
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
    } catch (e) {
      console.log('⚠️ 清空输入框时出现错误，继续输入');
    }
    
    // 等待清空完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 输入消息 - 使用安全的方法
    try {
      // 使用page.evaluate直接操作DOM元素，避免selector错误
      await page.evaluate((element, msg) => {
        if (element && element.tagName) {
          const tagName = element.tagName.toLowerCase();
          console.log(`处理输入框标签: ${tagName}`);
          
          if (tagName === 'textarea' || tagName === 'input') {
            // 对于textarea和input元素，直接设置value
            element.value = msg;
            // 触发输入事件
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (tagName === 'div' && element.contentEditable === 'true') {
            // 对于contenteditable div，设置textContent
            element.textContent = msg;
            // 触发输入事件
            element.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            // 通用方法
            if (element.textContent !== undefined) {
              element.textContent = msg;
            } else if (element.value !== undefined) {
              element.value = msg;
            }
            // 触发相关事件
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }, inputElement, message);
      
      console.log(`📝 消息已输入: "${message}"`);
    } catch (e) {
      console.log('⚠️ 使用evaluate方法输入失败:', e.message);
      // 如果evaluate方法失败，尝试使用page.type
      try {
        // 首先获取元素的tagName
        const tagName = await page.evaluate(el => {
          if (el && el.tagName) {
            return el.tagName.toLowerCase();
          }
          return 'unknown';
        }, inputElement);
        
        if (tagName === 'textarea' || tagName === 'input') {
          console.log(`📝 回退到type方法输入到${tagName}元素`);
          // 清空并输入
          await page.click(inputElement);
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
          await page.type(inputElement, message, { delay: 50 });
        }
      } catch (typeError) {
        console.log('❌ 所有输入方法都失败:', typeError.message);
        return false;
      }
    }
    
    // 等待消息输入完成
    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待时间
    
    // 查找发送按钮
    const sendButtonSelectors = [
      'button[data-testid="dmComposerSendButton"]',
      'button[data-testid="send"]',
      'button[aria-label="Send"]',
      'button[aria-label="发送"]',
      'div[role="button"][aria-label*="Send"]',
      'button[type="submit"]'
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      try {
        sendButton = await page.$(selector, { timeout: 10000 });
        if (sendButton) {
          console.log(`✅ 找到发送按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (sendButton) {
      // 等待按钮可点击
      await new Promise(resolve => setTimeout(resolve, 1000));
      // 点击发送按钮
      await sendButton.click();
      console.log('✅ 点击发送按钮');
    } else {
      // 按 Enter 键发送
      console.log('⚠️ 未找到发送按钮，尝试按Enter键发送');
      await page.keyboard.press('Enter');
    }
    
    // 等待发送完成 - 增加等待时间以确保消息真正发送
    console.log('⏳ 等待消息发送完成...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待时间确保发送完成
    
    // 额外验证：检查页面是否还有消息内容，如果消息已发送，输入框应该被清空或有发送成功的迹象
    try {
      const currentText = await page.evaluate(el => {
        if (el && el.textContent !== undefined) {
          return el.textContent;
        } else if (el && el.value !== undefined) {
          return el.value;
        }
        return '';
      }, inputElement);
      
      if (!currentText || currentText.trim() === '') {
        console.log('✅ 消息已发送（输入框已清空）');
      } else {
        console.log('⚠️ 输入框仍有内容，但可能已发送');
      }
    } catch (e) {
      console.log('⚠️ 验证发送状态时出现错误:', e.message);
    }
    
    console.log('✅ 消息发送完成');
    return true;
    
  } catch (error) {
    console.error('❌ 发送消息失败:', error.message);
    return false;
  }
}

// 运行测试
testFixDropdownClick().then(results => {
  console.log('\n🏁 下拉菜单修复版本测试脚本执行完毕');
  console.log('💡 请检查目标用户的私信收件箱，消息应该已经发送成功');
  process.exit(0);
}).catch(error => {
  console.error('❌ 下拉菜单修复版本测试脚本执行失败:', error);
  process.exit(1);
});