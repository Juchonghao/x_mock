const TwitterAuthService = require('./twitter-auth');

class TwitterAutomationService {
  constructor() {
    this.authService = new TwitterAuthService();
    this.operationHistory = [];
  }

  // 自动关注用户
  async followUser(username) {
    try {
      console.log(`开始关注用户: @${username}`);
      
      // 确保已认证
      if (!this.authService.isAuthenticated()) {
        const authSuccess = await this.authService.loginWithAuthToken();
        if (!authSuccess) {
          throw new Error('Twitter 认证失败');
        }
      }

      const page = this.authService.getPage();
      if (!page) {
        throw new Error('无法获取浏览器页面对象');
      }

      // 访问用户主页 - 使用相同的超时处理策略
      let navigationSuccess = false;
      try {
        await page.goto(`https://twitter.com/${username}`, {
          waitUntil: 'networkidle',
          timeout: 20000
        });
        navigationSuccess = true;
      } catch (error) {
        console.log(`⚠️ 访问用户页面超时: @${username}`);
        
        // 如果主页面超时，尝试直接访问基础用户URL
        try {
          await page.goto(`https://x.com/${username}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          console.log(`✅ 使用 x.com 成功访问用户页面: @${username}`);
          navigationSuccess = true;
        } catch (fallbackError) {
          // 最后的尝试：尝试简化URL
          try {
            await page.goto(`https://twitter.com/${username}`, {
              waitUntil: 'domcontentloaded',
              timeout: 15000
            });
            console.log(`✅ 使用简化方式成功访问用户页面: @${username}`);
            navigationSuccess = true;
          } catch (finalError) {
            throw new Error(`无法访问用户页面: @${username}`);
          }
        }
      }

      await page.waitForTimeout(3000);

      // 查找并点击关注按钮
      const followButtonSelectors = [
        '[data-testid="follow"]',
        '[data-testid="UserFollowButton"]',
        'div[role="button"]:has-text("关注")',
        'div[role="button"]:has-text("Follow")',
        'button:has-text("关注")',
        'button:has-text("Follow")'
      ];

