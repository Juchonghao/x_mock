const { chromium } = require("playwright");
const authConfig = require("./config/auth");

(async () => {
  try {
    console.log("🚀 开始真实关注测试...");
    
    if (!authConfig.twitter.isConfigured()) {
      throw new Error("认证配置不完整");
    }
    
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log("🍪 设置认证Cookie...");
    const cookies = authConfig.twitter.getPlaywrightCookies();
    await context.addCookies(cookies);
    
    console.log("🌐 访问Twitter...");
    await page.goto("https://twitter.com/jack");
    await page.waitForTimeout(5000);
    
    console.log("📸 初始截图...");
    await page.screenshot({ path: "before-follow.png" });
    
    console.log("🔍 查找关注按钮...");
    const followButton = await page.$("button:has-text('Follow')");
    
    if (followButton) {
      const text = await followButton.innerText();
      console.log("📝 按钮文本:", text);
      
      if (text.toLowerCase().includes("following") || text.toLowerCase().includes("正在关注")) {
        console.log("✅ 已经关注");
      } else {
        console.log("🖱️ 执行关注操作...");
        
        // 模拟人类行为
        await page.mouse.move(0, 0);
        await page.waitForTimeout(1000);
        await followButton.hover();
        await page.waitForTimeout(500);
        
        // 点击关注按钮
        await followButton.click();
        console.log("⏳ 等待关注结果...");
        await page.waitForTimeout(8000);
        
        const newText = await followButton.innerText();
        console.log("📝 点击后按钮文本:", newText);
        
        const success = newText.toLowerCase().includes("following") || 
                       newText.toLowerCase().includes("正在关注") ||
                       newText.toLowerCase().includes("unfollow");
        
        console.log("🎯 关注结果:", success ? "成功" : "失败");
        
        await page.screenshot({ path: "after-follow.png" });
        console.log("📸 结果截图已保存");
        
        if (success) {
          console.log("🎉 关注操作成功完成！");
        } else {
          console.log("⚠️ 关注可能失败，检查是否有确认弹窗...");
          
          // 查找确认按钮
          try {
            const confirmButton = await page.$("button:has-text('Confirm'), button:has-text('确认')");
            if (confirmButton) {
              console.log("🔍 发现确认按钮，点击...");
              await confirmButton.click();
              await page.waitForTimeout(3000);
              
              const finalText = await followButton.innerText();
              const finalSuccess = finalText.toLowerCase().includes("following") || 
                                 finalText.toLowerCase().includes("正在关注");
              console.log("🎯 确认后关注结果:", finalSuccess ? "成功" : "失败");
            }
          } catch (error) {
            console.log("❌ 确认流程失败:", error.message);
          }
        }
      }
    } else {
      console.log("❌ 未找到关注按钮");
      
      // 检查页面内容
      const pageContent = await page.content();
      console.log("📄 页面内容分析:");
      
      if (pageContent.includes("Log in") || pageContent.includes("登录")) {
        console.log("⚠️ 页面显示未登录状态");
      } else {
        console.log("✅ 页面显示已登录状态");
      }
    }
    
    await browser.close();
    console.log("✅ 真实关注测试完成");
  } catch (error) {
    console.error("❌ 真实关注测试失败:", error.message);
    console.error("❌ 错误详情:", error);
  }
})();