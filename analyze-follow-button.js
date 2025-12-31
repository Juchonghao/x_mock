const { chromium } = require('playwright');
const fs = require('fs');

async function analyzeFollowButton() {
  console.log('🔍 详细分析页面结构，寻找关注按钮...\n');

  let browser;
  let page;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 2000
    });
    
    page = await browser.newPage();
    
    console.log('🍪 设置Auth Token Cookie...');
    
    // 设置认证Cookie
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

    const testUser = 'elonmusk';
    console.log(`🔗 访问用户页面: @${testUser}`);
    
    await page.goto(`https://twitter.com/${testUser}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    await page.waitForTimeout(8000);
    
    // 滚动到页面中间，确保用户信息部分可见
    console.log('📜 滚动页面以确保用户信息可见...');
    await page.evaluate(() => {
      window.scrollTo(0, 1000);
    });
    
    await page.waitForTimeout(3000);
    
    // 截图查看当前状态
    await page.screenshot({ path: 'after_scroll_analysis.png' });
    console.log('📸 已保存滚动后截图');

    // 分析页面结构 - 查找所有可能的按钮
    console.log('🔍 分析页面结构...');
    
    const pageStructure = await page.evaluate(() => {
      const structure = [];
      
      // 查找所有按钮和交互元素
      const buttons = document.querySelectorAll('button, div[role="button"], [data-testid], [aria-label]');
      
      buttons.forEach((btn, index) => {
        if (index < 50) { // 只分析前50个
          const info = {
            tagName: btn.tagName,
            textContent: btn.textContent?.trim() || '',
            dataTestId: btn.getAttribute('data-testid') || '',
            ariaLabel: btn.getAttribute('aria-label') || '',
            className: btn.className || '',
            role: btn.getAttribute('role') || ''
          };
          structure.push(info);
        }
      });
      
      return structure;
    });

    console.log(`📋 找到 ${pageStructure.length} 个交互元素:`);
    pageStructure.forEach((element, index) => {
      if (element.textContent || element.dataTestId) {
        console.log(`${index + 1}. 标签: ${element.tagName}`);
        console.log(`   文本: "${element.textContent}"`);
        console.log(`   data-testid: "${element.dataTestId}"`);
        console.log(`   aria-label: "${element.ariaLabel}"`);
        console.log(`   类名: "${element.className}"`);
        console.log('---');
      }
    });

    // 专门查找关注相关的按钮
    console.log('🎯 查找关注相关的按钮...');
    
    const followElements = await page.$$eval('*', elements => {
      return elements
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          const dataTestId = el.getAttribute('data-testid')?.toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          
          return text.includes('follow') || 
                 text.includes('关注') || 
                 text.includes('following') ||
                 text.includes('互相关注') ||
                 dataTestId === 'follow' ||
                 ariaLabel.includes('follow') ||
                 ariaLabel.includes('关注');
        })
        .slice(0, 10)
        .map(el => ({
          tagName: el.tagName,
          textContent: el.textContent?.trim() || '',
          dataTestId: el.getAttribute('data-testid') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          className: el.className || ''
        }));
    });

    console.log(`🔍 找到 ${followElements.length} 个关注相关元素:`);
    followElements.forEach((element, index) => {
      console.log(`${index + 1}. 标签: ${element.tagName}`);
      console.log(`   文本: "${element.textContent}"`);
      console.log(`   data-testid: "${element.dataTestId}"`);
      console.log(`   aria-label: "${element.ariaLabel}"`);
      console.log(`   类名: "${element.className}"`);
      console.log('---');
    });

    // 尝试点击页面中的关注按钮
    if (followElements.length > 0) {
      console.log('✅ 找到关注相关元素，尝试点击...');
      
      const targetText = followElements[0].textContent;
      const targetDataTestId = followElements[0].dataTestId;
      
      let targetSelector;
      if (targetDataTestId) {
        targetSelector = `[data-testid="${targetDataTestId}"]`;
      } else if (targetText) {
        targetSelector = `*:has-text("${targetText}")`;
      }
      
      if (targetSelector) {
        try {
          const followButton = await page.$(targetSelector);
          if (followButton) {
            console.log(`🖱️ 尝试点击关注按钮: ${targetSelector}`);
            await followButton.click();
            await page.waitForTimeout(5000);
            
            // 检查点击后的状态
            const updatedButton = await page.$(targetSelector);
            if (updatedButton) {
              const updatedText = await updatedButton.innerText();
              console.log(`🔄 点击后按钮文本: "${updatedText}"`);
              
              const updatedTrimmed = updatedText.trim().toLowerCase();
              const isNowFollowing = updatedTrimmed.includes('正在关注') || 
                                   updatedTrimmed.includes('following') ||
                                   updatedTrimmed.includes('following you') ||
                                   updatedTrimmed.includes('互相关注');

              if (isNowFollowing) {
                console.log(`🎉 关注成功！`);
                await page.screenshot({ path: 'follow_success.png' });
                return { success: true, message: '关注成功' };
              } else {
                console.log(`❌ 关注失败或状态未更新`);
                await page.screenshot({ path: 'follow_failed.png' });
                return { success: false, message: '关注失败' };
              }
            }
          }
        } catch (clickError) {
          console.log(`❌ 点击失败: ${clickError.message}`);
        }
      }
    }

    return { 
      success: false, 
      message: '未能找到或点击关注按钮',
      elementsFound: followElements.length,
      pageStructure: pageStructure.slice(0, 10)
    };

  } catch (error) {
    console.error('❌ 分析过程中出错:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      console.log('\n🔚 浏览器保持开启供手动检查...');
    }
  }
}

// 运行分析
analyzeFollowButton().then(result => {
  console.log('\n📋 分析结果:');
  console.log(`- 成功: ${result?.success || false}`);
  console.log(`- 消息: ${result?.message || 'N/A'}`);
  if (result?.elementsFound) {
    console.log(`- 找到关注元素: ${result.elementsFound} 个`);
  }
  if (result?.error) {
    console.log(`- 错误: ${result.error}`);
  }
}).catch(error => {
  console.error('💥 分析失败:', error);
});