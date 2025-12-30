#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

const DMService = require('./src/services/dmService');

/**
 * 完整处理PIN验证的私信发送测试
 * 目标用户: kent236896, allen180929, fred_0201, Alex09936200
 */
async function testSpecificUsersDMPINHandled() {
  console.log('🚀 开始完整处理PIN验证的私信发送测试');
  console.log('🎯 目标用户: kent236896, allen180929, fred_0201, Alex09936200');
  console.log('=' .repeat(70));

  const dmService = new DMService();
  
  // 设置目标用户
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

  try {
    // 初始化服务
    console.log('📡 初始化私信服务...');
    await dmService.initialize();
    console.log('✅ 服务初始化完成');
    
    // 注入认证cookies
    console.log('\n🍪 注入认证cookies...');
    await dmService.injectCookies('https://x.com');
    console.log('✅ Cookies注入完成');
    
    // 检查登录状态
    console.log('\n🔍 检查登录状态...');
    const isLoggedIn = await dmService.checkLoginStatus();
    
    if (!isLoggedIn) {
      console.log('❌ 用户未登录，终止测试');
      return testResults;
    }
    
    console.log('✅ 登录状态检查完成');
    
    // 逐个处理每个用户
    console.log(`\n📝 开始给 ${targetUsers.length} 个用户发送私信...`);

    for (let i = 0; i < targetUsers.length; i++) {
      const username = targetUsers[i];
      console.log(`\n--- 处理用户 ${i + 1}/${targetUsers.length}: @${username} ---`);
      
      try {
        // 导航到用户页面
        console.log(`🔗 访问用户 @${username} 的页面...`);
        await dmService.page.goto(`https://x.com/${username}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot(`pin-handled-user-${username}-page.png`);
        
        // 检查用户是否存在
        const pageContent = await dmService.page.content();
        if (pageContent.includes('Sorry, this page does not exist') || 
            pageContent.includes('抱歉，此页面不存在') ||
            dmService.page.url().includes('/i/flow/login')) {
          console.log(`❌ 用户 @${username} 不存在或页面无法访问`);
          testResults.failedUsers.push({ username, reason: '用户不存在或页面无法访问' });
          continue;
        }
        
        // 查找并点击私信按钮
        console.log(`💬 查找并点击私信按钮...`);
        const dmOpened = await openDMFromUserProfile(dmService, username);
        
        if (!dmOpened) {
          console.log(`❌ 无法打开与 @${username} 的私信对话框`);
          testResults.failedUsers.push({ username, reason: '无法打开私信对话框' });
          continue;
        }
        
        // 检查是否需要PIN验证
        const currentUrl = dmService.page.url();
        console.log(`当前URL: ${currentUrl}`);
        
        if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
          console.log(`🔐 检测到需要PIN验证，处理PIN验证...`);
          
          const pinSuccess = await dmService.handlePinVerification();
          
          if (!pinSuccess) {
            console.log(`❌ PIN验证失败，无法继续给 @${username} 发送私信`);
            testResults.failedUsers.push({ username, reason: 'PIN验证失败' });
            continue;
          }
          
          console.log(`✅ PIN验证成功，继续发送私信...`);
          
          // PIN验证后，等待页面加载完成
          await new Promise(resolve => setTimeout(resolve, 5000));
          await dmService.screenshot(`pin-handled-after-pin-${username}.png`);
        }
        
        // 等待对话框完全加载
        await new Promise(resolve => setTimeout(resolve, 3000));
        await dmService.screenshot(`pin-handled-dm-ready-${username}.png`);
        
        // 检查是否已经可以看到消息输入框
        console.log(`🔍 检查是否已处于可发送状态...`);
        const isReady = await checkIfDMReady(dmService);
        
        if (!isReady) {
          console.log(`⚠️ 未检测到可发送状态，等待更多时间...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          await dmService.screenshot(`pin-handled-check-after-delay-${username}.png`);
        }
        
        // 准备个性化消息
        const message = `你好 @${username}！这是一条来自X自动化机器人的测试私信。希望你一切顺利！🤖`;
        
        console.log(`📝 发送私信内容: "${message}"`);
        const messageSent = await sendDMMessage(dmService, message);
        
        if (messageSent) {
          console.log(`✅ 成功发送私信给 @${username}`);
          testResults.successCount++;
          testResults.successUsers.push(username);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          await dmService.screenshot(`pin-handled-message-sent-${username}.png`);
          
        } else {
          console.log(`❌ 发送私信给 @${username} 失败`);
          testResults.failedUsers.push({ username, reason: '发送失败' });
        }
        
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
    console.log('\n📊 PIN处理版测试结果报告');
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
    await dmService.screenshot('pin-handled-test-complete.png');
    
  } catch (error) {
    console.error('❌ 测试过程中出现严重错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理资源
    console.log('\n🧹 清理资源...');
    await dmService.cleanup();
    console.log('✅ 测试完成');
  }
  
  return testResults;
}

/**
 * 从用户资料页面打开私信
 */
async function openDMFromUserProfile(dmService, username) {
  try {
    console.log(`🔍 在 @${username} 的页面上查找私信按钮...`);
    
    // 拍摄当前页面截图
    await dmService.screenshot(`open-dm-${username}-before.png`);
    
    // 多种方式查找私信按钮 - 优先使用 aria-label
    const dmSelectors = [
      'a[aria-label="Message"]',
      'a[aria-label="Send a message"]',
      'div[role="button"][aria-label="Message"]',
      'div[role="button"][aria-label="Send a message"]',
      'button[data-testid="messageButton"]',
      'button[data-testid="DM_Button"]',
      'div[data-testid="DM_Button"]'
    ];
    
    let dmButton = null;
    for (const selector of dmSelectors) {
      try {
        dmButton = await dmService.page.$(selector);
        if (dmButton) {
          console.log(`✅ 找到私信按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 如果标准选择器没找到，尝试文本匹配
    if (!dmButton) {
      console.log('⚠️ 标准选择器未找到，尝试文本匹配...');
      const buttons = await dmService.page.$$('button, div[role="button"], a');
      for (const button of buttons) {
        try {
          const text = await dmService.page.evaluate(el => el.textContent || '', button);
          const ariaLabel = await dmService.page.evaluate(el => el.getAttribute('aria-label') || '', button);
          
          if (text.includes('Message') || ariaLabel.includes('Message') || 
              text.includes('私信') || ariaLabel.includes('私信') ||
              text.includes('Chat') || ariaLabel.includes('Chat')) {
            dmButton = button;
            console.log(`✅ 通过文本匹配找到私信按钮: "${text || ariaLabel}"`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!dmButton) {
      console.log('❌ 未找到私信按钮');
      return false;
    }
    
    // 点击私信按钮
    console.log('💬 点击私信按钮...');
    await dmButton.click();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 拍摄点击后的截图
    await dmService.screenshot(`open-dm-${username}-after-click.png`);
    
    // 检查当前页面状态
    const currentUrl = dmService.page.url();
    console.log(`点击后URL: ${currentUrl}`);
    
    // 如果跳转到了PIN验证页面，返回true，让后续逻辑处理
    if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
      console.log('🔐 检测到PIN验证页面，需要处理PIN验证');
      return true;
    }
    
    // 检查是否出现对话框或输入框
    const inputSelectors = [
      'div[contenteditable="true"]',
      'textarea',
      'input[placeholder*="Message"]',
      'div[contenteditable="true"][data-testid*="message"]'
    ];
    
    for (const selector of inputSelectors) {
      try {
        const inputElement = await dmService.page.$(selector);
        if (inputElement) {
          console.log(`✅ 找到消息输入框: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 如果没有立即找到输入框，等待一段时间再检查
    console.log('⏳ 等待对话框加载...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await dmService.screenshot(`open-dm-${username}-waiting.png`);
    
    // 再次检查输入框
    for (const selector of inputSelectors) {
      try {
        const inputElement = await dmService.page.$(selector);
        if (inputElement) {
          console.log(`✅ 延迟后找到消息输入框: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('❌ 未找到消息输入框');
    return false;
    
  } catch (error) {
    console.error('❌ 打开私信失败:', error.message);
    return false;
  }
}

/**
 * 检查私信对话框是否已准备好发送消息
 */
async function checkIfDMReady(dmService) {
  try {
    console.log('🔍 检查私信是否已准备好发送...');
    
    // 检查是否有消息输入框
    const inputSelectors = [
      'div[contenteditable="true"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="消息"]',
      'div[contenteditable="true"][data-testid*="message"]',
      'div[contenteditable="true"][data-testid*="dm"]',
      'div[contenteditable="true"][data-testid*="composer"]'
    ];
    
    for (const selector of inputSelectors) {
      try {
        const inputElement = await dmService.page.$(selector);
        if (inputElement) {
          console.log(`✅ 找到消息输入框: ${selector}`);
          
          // 检查输入框是否可见
          const isVisible = await inputElement.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   el.offsetWidth > 0 && 
                   el.offsetHeight > 0;
          });
          
          if (isVisible) {
            console.log('✅ 消息输入框可见且可用');
            return true;
          } else {
            console.log('⚠️ 消息输入框存在但不可见');
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // 检查页面URL是否在聊天页面
    const currentUrl = dmService.page.url();
    if (currentUrl.includes('/chat') && !currentUrl.includes('/pin')) {
      console.log('✅ 当前在聊天页面，可以发送消息');
      return true;
    }
    
    console.log('❌ 未检测到可发送状态');
    return false;
    
  } catch (error) {
    console.error('❌ 检查私信状态失败:', error.message);
    return false;
  }
}

/**
 * 发送私信消息
 */
async function sendDMMessage(dmService, message) {
  try {
    console.log('📝 准备发送消息...');
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 查找消息输入框
    const inputSelectors = [
      'div[contenteditable="true"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="消息"]',
      'div[contenteditable="true"][data-testid*="message"]',
      'div[contenteditable="true"][data-testid*="dm"]',
      'div[contenteditable="true"][data-testid*="composer"]'
    ];
    
    let inputElement = null;
    for (const selector of inputSelectors) {
      try {
        inputElement = await dmService.page.$(selector);
        if (inputElement) {
          console.log(`✅ 找到消息输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!inputElement) {
      console.log('❌ 未找到消息输入框');
      return false;
    }
    
    // 点击输入框
    await inputElement.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清空输入框
    try {
      await dmService.page.keyboard.down('Control');
      await dmService.page.keyboard.press('A');
      await dmService.page.keyboard.up('Control');
      await dmService.page.keyboard.press('Backspace');
    } catch (e) {
      console.log('⚠️ 清空输入框时出现错误，继续输入');
    }
    
    // 输入消息
    await dmService.page.type(inputElement, message, { delay: 50 });
    console.log(`📤 输入消息完成: "${message}"`);
    
    // 等待消息输入完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 查找发送按钮
    const sendButtonSelectors = [
      'button[data-testid="dmComposerSendButton"]',
      'button[data-testid="send"]',
      'button[aria-label="Send"]',
      'button[aria-label="发送"]',
      'div[role="button"][aria-label*="Send"]'
    ];
    
    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      try {
        sendButton = await dmService.page.$(selector);
        if (sendButton) {
          console.log(`✅ 找到发送按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (sendButton) {
      // 点击发送按钮
      await sendButton.click();
      console.log('✅ 点击发送按钮');
    } else {
      // 按 Enter 键发送
      console.log('⚠️ 未找到发送按钮，尝试按Enter键发送');
      await dmService.page.keyboard.press('Enter');
    }
    
    // 等待发送完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ 消息发送完成');
    return true;
    
  } catch (error) {
    console.error('❌ 发送消息失败:', error.message);
    return false;
  }
}

// 运行测试
testSpecificUsersDMPINHandled().then(results => {
  console.log('\n🏁 PIN处理版测试脚本执行完毕');
  process.exit(0);
}).catch(error => {
  console.error('❌ PIN处理版测试脚本执行失败:', error);
  process.exit(1);
});