      let followSuccess = false;
      for (const selector of followButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            // 检查按钮是否已经显示"正在关注"
            const buttonText = await button.innerText();
            if (buttonText.includes('正在关注') || buttonText.includes('Following')) {
              console.log(`用户 @${username} 已经被关注`);
              followSuccess = true;
              break;
            }

            await button.click();
            await page.waitForTimeout(2000);
            
            // 验证关注是否成功
            const updatedButtonText = await button.innerText();
            if (updatedButtonText.includes('正在关注') || updatedButtonText.includes('Following')) {
              console.log(`成功关注用户: @${username}`);
              followSuccess = true;
              break;
            }
          }
        } catch (error) {
          console.log(`选择器 ${selector} 尝试失败:`, error.message);
        }
      }

      if (!followSuccess) {
        throw new Error(`无法找到或点击关注按钮，用户: @${username}`);
      }

      // 记录操作历史
      this.operationHistory.push({
        type: 'follow',
        target: username,
        timestamp: new Date().toISOString(),
        status: 'success'
      });

      return {
        success: true,
        message: `成功关注用户 @${username}`,
        username: username
      };

    } catch (error) {
      console.error(`关注用户 @${username} 失败:`, error);
      
      // 记录失败操作
      this.operationHistory.push({
        type: 'follow',
        target: username,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });

      return {
        success: false,
        message: `关注用户 @${username} 失败`,
        error: error.message
      };
    }
  }

  // 自动点赞推文
  async likeTweet(tweetUrl) {
    try {
      console.log(`开始点赞推文: ${tweetUrl}`);
      
      // 确保已认证
      if (!this.authService.isAuthenticated()) {
        const authSuccess = await this.authService.loginWithAuthToken();
        if (!authSuccess) {
          throw new Error('Twitter 认证失败');
        }
      }

      const page = this.authService.getPage();
      if (!page) {
        throw new Error('无法获取浏览器页面对象');
      }

      // 访问推文页面 - 使用相同的超时处理策略
      let navigationSuccess = false;
      try {
        await page.goto(tweetUrl, {
          waitUntil: 'networkidle',
          timeout: 20000
        });
        navigationSuccess = true;
      } catch (error) {
        console.log('⚠️ 访问推文页面超时');
        
        // 如果主页面超时，尝试简化导航
        try {
          await page.goto(tweetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          console.log('✅ 使用简化方式成功访问推文页面');
          navigationSuccess = true;
        } catch (fallbackError) {
          throw new Error(`无法访问推文页面: ${tweetUrl}`);
        }
      }

      await page.waitForTimeout(3000);

      // 查找并点击点赞按钮
      const likeButtonSelectors = [
        '[data-testid="like"]',
        '[data-testid="Bookmark"]',
        'div[role="button"]:has-text("赞")',
        'div[role="button"]:has-text("Like")',
        'button:has-text("赞")',
        'button:has-text("Like")'
      ];

      let likeSuccess = false;
      for (const selector of likeButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            // 检查按钮状态
            const buttonClasses = await button.getAttribute('class');
            if (buttonClasses && buttonClasses.includes('r-1mf7ev')) {
              console.log(`推文已经被点赞`);
              likeSuccess = true;
              break;
            }

            await button.click();
            await page.waitForTimeout(2000);
            
            // 验证点赞是否成功
            const updatedClasses = await button.getAttribute('class');
            if (updatedClasses && updatedClasses.includes('r-1mf7ev')) {
              console.log(`成功点赞推文`);
              likeSuccess = true;
              break;
            }
          }
        } catch (error) {
          console.log(`选择器 ${selector} 尝试失败:`, error.message);
        }
      }

      if (!likeSuccess) {
        throw new Error(`无法找到或点击点赞按钮，推文: ${tweetUrl}`);
      }

      // 记录操作历史
      this.operationHistory.push({
        type: 'like',
        target: tweetUrl,
        timestamp: new Date().toISOString(),
        status: 'success'
      });

      return {
        success: true,
        message: `成功点赞推文`,
        url: tweetUrl
      };

    } catch (error) {
      console.error(`点赞推文失败:`, error);
      
      // 记录失败操作
      this.operationHistory.push({
        type: 'like',
        target: tweetUrl,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });

      return {
        success: false,
        message: `点赞推文失败`,
        error: error.message
      };
    }
  }

  // 自动评论推文
  async commentOnTweet(tweetUrl, comment) {
    try {
      console.log(`开始评论推文: ${tweetUrl}`);
      
      // 确保已认证
      if (!this.authService.isAuthenticated()) {
        const authSuccess = await this.authService.loginWithAuthToken();
        if (!authSuccess) {
          throw new Error('Twitter 认证失败');
        }
      }

      const page = this.authService.getPage();
      if (!page) {
        throw new Error('无法获取浏览器页面对象');
      }

      // 访问推文页面 - 使用相同的超时处理策略
      let navigationSuccess = false;
      try {
        await page.goto(tweetUrl, {
          waitUntil: 'networkidle',
          timeout: 20000
        });
        navigationSuccess = true;
      } catch (error) {
        console.log('⚠️ 访问推文页面超时');
        
        // 如果主页面超时，尝试简化导航
        try {
          await page.goto(tweetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          console.log('✅ 使用简化方式成功访问推文页面');
          navigationSuccess = true;
        } catch (fallbackError) {
          throw new Error(`无法访问推文页面: ${tweetUrl}`);
        }
      }

      await page.waitForTimeout(3000);

      // 查找并点击回复按钮
      const replyButtonSelectors = [
        '[data-testid="reply"]',
        'div[role="button"]:has-text("回复")',
        'div[role="button"]:has-text("Reply")',
        'button:has-text("回复")',
        'button:has-text("Reply")'
      ];

      let replySuccess = false;
      for (const selector of replyButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await page.waitForTimeout(2000);
            
            // 查找文本输入框
            const textInputSelectors = [
              '[data-testid="tweetTextarea_0"]',
              '[contenteditable="true"]',
              'textarea[placeholder*="推"]',
              'div[role="textbox"]'
            ];

            let inputFound = false;
            for (const inputSelector of textInputSelectors) {
              try {
                const textInput = await page.$(inputSelector);
                if (textInput) {
                  await textInput.click();
                  await page.waitForTimeout(500);
                  
                  // 清空并输入评论
                  await textInput.fill('');
                  await textInput.type(comment, { delay: 50 });
                  await page.waitForTimeout(1000);
                  
                  inputFound = true;
                  break;
                }
              } catch (error) {
                console.log(`输入框选择器 ${inputSelector} 尝试失败:`, error.message);
              }
            }

            if (!inputFound) {
              throw new Error('无法找到评论输入框');
            }

            // 查找并点击发送按钮
            const sendButtonSelectors = [
              '[data-testid="tweetButtonInline"]',
              '[data-testid="tweetButton"]',
              'div[role="button"]:has-text("推文")',
              'div[role="button"]:has-text("Tweet")',
              'button:has-text("推文")',
              'button:has-text("Tweet")'
            ];

            let sendSuccess = false;
            for (const sendSelector of sendButtonSelectors) {
              try {
                const sendButton = await page.$(sendSelector);
                if (sendButton) {
                  await sendButton.click();
                  await page.waitForTimeout(3000);
                  console.log(`成功评论推文`);
                  sendSuccess = true;
                  replySuccess = true;
                  break;
                }
              } catch (error) {
                console.log(`发送按钮选择器 ${sendSelector} 尝试失败:`, error.message);
              }
            }

            if (sendSuccess) break;
          }
        } catch (error) {
          console.log(`回复按钮选择器 ${selector} 尝试失败:`, error.message);
        }
      }

      if (!replySuccess) {
        throw new Error(`无法找到或点击回复按钮，推文: ${tweetUrl}`);
      }

      // 记录操作历史
      this.operationHistory.push({
        type: 'comment',
        target: tweetUrl,
        comment: comment,
        timestamp: new Date().toISOString(),
        status: 'success'
      });

      return {
        success: true,
        message: `成功评论推文`,
        url: tweetUrl,
        comment: comment
      };

    } catch (error) {
      console.error(`评论推文失败:`, error);
      
      // 记录失败操作
      this.operationHistory.push({
        type: 'comment',
        target: tweetUrl,
        comment: comment,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });

      return {
        success: false,
        message: `评论推文失败`,
        error: error.message
      };
    }
  }

  // 批量关注用户
  async batchFollow(usernames, delayMs = 5000) {
    const results = [];
    
    for (const username of usernames) {
      try {
        const result = await this.followUser(username);
        results.push(result);
        
        // 添加延迟以避免被限制
        if (delayMs > 0) {
          console.log(`等待 ${delayMs}ms 后继续...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        results.push({
          success: false,
          message: `关注用户 @${username} 失败`,
          error: error.message
        });
      }
    }

    return results;
  }

  // 获取操作历史
  getOperationHistory() {
    return this.operationHistory;
  }

  // 清除操作历史
  clearHistory() {
    this.operationHistory = [];
  }

  // 关闭服务
  async close() {
    await this.authService.close();
  }
}

module.exports = TwitterAutomationService;