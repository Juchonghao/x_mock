const puppeteer = require('puppeteer');
const fs = require('fs');

async function fullLoginPINTest() {
  console.log('🧪 完整登录后PIN测试');
  console.log('=' * 50);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 读取cookies
    console.log('🍪 加载认证cookies...');
    const cookiesPath = 'cookies/x.com_cookies.json';
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      await page.setCookie(...cookies);
      console.log(`✅ 已加载 ${cookies.length} 个cookies`);
    } else {
      console.log('⚠️ 未找到cookies文件，尝试手动登录');
    }
    
    // 访问X首页
    console.log('🏠 访问X首页...');
    await page.goto('https://x.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 截图登录状态
    await page.screenshot({ path: 'login-status-check.png' });
    
    // 检查是否已登录
    const loginButton = await page.$('a[href="/login"]');
    const userMenu = await page.$('div[data-testid="AppTabBar_More_Menu"]');
    
    if (loginButton) {
      console.log('❌ 检测到登录按钮，用户未登录');
      console.log('请手动登录后重新运行测试');
      return;
    } else if (userMenu) {
      console.log('✅ 检测到用户菜单，用户已登录');
    } else {
      console.log('⚠️ 登录状态不确定');
    }
    
    // 直接访问私信页面，这可能会触发PIN验证
    console.log('💬 访问私信页面...');
    await page.goto('https://x.com/i/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 截图私信页面
    await page.screenshot({ path: 'dm-page-check.png' });
    
    // 检查当前URL
    const currentUrl = page.url();
    console.log(`🌐 当前页面URL: ${currentUrl}`);
    
    if (currentUrl.includes('/pin') || currentUrl.includes('/verify')) {
      console.log('🔐 检测到PIN验证页面，开始测试PIN输入...');
      
      // 等待页面元素加载
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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
          const className = await input.evaluate(el => el.className);
          
          console.log(`输入框 ${i}: type="${type}", placeholder="${placeholder}", name="${name}", id="${id}"`);
          console.log(`  className: "${className}"`);
          
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
            console.log('✅ PIN输入完成');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 截图输入后状态
            await page.screenshot({ path: 'pin-input-completed.png' });
            
            // 查找按钮并点击
            const buttons = await page.$$('button');
            console.log(`找到 ${buttons.length} 个按钮`);
            
            let clickedButton = false;
            for (let j = 0; j < buttons.length; j++) {
              try {
                const button = buttons[j];
                const text = await button.evaluate(el => el.textContent);
                const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label'));
                const testId = await button.evaluate(el => el.getAttribute('data-testid'));
                
                console.log(`按钮 ${j}: text="${text}", aria-label="${ariaLabel}", data-testid="${testId}"`);
                
                // 尝试点击可能的确认按钮
                if (text && (text.toLowerCase().includes('continue') || text.toLowerCase().includes('next') || text.toLowerCase().includes('verify') || text.toLowerCase().includes('submit'))) {
                  console.log(`✅ 点击确认按钮: "${text}"`);
                  await button.click();
                  clickedButton = true;
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  break;
                }
              } catch (e) {
                console.log(`按钮 ${j} 检查失败: ${e.message}`);
              }
            }
            
            // 如果没有找到文本按钮，尝试按Enter
            if (!clickedButton) {
              console.log('尝试按Enter键...');
              await page.keyboard.press('Enter');
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // 等待验证完成
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 检查是否还在PIN页面
            const afterUrl = page.url();
            console.log(`验证后URL: ${afterUrl}`);
            
            if (!afterUrl.includes('/pin') && !afterUrl.includes('/verify')) {
              console.log('✅ 成功离开PIN验证页面');
            } else {
              console.log('⚠️ 仍在PIN验证页面');
            }
            
            break;
          }
        } catch (e) {
          console.log(`输入框 ${i} 处理失败: ${e.message}`);
        }
      }
    } else {
      console.log('ℹ️ 未检测到PIN验证页面');
      
      // 尝试点击新建对话或消息按钮来触发PIN验证
      console.log('🔍 查找消息相关按钮...');
      const messageButtons = await page.$$('button, a[href*="message"], div[role="button"]');
      
      for (const button of messageButtons) {
        try {
          const text = await button.evaluate(el => el.textContent);
          const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label'));
          const href = await button.evaluate(el => el.getAttribute('href'));
          
          if (text && (text.toLowerCase().includes('message') || text.toLowerCase().includes('chat'))) {
            console.log(`✅ 找到消息按钮: "${text}"`);
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const newUrl = page.url();
            console.log(`点击后URL: ${newUrl}`);
            
            if (newUrl.includes('/pin') || newUrl.includes('/verify')) {
              console.log('🔐 PIN验证页面已触发');
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // 最终截图
    await page.screenshot({ path: 'final-pin-test-result.png' });
    console.log('✅ 完整测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

fullLoginPINTest().catch(console.error);