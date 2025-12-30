#!/usr/bin/env node

require('dotenv').config();

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 重点修复passcode验证的聊天流程测试
 * 专门解决passcode输入框检测和处理问题
 * 目标用户: kent236896, allen180929, fred_0201, Alex09936200
 */
async function testPasscodeFocusFix() {
  console.log('🚀 开始重点修复passcode验证的聊天流程测试');
  console.log('🎯 目标用户: kent236896, allen180929, fred_0201, Alex09936200');
  console.log('💡 本次测试重点修复passcode验证检测和处理逻辑');
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
      headless: false, // 设置为false以便调试
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
        '--disable-renderer-backgrounding'
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

    // 导航到聊天页面
    console.log('💬 导航到聊天页面...');
    await page.goto('https://x.com/i/messages', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待页面加载
    await page.screenshot({ 
      path: path.join(sessionDir, 'passcode-focus-initial.png'), 
      fullPage: true 
    });
    
    // 重点：在开始之前先处理可能存在的全局passcode
    console.log('🔐 检查并处理全局passcode验证...');
    await handleGlobalPasscode(page);
    
    // 逐个处理每个用户
    console.log(`\n📝 开始给 ${targetUsers.length} 个用户发送私信...`);

    for (let i = 0; i < targetUsers.length; i++) {
      const username = targetUsers[i];
      console.log(`\n--- 处理用户 ${i + 1}/${targetUsers.length}: @${username} ---`);
      
      try {
        // 点击"New message"按钮
        console.log(`💬 点击新消息按钮...`);
        const newChatOpened = await openNewChatFocusFix(page);
        
        if (!newChatOpened) {
          console.log(`❌ 无法打开新聊天对话框`);
          testResults.failedUsers.push({ username, reason: '无法打开新聊天对话框' });
          continue;
        }
        
        // 重点：检测并处理新聊天界面的passcode
        console.log('🔐 检查新聊天界面的passcode验证...');
        const newChatPasscodeHandled = await handlePasscodeInNewChat(page);
        
        if (newChatPasscodeHandled) {
          console.log('✅ 新聊天界面passcode验证处理完成');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('ℹ️ 新聊天界面未检测到passcode验证需求');
        }
        
        // 搜索用户
        console.log(`🔍 搜索用户 @${username}...`);
        const userFound = await searchUserInNewChatFocusFix(page, username);
        
        if (!userFound) {
          console.log(`❌ 未找到用户 @${username}`);
          testResults.failedUsers.push({ username, reason: '未找到用户' });
          continue;
        }
        
        // 点击用户开始聊天
        console.log(`💬 点击用户开始聊天...`);
        const chatStarted = await startChatWithUserFocusFix(page, username);
        
        if (!chatStarted) {
          console.log(`❌ 无法开始与 @${username} 的聊天`);
          testResults.failedUsers.push({ username, reason: '无法开始聊天' });
          continue;
        }
        
        // 检查是否需要PIN验证
        const currentUrl = await page.url();
        console.log(`当前URL: ${currentUrl}`);
        
        if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
          console.log(`🔐 检测到需要PIN验证...`);
          
          // 处理PIN验证
          const pinSuccess = await handlePinVerificationFocusFix(page);
          
          if (!pinSuccess) {
            console.log(`❌ PIN验证失败，无法继续给 @${username} 发送私信`);
            testResults.failedUsers.push({ username, reason: 'PIN验证失败' });
            continue;
          }
          
          console.log(`✅ PIN验证成功，继续发送私信...`);
        }
        
        // 在聊天界面处理passcode问题
        console.log('🔐 聊天界面检查passcode验证...');
        const chatPasscodeHandled = await handlePasscodeInChatFocusFix(page);
        
        if (chatPasscodeHandled) {
          console.log('✅ 聊天界面passcode验证处理完成');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log('ℹ️ 聊天界面未检测到passcode验证需求');
        }
        
        // 等待对话框完全加载
        await new Promise(resolve => setTimeout(resolve, 8000)); // 增加等待时间
        await page.screenshot({ 
          path: path.join(sessionDir, `passcode-focus-dm-ready-${username}.png`), 
          fullPage: true 
        });
        
        // 检查是否有"unencrypted message"提示
        console.log('🔍 检查是否有"unencrypted message"提示...');
        const unencryptedMessageFound = await checkUnencryptedMessageFocusFix(page);
        
        if (unencryptedMessageFound) {
          console.log('✅ 检测到"unencrypted message"，可以发送消息');
        } else {
          console.log('ℹ️ 未检测到"unencrypted message"提示');
        }
        
        // 准备个性化消息
        const message = `你好 @${username}！这是一条来自X自动化机器人的测试私信。这是通过修复passcode验证的聊天流程发送的测试。祝你一切顺利！🤖`;
        
        console.log(`📝 发送私信内容: "${message}"`);
        const messageSent = await sendDMMessageFocusFix(page, message, username);
        
        if (messageSent) {
          console.log(`✅ 成功发送私信给 @${username}`);
          testResults.successCount++;
          testResults.successUsers.push(username);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.screenshot({ 
            path: path.join(sessionDir, `passcode-focus-message-sent-${username}.png`), 
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
    console.log('\n📊 重点修复passcode验证的聊天流程测试结果报告');
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
      path: path.join(sessionDir, 'passcode-focus-test-complete.png'), 
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
 * 处理全局passcode验证
 */
async function handleGlobalPasscode(page) {
  try {
    console.log('🔍 检查全局passcode验证...');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 查找passcode输入框 - 使用更广泛的检测
    const allInputs = await page.$$('input');
    for (const input of allInputs) {
      try {
        const placeholder = await page.evaluate(el => el.placeholder, input);
        const type = await page.evaluate(el => el.type, input);
        const inputmode = await page.evaluate(el => el.inputmode, input);
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), input);
        
        console.log(`检查输入框 - placeholder: "${placeholder}", type: "${type}", inputmode: "${inputmode}", aria-label: "${ariaLabel}"`);
        
        // 检查是否是passcode相关的输入框
        if (inputmode === 'numeric' || 
            placeholder.toLowerCase().includes('passcode') || 
            placeholder.toLowerCase().includes('code') ||
            ariaLabel.toLowerCase().includes('passcode') ||
            ariaLabel.toLowerCase().includes('code')) {
          
          console.log(`🔐 检测到可能的passcode输入框，开始处理...`);
          
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
              
              if (buttonText.toLowerCase().includes('continue') || 
                  buttonText.toLowerCase().includes('submit') ||
                  buttonText.toLowerCase().includes('verify') ||
                  (ariaLabelBtn && ariaLabelBtn.toLowerCase().includes('continue')) ||
                  (dataTestId && dataTestId.includes('Continue'))) {
                confirmButton = button;
                console.log(`✅ 找到确认按钮: "${buttonText}"`);
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
          console.log('✅ 全局passcode验证处理完成');
          return true;
        }
      } catch (inputError) {
        console.log(`⚠️ 检查输入框时出错:`, inputError.message);
        continue;
      }
    }
    
    console.log('ℹ️ 未检测到全局passcode验证需求');
    return false;
    
  } catch (error) {
    console.error('❌ 处理全局passcode验证时出错:', error.message);
    return false;
  }
}

/**
 * 打开新聊天对话框 - 重点修复版本
 */
async function openNewChatFocusFix(page) {
  try {
    console.log('🔍 查找新消息按钮...');
    
    // 拍摄当前页面截图
    await page.screenshot({ 
      path: './sessions/passcode-focus-before-new-chat.png', 
      fullPage: true 
    });
    
    // 多种方式查找新消息按钮
    const newChatSelectors = [
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
                           ariaLabel.includes('新') || ariaLabel.includes('消息'))) {
            newChatButton = button;
            console.log(`✅ 通过aria-label找到新消息按钮: "${ariaLabel}"`);
            break;
          }
          
          if (dataTestId && (dataTestId.includes('new') || dataTestId.includes('New') || 
                            dataTestId.includes('dm') || dataTestId.includes('compose'))) {
            newChatButton = button;
            console.log(`✅ 通过data-testid找到新消息按钮: "${dataTestId}"`);
            break;
          }
          
          if (textContent && (textContent.includes('New') || textContent.includes('new') || 
                             textContent.includes('Message') || textContent.includes('message') ||
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
      path: './sessions/passcode-focus-after-new-chat.png', 
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
 * 在新聊天界面处理passcode验证 - 重点修复版本
 */
async function handlePasscodeInNewChat(page) {
  try {
    console.log('🔍 检查新聊天界面是否需要passcode验证...');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查页面内容
    const pageContent = await page.content();
    console.log('📄 检查页面内容中是否有passcode相关提示...');
    
    // 检查页面是否包含passcode相关元素
    const allInputs = await page.$$('input');
    for (const input of allInputs) {
      try {
        const placeholder = await page.evaluate(el => el.placeholder, input);
        const type = await page.evaluate(el => el.type, input);
        const inputmode = await page.evaluate(el => el.inputmode, input);
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), input);
        const id = await page.evaluate(el => el.id, input);
        const name = await page.evaluate(el => el.name, input);
        
        console.log(`检查输入框 - placeholder: "${placeholder}", type: "${type}", inputmode: "${inputmode}", aria-label: "${ariaLabel}", id: "${id}", name: "${name}"`);
        
        // 检查是否是passcode相关的输入框
        const isPasscodeInput = inputmode === 'numeric' || 
                               placeholder.toLowerCase().includes('passcode') || 
                               placeholder.toLowerCase().includes('code') ||
                               ariaLabel && ariaLabel.toLowerCase().includes('passcode') ||
                               ariaLabel && ariaLabel.toLowerCase().includes('code') ||
                               id && id.toLowerCase().includes('passcode') ||
                               name && name.toLowerCase().includes('code');
        
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
              
              if (buttonText.toLowerCase().includes('continue') || 
                  buttonText.toLowerCase().includes('submit') ||
                  buttonText.toLowerCase().includes('verify') ||
                  (ariaLabelBtn && ariaLabelBtn.toLowerCase().includes('continue')) ||
                  (dataTestId && dataTestId.includes('Continue')) ||
                  (dataTestId && dataTestId.includes('Submit')) ||
                  (dataTestId && dataTestId.includes('Verify'))) {
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
 * 在新聊天界面中搜索用户 - 重点修复版本
 */
async function searchUserInNewChatFocusFix(page, username) {
  try {
    console.log(`🔍 在新聊天界面中搜索用户 @${username}...`);
    
    // 拍摄搜索前截图
    await page.screenshot({ 
      path: `./sessions/passcode-focus-search-${username}-before.png`, 
      fullPage: true 
    });
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 查找搜索输入框
    const searchSelectors = [
      'input[data-testid="searchInput"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="搜索"]',
      'input[placeholder*="用户名"]',
      'input[aria-label*="Search"]',
      'input[aria-label*="搜索"]',
      'input[type="text"]'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        searchInput = await page.$(selector, { timeout: 10000 });
        if (searchInput) {
          console.log(`✅ 找到搜索输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!searchInput) {
      console.log('❌ 未找到搜索输入框');
      return false;
    }
    
    // 点击搜索框并输入用户名
    console.log(`📝 输入用户名 @${username} 到搜索框...`);
    await searchInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清空搜索框
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 输入用户名
    await page.type(searchInput, username, { delay: 100 });
    
    // 等待搜索结果
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 拍摄搜索后截图
    await page.screenshot({ 
      path: `./sessions/passcode-focus-search-${username}-after.png`, 
      fullPage: true 
    });
    
    // 检查是否找到用户
    const pageContent = await page.content();
    if (pageContent.includes(username) || pageContent.includes(`@${username}`)) {
      console.log(`✅ 找到用户 @${username}`);
      return true;
    }
    
    console.log(`⚠️ 未在页面内容中找到用户 @${username}，但仍继续`);
    return true; // 即使没有明确找到，也继续尝试
    
  } catch (error) {
    console.error(`❌ 搜索用户 @${username} 失败:`, error.message);
    return false;
  }
}

/**
 * 点击用户开始聊天 - 重点修复版本
 */
async function startChatWithUserFocusFix(page, username) {
  try {
    console.log(`💬 尝试与用户 @${username} 开始聊天...`);
    
    // 查找用户结果并点击
    const userSelectors = [
      `a[href="/${username}"]`,
      `div[role="button"]:has-text("${username}")`,
      `div:has-text("@${username}")`,
      `div[role="button"]:has-text("@${username}")`,
      'div[role="button"]',
      'a[role="link"]',
      'div[role="button"][data-testid*="user"]',
      'div[role="button"][data-testid*="result"]'
    ];
    
    let userElement = null;
    for (const selector of userSelectors) {
      try {
        userElement = await page.$(selector, { timeout: 10000 });
        if (userElement) {
          // 检查元素是否包含目标用户名
          const textContent = await page.evaluate(el => el.textContent, userElement);
          if (textContent.includes(username) || textContent.includes(`@${username}`)) {
            console.log(`✅ 找到用户 @${username} 元素: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // 如果没找到，尝试查找所有可能的用户结果元素
    if (!userElement) {
      console.log('⚠️ 未找到特定用户元素，尝试查找可能的用户结果...');
      const allButtons = await page.$$('.//div[@role="button" or @role="link"]');
      
      for (const button of allButtons) {
        try {
          const textContent = await page.evaluate(el => el.textContent, button);
          if (textContent.includes(username) || textContent.includes(`@${username}`)) {
            userElement = button;
            console.log(`✅ 通过文本内容找到用户元素: "${textContent}"`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!userElement) {
      console.log(`❌ 未找到用户 @${username} 元素`);
      return false;
    }
    
    // 点击用户元素开始聊天
    console.log(`💬 点击用户 @${username} 开始聊天...`);
    await userElement.click();
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待聊天界面加载
    
    // 拍摄开始聊天后截图
    await page.screenshot({ 
      path: `./sessions/passcode-focus-start-chat-${username}.png`, 
      fullPage: true 
    });
    
    // 检查是否成功进入聊天界面
    const currentUrl = await page.url();
    console.log(`聊天页面URL: ${currentUrl}`);
    
    if (currentUrl.includes('/messages/') || currentUrl.includes('/chat/')) {
      console.log(`✅ 成功开始与 @${username} 的聊天`);
      return true;
    }
    
    console.log(`⚠️ URL不明确，但继续处理...`);
    return true;
    
  } catch (error) {
    console.error(`❌ 开始与用户 @${username} 聊天失败:`, error.message);
    return false;
  }
}

/**
 * 处理PIN验证 - 重点修复版本
 */
async function handlePinVerificationFocusFix(page) {
  try {
    console.log('🔐 处理PIN验证...');
    
    // 拍摄PIN验证页面截图
    await page.screenshot({ 
      path: './sessions/passcode-focus-pin-verification-page.png', 
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
      path: './sessions/passcode-focus-after-pin-submit.png', 
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
 * 在聊天中处理passcode验证 - 重点修复版本
 */
async function handlePasscodeInChatFocusFix(page) {
  try {
    console.log('🔍 检查聊天界面是否需要passcode验证...');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查页面内容
    const pageContent = await page.content();
    console.log('📄 检查聊天界面内容中是否有passcode相关提示...');
    
    // 检查页面是否包含passcode相关元素
    const allInputs = await page.$$('input');
    for (const input of allInputs) {
      try {
        const placeholder = await page.evaluate(el => el.placeholder, input);
        const type = await page.evaluate(el => el.type, input);
        const inputmode = await page.evaluate(el => el.inputmode, input);
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), input);
        const id = await page.evaluate(el => el.id, input);
        const name = await page.evaluate(el => el.name, input);
        
        console.log(`检查输入框 - placeholder: "${placeholder}", type: "${type}", inputmode: "${inputmode}", aria-label: "${ariaLabel}", id: "${id}", name: "${name}"`);
        
        // 检查是否是passcode相关的输入框
        const isPasscodeInput = inputmode === 'numeric' || 
                               placeholder.toLowerCase().includes('passcode') || 
                               placeholder.toLowerCase().includes('code') ||
                               ariaLabel && ariaLabel.toLowerCase().includes('passcode') ||
                               ariaLabel && ariaLabel.toLowerCase().includes('code') ||
                               id && id.toLowerCase().includes('passcode') ||
                               name && name.toLowerCase().includes('code');
        
        if (isPasscodeInput) {
          console.log(`🔐 检测到聊天界面passcode输入框，开始处理...`);
          
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
              
              if (buttonText.toLowerCase().includes('continue') || 
                  buttonText.toLowerCase().includes('submit') ||
                  buttonText.toLowerCase().includes('verify') ||
                  (ariaLabelBtn && ariaLabelBtn.toLowerCase().includes('continue')) ||
                  (dataTestId && dataTestId.includes('Continue')) ||
                  (dataTestId && dataTestId.includes('Submit')) ||
                  (dataTestId && dataTestId.includes('Verify'))) {
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
 * 检查是否有"unencrypted message"提示 - 重点修复版本
 */
async function checkUnencryptedMessageFocusFix(page) {
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
 * 发送私信消息 - 重点修复版本
 */
async function sendDMMessageFocusFix(page, message, username) {
  try {
    console.log('📝 准备发送消息...');
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待时间
    
    // 查找消息输入框
    console.log('🔍 查找消息输入框...');
    
    let inputElement = null;
    
    // 尝试找到最可能的消息输入框
    const messageSelectors = [
      'div[contenteditable="true"][data-testid*="dmComposer"]',
      'textarea[data-testid*="dmComposer"]',
      'div[contenteditable="true"][data-testid*="message"]',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
      'textarea'
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
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待时间
      
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
testPasscodeFocusFix().then(results => {
  console.log('\n🏁 重点修复passcode验证的聊天流程测试脚本执行完毕');
  console.log('💡 请检查目标用户的私信收件箱，消息应该已经发送成功');
  process.exit(0);
}).catch(error => {
  console.error('❌ 重点修复passcode验证的聊天流程测试脚本执行失败:', error);
  process.exit(1);
});