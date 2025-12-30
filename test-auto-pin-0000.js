const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testAutoPIN0000() {
  console.log('🔐 测试自动PIN输入0000功能');
  console.log('=' * 50);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 尝试加载现有cookies
    const cookiesPath = 'cookies/x.com_cookies.json';
    if (fs.existsSync(cookiesPath)) {
      console.log('🍪 加载现有cookies...');
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      await page.setCookie(...cookies);
      console.log(`✅ 已加载 ${cookies.length} 个cookies`);
    } else {
      console.log('⚠️ 未找到cookies文件，直接访问页面');
    }
    
    // 访问X首页检查登录状态
    console.log('🏠 检查登录状态...');
    await page.goto('https://x.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 截图登录状态
    await page.screenshot({ path: 'pin-test-login-status.png' });
    
    // 检查是否已登录
    const loginButton = await page.$('a[href="/login"]');
    const userMenu = await page.$('div[data-testid="AppTabBar_More_Menu"]');
    
    if (loginButton) {
      console.log('❌ 用户未登录');
      console.log('请先运行 save-cookies-for-pin.js 完成登录');
      return;
    } else {
      console.log('✅ 用户已登录');
    }
    
    // 直接访问PIN验证页面来测试自动输入
    console.log('🔐 导航到PIN验证页面...');
    await page.goto('https://x.com/i/chat/pin/recovery', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 截图PIN页面
    await page.screenshot({ path: 'pin-verification-test.png' });
    
    // 查找PIN输入框
    console.log('🔍 查找PIN输入框...');
    const inputSelectors = [
      'input[data-testid*="pin"]',
      'input[placeholder*="PIN"]',
      'input[placeholder*="pin"]',
      'input[placeholder*="Code"]',
      'input[placeholder*="code"]',
      'input[type="text"]',
      'input[type="tel"]',
      'input[maxlength="6"]',
      'input[maxlength="4"]'
    ];
    
    let pinInput = null;
    let foundSelector = '';
    
    for (const selector of inputSelectors) {
      try {
        pinInput = await page.$(selector);
        if (pinInput) {
          foundSelector = selector;
          console.log(`✅ 找到PIN输入框: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ 选择器失败: ${selector} - ${e.message}`);
      }
    }
    
    if (!pinInput) {
      console.log('⚠️ 未找到标准PIN输入框，尝试查找所有输入框');
      const allInputs = await page.$$('input');
      console.log(`找到 ${allInputs.length} 个输入框`);
      
      // 尝试使用第一个文本输入框
      for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
        try {
          const input = allInputs[i];
          const type = await input.evaluate(el => el.type);
          const placeholder = await input.evaluate(el => el.placeholder);
          
          console.log(`输入框 ${i}: type="${type}", placeholder="${placeholder}"`);
          
          if (type === 'text' || type === 'tel') {
            pinInput = input;
            foundSelector = `input[index:${i}]`;
            console.log(`✅ 使用备用输入框 ${i}`);
            break;
          }
        } catch (e) {
          console.log(`输入框 ${i} 检查失败: ${e.message}`);
        }
      }
    }
    
    if (!pinInput) {
      console.log('❌ 未找到任何合适的输入框');
      await page.screenshot({ path: 'pin-no-input-found.png' });
      return;
    }
    
    // 执行自动PIN输入
    console.log('🔐 执行自动PIN输入 0000...');
    
    try {
      // 点击输入框
      await pinInput.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 清空输入框
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      // 输入PIN 0000
      await page.type(pinInput, '0000', { delay: 200 });
      console.log('✅ PIN 0000 输入完成');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 截图输入后状态
      await page.screenshot({ path: 'pin-0000-input-completed.png' });
      
      // 查找确认按钮
      console.log('🔍 查找确认按钮...');
      const buttonSelectors = [
        'button[data-testid*="Continue"]',
        'button[data-testid*="Next"]',
        'button[data-testid*="Submit"]',
        'button[data-testid*="Verify"]',
        'button[type="submit"]',
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Verify")',
        'button:has-text("Submit")',
        'button:has-text("确认")'
      ];
      
      let confirmButton = null;
      let foundButton = '';
      
      for (const selector of buttonSelectors) {
        try {
          confirmButton = await page.$(selector);
          if (confirmButton) {
            foundButton = selector;
            console.log(`✅ 找到确认按钮: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`❌ 按钮选择器失败: ${selector}`);
        }
      }
      
      if (confirmButton) {
        console.log('✅ 点击确认按钮...');
        await confirmButton.click();
      } else {
        console.log('✅ 未找到确认按钮，尝试按Enter键...');
        await page.keyboard.press('Enter');
      }
      
      // 等待验证完成
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 检查结果
      const finalUrl = page.url();
      console.log(`🌐 验证后URL: ${finalUrl}`);
      
      await page.screenshot({ path: 'pin-verification-result.png' });
      
      if (!finalUrl.includes('/pin') && !finalUrl.includes('/verify')) {
        console.log('✅ PIN验证成功！已离开PIN验证页面');
      } else {
        console.log('⚠️ 仍在PIN验证页面，可能需要重新尝试');
      }
      
    } catch (inputError) {
      console.error('❌ PIN输入过程失败:', inputError.message);
      await page.screenshot({ path: 'pin-input-error.png' });
    }
    
    console.log('\n📊 PIN自动输入测试总结:');
    console.log(`- 输入框: ${foundSelector}`);
    console.log(`- 按钮: ${foundButton || '未找到，使用Enter键'}`);
    console.log(`- 最终URL: ${finalUrl}`);
    
  } catch (error) {
    console.error('❌ 测试过程失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('✅ 浏览器已关闭');
  }
}

testAutoPIN0000().catch(console.error);