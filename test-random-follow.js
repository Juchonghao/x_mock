const { chromium } = require("playwright");
const authConfig = require("./config/auth");

// 随机用户列表
const randomUsers = [
  "elonmusk",
  "sundarpichai", 
  "satyanadella",
  "tim_cook",
  "jeffbezos",
  "zuck",
  "sundarpichai",
  "satyanadella",
  "tim_cook"
];

async function followRandomUser(browser, context, page, username) {
  try {
    console.log(`🎯 开始关注用户: @${username}`);
    
    // 访问用户页面
    await page.goto(`https://twitter.com/${username}`);
    await page.waitForTimeout(5000);
    
    // 截图
    await page.screenshot({ path: `follow-${username}-before.png` });
    
    // 查找关注按钮
    const followButton = await page.$("button:has-text('Follow')");
    
    if (followButton) {
      const text = await followButton.innerText();
      console.log(`📝 按钮文本: ${text}`);
      
      if (text.toLowerCase().includes("following") || text.toLowerCase().includes("正在关注")) {
        console.log(`✅ @${username} 已经关注`);
        return { username, success: true, message: "已关注" };
      } else {
        console.log(`🖱️ 关注 @${username}...`);
        
        // 模拟人类行为
        await page.mouse.move(0, 0);
        await page.waitForTimeout(1000);
        await followButton.hover();
        await page.waitForTimeout(500);
        
        // 点击关注按钮
        await followButton.click();
        console.log(`⏳ 等待关注结果...`);
        await page.waitForTimeout(8000);
        
        const newText = await followButton.innerText();
        const success = newText.toLowerCase().includes("following") || 
                       newText.toLowerCase().includes("正在关注");
        
        console.log(`🎯 关注 @${username} 结果: ${success ? "成功" : "失败"}`);
        console.log(`📝 点击后按钮文本: ${newText}`);
        
        await page.screenshot({ path: `follow-${username}-after.png` });
        
        // 检查是否有确认弹窗
        if (!success) {
          try {
            const confirmButton = await page.$("button:has-text('Confirm'), button:has-text('确认')");
            if (confirmButton) {
              console.log(`🔍 发现确认按钮，点击...`);
              await confirmButton.click();
              await page.waitForTimeout(3000);
              
              const finalText = await followButton.innerText();
              const finalSuccess = finalText.toLowerCase().includes("following") || 
                                 finalText.toLowerCase().includes("正在关注");
              console.log(`🎯 确认后关注 @${username} 结果: ${finalSuccess ? "成功" : "失败"}`);
              
              return { username, success: finalSuccess, message: finalSuccess ? "关注成功" : "关注失败" };
            }
          } catch (confirmError) {
            console.log(`❌ 确认流程失败: ${confirmError.message}`);
          }
        }
        
        return { username, success, message: success ? "关注成功" : "关注失败" };
      }
    } else {
      console.log(`❌ @${username} 未找到关注按钮`);
      
      // 检查页面内容
      const pageContent = await page.content();
      if (pageContent.includes("Log in") || pageContent.includes("登录")) {
        console.log(`⚠️  @${username} 页面显示未登录状态`);
        return { username, success: false, message: "页面未登录" };
      }
      
      return { username, success: false, message: "未找到关注按钮" };
    }
  } catch (error) {
    console.error(`❌ 关注 @${username} 失败: ${error.message}`);
    return { username, success: false, message: error.message };
  }
}

async function followRandomUsers() {
  console.log("🚀 开始随机关注测试...");
  
  let browser;
  try {
    if (!authConfig.twitter.isConfigured()) {
      throw new Error("认证配置不完整");
    }
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log("🍪 设置认证Cookie...");
    const cookies = authConfig.twitter.getPlaywrightCookies();
    await context.addCookies(cookies);
    
    console.log("🌐 测试访问Twitter主页...");
    await page.goto("https://twitter.com");
    await page.waitForTimeout(3000);
    
    // 随机选择3个用户
    const selectedUsers = randomUsers.sort(() => 0.5 - Math.random()).slice(0, 3);
    console.log(`🎲 随机选择的用户: ${selectedUsers.join(", ")}`);
    
    const results = [];
    
    // 依次关注每个用户
    for (let i = 0; i < selectedUsers.length; i++) {
      const username = selectedUsers[i];
      console.log(`\n--- 第 ${i + 1}/3 个用户: @${username} ---`);
      
      const result = await followRandomUser(browser, context, page, username);
      results.push(result);
      
      // 在关注之间添加延迟
      if (i < selectedUsers.length - 1) {
        console.log("⏳ 等待15秒后关注下一个用户...");
        await page.waitForTimeout(15000);
      }
    }
    
    // 总结结果
    console.log("\n📊 关注结果总结:");
    results.forEach(result => {
      const status = result.success ? "✅" : "❌";
      console.log(`${status} @${result.username}: ${result.message}`);
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎯 总计: ${successCount}/${results.length} 人关注成功`);
    
    await browser.close();
    console.log("✅ 随机关注测试完成");
    
  } catch (error) {
    console.error("❌ 随机关注测试失败:", error.message);
    console.error("❌ 错误详情:", error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("❌ 浏览器关闭失败:", closeError.message);
      }
    }
  }
}

// 运行随机关注测试
followRandomUsers();