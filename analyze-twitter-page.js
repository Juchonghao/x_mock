const { chromium } = require('playwright');

async function analyzeTwitterPage() {
  let browser;
  let page;
  
  try {
    console.log('🔍 分析 Twitter 页面结构...');
    
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    
    console.log('🔐 设置认证Cookie...');
    
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: '748a8409eb2899a437671f25a5e7687ac6415107',
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'ct0',
        value: 'fa95bade309fd481de3e379e8dccc1c1eca5999fe015464744a0b7f6965efc64d3832be7bf2b684aed91c7976130ea4b0cd328fbdc25759de6ceed7f3bb18392ef0bb603fe4c91bd9184c67891f9addd',
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'personalization_id',
        value: 'v1_zXh80kSutP2xpPJtstwSAA==',
        domain: '.twitter.com',
        path: '/',
        secure: true
      }
    ]);
    
    console.log('🌐 访问 @jack 页面...');
    
    await page.goto('https://twitter.com/jack', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('📍 当前页面URL:', page.url());
    
    // 等待页面加载完成
    await page.waitForTimeout(5000);
    
    console.log('\n🔍 详细分析页面元素...');
    
    // 查找所有按钮元素
    const allButtons = await page.$$('button, div[role="button"], [data-testid]');
    console.log(`📊 找到 ${allButtons.length} 个可交互元素`);
    
    // 分析前 20 个元素
    for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
      try {
        const element = allButtons[i];
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const text = await element.innerText();
        const ariaLabel = await element.getAttribute('aria-label');
        const dataTestId = await element.getAttribute('data-testid');
        const role = await element.getAttribute('role');
        
        console.log(`\n元素 ${i + 1}:`);
        console.log(`  - 标签: ${tagName}`);
        console.log(`  - 文本: "${text}"`);
        console.log(`  - aria-label: "${ariaLabel}"`);
        console.log(`  - data-testid: "${dataTestId}"`);
        console.log(`  - role: "${role}"`);
        
        // 检查是否与关注相关
        const combinedText = `${text} ${ariaLabel} ${dataTestId} ${role}`.toLowerCase();
        if (combinedText.includes('follow') || combinedText.includes('关注')) {
          console.log(`  ✅ 这是关注相关元素！`);
        }
        
      } catch (error) {
        console.log(`元素 ${i + 1}: 读取失败 - ${error.message}`);
      }
    }
    
    // 特别查找关注按钮的各种可能选择器
    console.log('\n🎯 查找关注按钮（多种策略）...');
    
    const followSelectors = [
      'button:has-text("Follow")',
      'button:has-text("关注")',
      'div[role="button"]:has-text("Follow")',
      'div[role="button"]:has-text("关注")',
      '[data-testid="follow"]',
      '[data-testid*="follow"]',
      '[aria-label*="Follow"]',
      '[aria-label*="关注"]'
    ];
    
    for (const selector of followSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ 选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (let i = 0; i < Math.min(elements.length, 2); i++) {
            const text = await elements[i].innerText();
            const ariaLabel = await elements[i].getAttribute('aria-label');
            console.log(`  元素 ${i + 1}: "${text}" (aria: "${ariaLabel}")`);
          }
        } else {
          console.log(`❌ 选择器 "${selector}" 未找到元素`);
        }
      } catch (error) {
        console.log(`❌ 选择器 "${selector}" 失败: ${error.message}`);
      }
    }
    
    // 保存页面截图用于调试
    await page.screenshot({ path: 'twitter-page-debug.png' });
    console.log('📸 页面截图已保存为 twitter-page-debug.png');
    
    // 检查页面是否需要登录
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      console.log('⚠️ 检测到登录页面，认证可能失败');
    } else {
      console.log('✅ 认证有效，已成功访问 Twitter 页面');
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔄 浏览器已关闭');
    }
  }
}

analyzeTwitterPage().then(() => {
  console.log('\n🎯 页面分析完成！');
}).catch(console.error);