const puppeteer = require('puppeteer');

async function simplePINTest() {
  console.log('🧪 简化PIN输入测试');
  console.log('=' * 40);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 访问PIN验证页面
    console.log('🔐 导航到PIN验证页面...');
    await page.goto('https://x.com/i/chat/pin/recovery', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 截图
    await page.screenshot({ path: 'simple-pin-test-page.png' });
    console.log('✅ 页面截图保存');
    
    // 查找所有输入框
    const inputs = await page.$$('input');
    console.log(`找到 ${inputs.length} 个输入框`);
    
    for (let i = 0; i < inputs.length; i++) {
      try {
        const input = inputs[i];
        const type = await input.evaluate(el => el.type);
        const placeholder = await input.evaluate(el => el.placeholder);
        const name = await input.evaluate(el => el.name);
        const id = await input.evaluate(el => el.id);
        
        console.log(`输入框 ${i}: type="${type}", placeholder="${placeholder}", name="${name}", id="${id}"`);
        
        // 如果是文本输入框，尝试输入
        if (type === 'text' || type === 'tel') {
          console.log(`🔐 尝试在输入框 ${i} 中输入0000...`);
          
          await input.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 清空
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          
          // 输入PIN
          await page.type(input, '0000', { delay: 100 });
          console.log('✅ 输入完成');
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 截图
          await page.screenshot({ path: 'simple-pin-input-done.png' });
          
          // 查找按钮并点击
          const buttons = await page.$$('button');
          console.log(`找到 ${buttons.length} 个按钮`);
          
          for (let j = 0; j < buttons.length; j++) {
            try {
              const button = buttons[j];
              const text = await button.evaluate(el => el.textContent);
              const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label'));
              const testId = await button.evaluate(el => el.getAttribute('data-testid'));
              
              console.log(`按钮 ${j}: text="${text}", aria-label="${ariaLabel}", data-testid="${testId}"`);
              
              // 尝试点击可能的确认按钮
              if (text && (text.toLowerCase().includes('continue') || text.toLowerCase().includes('next') || text.toLowerCase().includes('verify'))) {
                console.log(`✅ 点击确认按钮: "${text}"`);
                await button.click();
                await new Promise(resolve => setTimeout(resolve, 3000));
                break;
              }
            } catch (e) {
              console.log(`按钮 ${j} 检查失败: ${e.message}`);
            }
          }
          
          // 如果没有找到文本按钮，尝试按Enter
          console.log('尝试按Enter键...');
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          break;
        }
      } catch (e) {
        console.log(`输入框 ${i} 处理失败: ${e.message}`);
      }
    }
    
    // 最终截图
    await page.screenshot({ path: 'simple-pin-final.png' });
    console.log('✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

simplePINTest().catch(console.error);