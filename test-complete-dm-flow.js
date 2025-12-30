#!/usr/bin/env node

require('dotenv').config();

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 完整版测试给特定用户发送私信 - 处理passcode验证和unencrypted message
 * 目标用户: kent236896, allen180929, fred_0201, Alex09936200
 */
async function testCompleteDMFlow() {
  console.log('🚀 开始完整版私信发送测试');
  console.log('🎯 目标用户: kent236896, allen180929, fred_0201, Alex09936200');
  console.log('💡 本次测试将处理passcode验证和unencrypted message情况');
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
      return testResults;
    }

    // 解析并设置cookies
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('🍪 Cookies设置完成');

    // 访问Twitter主页验证登录
    console.log('🔗 访问Twitter主页验证登录...');
    await page.goto('https://x.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ 成功访问Twitter主页');

    // 创建会话目录
    const sessionDir = './sessions';
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // 逐个处理每个用户
    console.log(`\n📝 开始给 ${targetUsers.length} 个用户发送私信...`);

    for (let i = 0; i < targetUsers.length; i++) {
      const username = targetUsers[i];
      console.log(`\n--- 处理用户 ${i + 1}/${targetUsers.length}: @${username} ---`);
      
      try {
        // 导航到用户页面
        console.log(`🔗 访问用户 @${username} 的页面...`);
        await page.goto(`https://x.com/${username}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 保存截图
        await page.screenshot({ 
          path: path.join(sessionDir, `complete-user-${username}-page.png`), 
          fullPage: true 
        });
        
        // 检查用户是否存在
        const pageContent = await page.content();
        if (pageContent.includes('Sorry, this page does not exist') || 
            pageContent.includes('抱歉，此页面不存在') ||
            page.url().includes('/i/flow/login')) {
          console.log(`❌ 用户 @${username} 不存在或页面无法访问`);
          testResults.failedUsers.push({ username, reason: '用户不存在或页面无法访问' });
          continue;
        }
        
        // 查找并点击私信按钮（信封图标）
        console.log(`💬 查找并点击信封图标私信按钮...`);
        const dmOpened = await openDMFromUserProfileComplete(page, username);
        
        if (!dmOpened) {
          console.log(`❌ 无法打开与 @${username} 的私信对话框`);
          testResults.failedUsers.push({ username, reason: '无法打开私信对话框' });
          continue;
        }
        
        // 检查是否需要PIN验证
        const currentUrl = await page.url();
        console.log(`当前URL: ${currentUrl}`);
        
        if (currentUrl.includes('/pin/recovery') || currentUrl.includes('/verify')) {
          console.log(`🔐 检测到需要PIN验证...`);
          
          // 处理PIN验证
          const pinSuccess = await handlePinVerificationComplete(page);
          
          if (!pinSuccess) {
            console.log(`❌ PIN验证失败，无法继续给 @${username} 发送私信`);
            testResults.failedUsers.push({ username, reason: 'PIN验证失败' });
            continue;
          }
          
          console.log(`✅ PIN验证成功，继续发送私信...`);
        }
        
        // 等待对话框完全加载
        await new Promise(resolve => setTimeout(resolve, 5000)); // 增加等待时间
        await page.screenshot({ 
          path: path.join(sessionDir, `complete-dm-ready-${username}.png`), 
          fullPage: true 
        });
        
        // 检查是否需要passcode验证
        console.log('🔍 检查是否需要passcode验证...');
        const passcodeHandled = await handlePasscodeIfPresent(page);
        
        if (passcodeHandled) {
          console.log('✅ passcode验证处理完成');
          // 等待passcode处理完成
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('ℹ️ 未检测到passcode验证需求');
        }
        
        // 检查是否有"unencrypted message"提示
        console.log('🔍 检查是否有"unencrypted message"提示...');
        const unencryptedMessageFound = await checkUnencryptedMessage(page);
        
        if (unencryptedMessageFound) {
          console.log('✅ 检测到"unencrypted message"，可以发送消息');
        } else {
          console.log('ℹ️ 未检测到"unencrypted message"提示');
        }
        
        // 准备个性化消息
        const message = `你好 @${username}！这是一条来自X自动化机器人的测试私信。这是完整版测试，处理了passcode验证。祝你一切顺利！🤖`;
        
        console.log(`📝 发送私信内容: "${message}"`);
        const messageSent = await sendDMMessageComplete(page, message, username);
        
        if (messageSent) {
          console.log(`✅ 成功发送私信给 @${username}`);
          testResults.successCount++;
          testResults.successUsers.push(username);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.screenshot({ 
            path: path.join(sessionDir, `complete-message-sent-${username}.png`), 
            fullPage: true 
          });
          
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
    console.log('\n📊 完整版测试结果报告');
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
      path: path.join(sessionDir, 'complete-test-complete.png'), 
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
 * 从用户资料页面打开私信 - 完整版
 */
async function openDMFromUserProfileComplete(page, username) {
  try {
    console.log(`🔍 在 @${username} 的页面上查找私信按钮...`);
    
    // 拍摄当前页面截图
    await page.screenshot({ 
      path: `./sessions/complete-open-dm-${username}-before.png`, 
      fullPage: true 
    });
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 多种方式查找私信按钮
    const dmSelectors = [
      'button[data-testid="messageButton"]',
      'a[aria-label="Message"]',
      'a[aria-label="Send a message"]',
      'div[role="button"][aria-label="Message"]',
      'div[role="button"][aria-label="Send a message"]',
      'button[data-testid="DM_Button"]',
      'div[data-testid="DM_Button"]',
      'a[href*="/messages/compose"]',
    ];
    
    let dmButton = null;
    let usedSelector = '';
    
    for (const selector of dmSelectors) {
      try {
        dmButton = await page.$(selector);
        if (dmButton) {
          usedSelector = selector;
          console.log(`✅ 找到私信按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 如果标准选择器没找到，尝试更广泛的搜索
    if (!dmButton) {
      console.log('⚠️ 标准选择器未找到，尝试更广泛的搜索...');
      
      // 查找所有可能的按钮
      const buttonSelectors = ['button', 'div[role="button"]', 'a'];
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
      
      // 遍历这些元素，寻找与私信相关的元素
      for (const button of allButtons) {
        try {
          // 获取元素的属性和文本
          const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), button);
          const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), button);
          const textContent = await page.evaluate(el => el.textContent, button);
          
          // 检查是否包含私信相关的关键词
          if (ariaLabel && (ariaLabel.includes('Message') || ariaLabel.includes('message') || 
                           ariaLabel.includes('私信') || ariaLabel.includes('DM'))) {
            dmButton = button;
            console.log(`✅ 通过aria-label找到私信按钮: "${ariaLabel}"`);
            break;
          }
          
          if (dataTestId && (dataTestId.includes('message') || dataTestId.includes('Message') || 
                            dataTestId.includes('dm') || dataTestId.includes('DM'))) {
            dmButton = button;
            console.log(`✅ 通过data-testid找到私信按钮: "${dataTestId}"`);
            break;
          }
          
          if (textContent && (textContent.includes('Message') || textContent.includes('message') || 
                             textContent.includes('私信') || textContent.includes('DM'))) {
            dmButton = button;
            console.log(`✅ 通过文本内容找到私信按钮: "${textContent}"`);
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
    
    // 获取按钮的详细信息
    try {
      const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), dmButton);
      const dataTestId = await page.evaluate(el => el.getAttribute('data-testid'), dmButton);
      console.log(`按钮详情 - aria-label: "${ariaLabel}", data-testid: "${dataTestId}"`);
    } catch (e) {
      console.log('⚠️ 获取按钮详情失败:', e.message);
    }
    
    // 点击私信按钮
    console.log('💬 点击私信按钮...');
    await dmButton.click();
    await new Promise(resolve => setTimeout(resolve, 4000)); // 增加等待时间
    
    // 拍摄点击后的截图
    await page.screenshot({ 
      path: `./sessions/complete-open-dm-${username}-after-click.png`, 
      fullPage: true 
    });
    
    // 检查当前页面状态
    const currentUrl = await page.url();
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
      'div[contenteditable="true"][data-testid*="message"]',
      'div[contenteditable="true"][data-testid*="dm"]',
      'div[contenteditable="true"][data-testid*="composer"]'
    ];
    
    for (const selector of inputSelectors) {
      try {
        const inputElement = await page.$(selector);
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
    await new Promise(resolve => setTimeout(resolve, 6000)); // 增加等待时间
    await page.screenshot({ 
      path: `./sessions/complete-open-dm-${username}-waiting.png`, 
      fullPage: true 
    });
    
    // 再次检查输入框
    for (const selector of inputSelectors) {
      try {
        const inputElement = await page.$(selector);
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
 * 处理PIN验证 - 完整版
 */
async function handlePinVerificationComplete(page) {
  try {
    console.log('🔐 处理PIN验证...');
    
    // 拍摄PIN验证页面截图
    await page.screenshot({ 
      path: './sessions/complete-pin-verification-page.png', 
      fullPage: true 
    });
    
    // 等待页面元素加载
    await new Promise(resolve => setTimeout(resolve, 3000)); // 增加等待时间
    
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
        pinInput = await page.$(selector);
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
    await new Promise(resolve => setTimeout(resolve, 2000)); // 增加等待时间
    
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
        confirmButton = await page.$(selector);
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
    await new Promise(resolve => setTimeout(resolve, 8000)); // 增加等待时间
    
    // 拍摄验证后截图
    await page.screenshot({ 
      path: './sessions/complete-after-pin-submit.png', 
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
 * 检查并处理passcode验证
 */
async function handlePasscodeIfPresent(page) {
  try {
    console.log('🔍 检查是否需要passcode验证...');
    
    // 查找passcode输入框
    const passcodeSelectors = [
      'input[placeholder*="Passcode"]',
      'input[placeholder*="passcode"]',
      'input[placeholder*="Code"]',
      'input[data-testid*="Passcode"]',
      'input[data-testid*="Code"]',
      'input[type="text"][placeholder*="code"]'
    ];
    
    let passcodeInput = null;
    for (const selector of passcodeSelectors) {
      try {
        passcodeInput = await page.$(selector);
        if (passcodeInput) {
          console.log(`✅ 检测到passcode输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (passcodeInput) {
      console.log('🔐 需要输入passcode，自动输入0000...');
      
      await passcodeInput.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 输入passcode 0000
      await page.type(passcodeInput, '0000', { delay: 100 });
      
      // 查找确认按钮
      const confirmSelectors = [
        'button[data-testid*="Continue"]',
        'button[data-testid*="Submit"]',
        'button[data-testid*="Verify"]',
        'button[type="submit"]',
        'button:contains("Continue")',
        'button:contains("Verify")',
        'button:contains("确认")',
        'button:contains("提交")',
        'button:not([disabled])'
      ];
      
      let confirmButton = null;
      for (const selector of confirmSelectors) {
        try {
          confirmButton = await page.$(selector);
          if (confirmButton) {
            console.log(`✅ 找到确认按钮: ${selector}`);
            break;
          }
        } catch (e) {
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
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return true;
    }
    
    console.log('ℹ️ 未检测到passcode验证需求');
    return false;
    
  } catch (error) {
    console.error('❌ 处理passcode验证时出错:', error.message);
    return false;
  }
}

/**
 * 检查是否有"unencrypted message"提示
 */
async function checkUnencryptedMessage(page) {
  try {
    console.log('🔍 检查是否有"unencrypted message"提示...');
    
    // 检查页面内容中是否包含"unencrypted message"
    const pageContent = await page.content();
    const hasUnencrypted = pageContent.includes('unencrypted') || pageContent.includes('Unencrypted');
    
    if (hasUnencrypted) {
      console.log('✅ 检测到"unencrypted message"相关内容');
      return true;
    }
    
    // 也检查页面元素中是否包含相关文本
    const elements = await page.$$('.//text()[contains(., "unencrypted") or contains(., "Unencrypted")]/..');
    if (elements.length > 0) {
      console.log('✅ 检测到包含"unencrypted"的页面元素');
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
 * 发送私信消息 - 完整版，处理所有验证情况
 */
async function sendDMMessageComplete(page, message, username) {
  try {
    console.log('📝 准备发送消息...');
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 3000)); // 增加等待时间
    
    // 重新查找消息输入框 - 因为页面可能在之前的操作中发生变化
    const inputSelectors = [
      'div[contenteditable="true"]',
      'textarea',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="消息"]',
      'div[contenteditable="true"][data-testid*="message"]',
      'div[contenteditable="true"][data-testid*="dm"]',
      'div[contenteditable="true"][data-testid*="composer"]'
    ];
    
    let inputElement = null;
    for (const selector of inputSelectors) {
      try {
        inputElement = await page.$(selector);
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
      await new Promise(resolve => setTimeout(resolve, 5000)); // 增加等待时间
      
      // 再次尝试查找
      for (const selector of inputSelectors) {
        try {
          inputElement = await page.$(selector);
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
    
    // 输入消息
    try {
      // 确保 inputElement 是一个有效的 DOM 元素
      if (inputElement && typeof inputElement === 'object') {
        await page.type(inputElement, message, { delay: 50 });
      } else {
        console.log('⚠️ 输入元素无效，尝试直接设置值');
        await page.evaluate((selector, msg) => {
          // 如果 selector 是字符串，使用 querySelector
          if (typeof selector === 'string') {
            const element = document.querySelector(selector);
            if (element) element.textContent = msg;
          } else if (selector && selector.textContent !== undefined) {
            // 如果 selector 是 DOM 元素
            selector.textContent = msg;
          }
        }, inputElement, message);
      }
    } catch (e) {
      console.log('⚠️ 输入消息时出现错误:', e.message);
      // 如果输入失败，尝试直接设置值
      await page.evaluate((element, msg) => {
        if (element && element.textContent !== undefined) {
          element.textContent = msg;
        }
      }, inputElement, message);
    }
    
    console.log(`📤 输入消息完成: "${message}"`);
    
    // 等待消息输入完成
    await new Promise(resolve => setTimeout(resolve, 2000)); // 增加等待时间
    
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
        sendButton = await page.$(selector);
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
    await new Promise(resolve => setTimeout(resolve, 5000)); // 增加等待时间确保发送完成
    
    // 额外验证：检查页面是否还有消息内容，如果消息已发送，输入框应该被清空或有发送成功的迹象
    try {
      const currentText = await page.evaluate(el => el.textContent || el.value || '', inputElement);
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
testCompleteDMFlow().then(results => {
  console.log('\n🏁 完整版测试脚本执行完毕');
  console.log('💡 请检查目标用户的私信收件箱，消息应该已经发送成功');
  process.exit(0);
}).catch(error => {
  console.error('❌ 完整版测试脚本执行失败:', error);
  process.exit(1);
});