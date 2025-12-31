const { chromium } = require("playwright");
const authConfig = require("./config/auth");

(async () => {
  try {
    console.log("🚀 开始简单关注测试...");
    
    if (!authConfig.twitter.isConfigured()) {
      throw new Error("认证配置不完整");
    }
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log("🍪 设置认证Cookie...");
    const cookies = authConfig.twitter.getPlaywrightCookies();
    await context.addCookies(cookies);
    
    console.log("🌐 访问Twitter...");
    await page.goto("https://twitter.com/jack");
    await page.waitForTimeout(5000);
    
    console.log("📸 截图...");
    await page.screenshot({ path: "simple-test-result.png" });
    
    console.log("🔍 查找关注按钮...");
    const followButton = await page.$("button[data-testid=\"follow\"]");
    
    if (followButton) {
      const text = await followButton.innerText();
      console.log("📝 按钮文本:", text);
      
      if (text.toLowerCase().includes("following") || text.toLowerCase().includes("正在关注")) {
        console.log("✅ 已经关注");
      } else {
        console.log("🖱️ 点击关注...");
        await followButton.click();
        await page.waitForTimeout(8000);
        
        const newText = await followButton.innerText();
        const success = newText.toLowerCase().includes("following") || newText.toLowerCase().includes("正在关注");
        console.log("🎯 结果:", success ? "成功" : "失败");
        
        await page.screenshot({ path: "after-click-result.png" });
      }
    } else {
      console.log("❌ 未找到关注按钮");
      
      // 尝试其他选择器
      console.log("🔍 尝试其他选择器...");
      const otherSelectors = [
        'button:has-text("关注")',
        'button:has-text("Follow")'
      ];
      
      for (const selector of otherSelectors) {
        const button = await page.$(selector);
        if (button) {
          console.log("✅ 找到按钮:", selector);
          const text = await button.innerText();
          console.log("📝 按钮文本:", text);
          break;
        }
      }
    }
    
    await browser.close();
    console.log("✅ 测试完成");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error("❌ 错误详情:", error);
  }
})();