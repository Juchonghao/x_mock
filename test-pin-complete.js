const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testPinInputOnLocalPage() {
  console.log('🔐 测试本地PIN页面自动输入功能');
  console.log('=' * 60);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 获取当前目录的绝对路径
    const currentDir = process.cwd();
    const pinPagePath = `file://${currentDir}/test-pin-page.html`;
    
    console.log(`📄 访问本地PIN测试页面: ${pinPagePath}`);
    await page.goto(pinPagePath, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 截图初始状态
    await page.screenshot({ path: 'pin-test-initial.png' });
    console.log('✅ 页面已加载，截图保存');
    
    // 测试自动PIN输入功能
    console.log('🔐 开始测试自动PIN输入功能...');
    
    // 查找PIN输入框
    const pinSelectors = [
      'input[data-testid="pin-input"]',
      'input[placeholder*="PIN"]',
      'input[placeholder*="pin"]',
      'input[type="text"]',
      '#pin'
    ];
    
    let pinInput = null;
    let foundSelector = '';
    
    for (const selector of pinSelectors) {
      try {
        pinInput = await page.$(selector);
        if (pinInput) {
          foundSelector = selector;
          console.log(`✅ 找到PIN输入框: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ 选择器失败: ${selector}`);
      }
    }
    
    if (!pinInput) {
      console.log('❌ 未找到PIN输入框');
      return;
    }
    
    // 执行自动PIN输入
    console.log('🔐 执行自动PIN输入 0000...');
    
    // 点击输入框
    await pinInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清空输入框
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    
    // 输入PIN 0000
    await page.type(pinInput, '0000', { delay: 150 });
    console.log('✅ PIN 0000 输入完成');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 截图输入后状态
    await page.screenshot({ path: 'pin-test-after-input.png' });
    
    // 查找并点击提交按钮
    console.log('🔍 查找提交按钮...');
    const buttonSelectors = [
      'button[type="button"]',
      'button[class="submit-btn"]',
      'button:has-text("验证PIN")',
      'button:has-text("验证")',
      'button'
    ];
    
    let submitButton = null;
    let foundButton = '';
    
    for (const selector of buttonSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          const text = await submitButton.evaluate(el => el.textContent);
          if (text && text.includes('验证')) {
            foundButton = selector;
            console.log(`✅ 找到提交按钮: ${selector} (${text})`);
            break;
          }
        }
      } catch (e) {
        console.log(`❌ 按钮选择器失败: ${selector}`);
      }
    }
    
    if (submitButton) {
      console.log('✅ 点击提交按钮...');
      await submitButton.click();
    } else {
      console.log('✅ 未找到按钮，尝试按Enter键...');
      await page.keyboard.press('Enter');
    }
    
    // 等待验证完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查结果
    await page.screenshot({ path: 'pin-test-result.png' });
    
    // 检查页面内容
    const statusElement = await page.$('#status');
    if (statusElement) {
      const statusText = await statusElement.evaluate(el => el.textContent);
      const displayStyle = await statusElement.evaluate(el => el.style.display);
      
      console.log('📋 验证结果:');
      console.log(`- 状态文本: ${statusText}`);
      console.log(`- 显示状态: ${displayStyle}`);
      
      if (statusText.includes('✅') && displayStyle === 'block') {
        console.log('🎉 PIN自动输入测试成功！');
      } else {
        console.log('⚠️ PIN验证可能失败，请检查结果');
      }
    }
    
    // 再次截图以查看最终状态
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'pin-test-final.png' });
    
    console.log('\n📊 PIN自动输入测试总结:');
    console.log(`- 输入框选择器: ${foundSelector}`);
    console.log(`- 按钮选择器: ${foundButton}`);
    console.log('- 测试页面: 本地HTML页面');
    console.log('- 输入内容: 0000');
    console.log('- 期望结果: PIN验证成功');
    
    // 如果成功，说明我们的PIN输入逻辑是正确的
    // 现在我们需要解决真实X网站的cookies和登录问题
    
  } catch (error) {
    console.error('❌ 测试过程失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('✅ 浏览器已关闭');
  }
}

// 测试DMService中的PIN处理逻辑
async function testDMPinLogic() {
  console.log('\n🧪 测试DMService PIN处理逻辑');
  console.log('=' * 50);
  
  // 导入DMService
  const DMService = require('./src/services/dmService');
  const dmService = new DMService();
  
  try {
    // 初始化服务
    console.log('📡 初始化DM服务...');
    await dmService.initialize();
    
    // 模拟PIN验证流程
    console.log('🔐 测试PIN验证逻辑...');
    
    // 访问本地PIN测试页面
    const currentDir = process.cwd();
    const pinPagePath = `file://${currentDir}/test-pin-page.html`;
    
    await dmService.page.goto(pinPagePath, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 拍摄页面截图
    await dmService.screenshot('dm-pin-test-page.png');
    
    // 测试我们的PIN处理逻辑
    console.log('🔐 执行DMService的PIN处理逻辑...');
    const pinResult = await dmService.handlePinVerification();
    
    console.log(`PIN处理结果: ${pinResult ? '成功' : '失败'}`);
    
    await dmService.screenshot('dm-pin-test-result.png');
    
  } catch (error) {
    console.error('❌ DMService测试失败:', error.message);
  } finally {
    await dmService.cleanup();
    console.log('✅ DMService测试完成');
  }
}

async function main() {
  await testPinInputOnLocalPage();
  await testDMPinLogic();
  
  console.log('\n🎯 结论:');
  console.log('如果本地PIN页面测试成功，说明我们的自动输入逻辑是正确的。');
  console.log('接下来需要解决的是X网站的登录和cookies问题。');
  console.log('\n建议下一步:');
  console.log('1. 运行 save-cookies-for-pin.js 完成登录认证');
  console.log('2. 在有cookies的情况下重新测试');
}

main().catch(console.error);