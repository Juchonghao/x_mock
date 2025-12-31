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

      // 查找并点击关注按钮 - 更新选择器适配新Twitter UI（移除过于宽泛的选择器）
      const followButtonSelectors = [
        '[data-testid="follow"]',
        '[data-testid="UserFollowButton"]',
        '[data-testid="FollowButton"]',
        '[data-testid="user-follow-button"]',
        'button[aria-label*="Follow" i]',
        'button[aria-label*="关注" i]',
        'button:has-text("关注")',
        'button:has-text("Follow")',
        'div[role="button"][data-testid*="follow" i]',
        'div[role="button"][aria-label*="Follow" i]',
        'div[role="button"][aria-label*="关注" i]'
      ];

      let followSuccess = false;
      for (const selector of followButtonSelectors) {
        try {
          console.log(`🔍 尝试选择器: ${selector}`);
          const button = await page.$(selector);
          if (button) {
            const buttonText = await button.innerText();
            console.log(`📝 找到按钮文本: "${buttonText}"`);
            
            // 检查按钮文本长度，防止匹配到整个页面内容
            if (buttonText.length > 200) {
              console.log(`⚠️ 按钮文本过长 (${buttonText.length} 字符)，跳过此按钮`);
              continue;
            }
            
            // 更精确的关注状态检测逻辑
            const trimmedText = buttonText.trim().toLowerCase();
            
            // 检查是否已经是关注状态（优先级最高）
            const isAlreadyFollowing = trimmedText.includes('正在关注') || 
                                     trimmedText.includes('following') ||
                                     trimmedText.includes('following you') ||
                                     trimmedText.includes('互相关注') ||
                                     trimmedText.includes('following and muting');
            
            if (isAlreadyFollowing) {
              console.log(`✅ 用户 @${username} 已经是关注状态 (按钮文本: "${buttonText}")`);
              followSuccess = true;
              break;
            }
            
            // 检查是否是关注按钮（需要点击）- 更宽松的匹配
            const isFollowButton = (trimmedText === '关注' || 
                                  trimmedText === 'follow' ||
                                  trimmedText.includes('关注') ||
                                  trimmedText.includes('follow'));
            
            if (isFollowButton) {
              console.log(`🖱️ 点击关注按钮: "${buttonText}"`);
              
              // 等待可能的弹窗或覆盖层消失
              await page.waitForTimeout(2000);
              
              try {
                // 方法1：尝试直接点击
                await button.click({ timeout: 10000 });
                console.log(`✅ 成功点击关注按钮`);
              } catch (clickError) {
                console.log(`⚠️ 直接点击失败，尝试JavaScript点击: ${clickError.message}`);
                
                try {
                  // 方法2：使用JavaScript点击
                  await button.evaluate(el => el.click());
                  console.log(`✅ JavaScript点击成功`);
                } catch (jsClickError) {
                  console.log(`⚠️ JavaScript点击也失败，尝试强制滚动后点击`);
                  
                  // 方法3：滚动到按钮位置后再点击
                  await button.scrollIntoViewIfNeeded();
                  await page.waitForTimeout(1000);
                  await button.click({ timeout: 5000, force: true });
                  console.log(`✅ 强制点击成功`);
                }
              }
              
              // 等待更长时间让页面响应，增加到15秒
              await page.waitForTimeout(15000);
              
              // 检查是否有弹窗需要处理
              try {
                const modal = await page.$('[role="dialog"]');
                if (modal) {
                  console.log(`⚠️ 检测到弹窗，尝试关闭...`);
                  const closeButton = await modal.$('button[aria-label*="Close" i], button[aria-label*="取消" i], button[aria-label*="Cancel" i]');
                  if (closeButton) {
                    await closeButton.click();
                    await page.waitForTimeout(3000);
                  }
                }
              } catch (modalError) {
                console.log(`⚠️ 弹窗处理失败: ${modalError.message}`);
              }
              
              // 增强的验证关注是否成功逻辑
              try {
                console.log(`🔄 开始增强验证关注状态...`);
                
                // 验证策略1: 立即检查按钮状态
                const refreshedButton = await page.$(selector);
                if (refreshedButton) {
                  const updatedButtonText = await refreshedButton.innerText();
                  const updatedTrimmedText = updatedButtonText.trim().toLowerCase();
                  console.log(`🔄 第一次检查按钮文本: "${updatedButtonText}"`);
                  
                  const isNowFollowing = updatedTrimmedText.includes('正在关注') || 
                                       updatedTrimmedText.includes('following') ||
                                       updatedTrimmedText.includes('following you') ||
                                       updatedTrimmedText.includes('互相关注') ||
                                       updatedTrimmedText.includes('following and muting');
                  
                  if (isNowFollowing) {
                    console.log(`🎉 第一次检查确认成功关注用户: @${username}`);
                    followSuccess = true;
                    break;
                  }
                }
                
                // 验证策略2: 等待5秒后再次检查
                console.log(`⏳ 等待5秒后第二次检查...`);
                await page.waitForTimeout(5000);
                
                const secondCheckButton = await page.$(selector);
                if (secondCheckButton) {
                  const secondButtonText = await secondCheckButton.innerText();
                  const secondTrimmedText = secondButtonText.trim().toLowerCase();
                  console.log(`🔄 第二次检查按钮文本: "${secondButtonText}"`);
                  
                  const isSecondFollowing = secondTrimmedText.includes('正在关注') || 
                                           secondTrimmedText.includes('following') ||
                                           secondTrimmedText.includes('following you') ||
                                           secondTrimmedText.includes('互相关注') ||
                                           secondTrimmedText.includes('following and muting');
                  
                  if (isSecondFollowing) {
                    console.log(`🎉 第二次检查确认成功关注用户: @${username}`);
                    followSuccess = true;
                    break;
                  }
                }
                
                // 验证策略3: 刷新页面后最终检查（使用更短超时）
                console.log(`🔄 尝试页面刷新进行最终检查...`);
                try {
                  await page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
                  await page.waitForTimeout(3000);
                  
                  const finalButton = await page.$(selector);
                  if (finalButton) {
                    const finalButtonText = await finalButton.innerText();
                    const finalTrimmedText = finalButtonText.trim().toLowerCase();
                    console.log(`🔄 刷新后最终检查按钮文本: "${finalButtonText}"`);
                    
                    const finalIsFollowing = finalTrimmedText.includes('正在关注') || 
                                            finalTrimmedText.includes('following') ||
                                            finalTrimmedText.includes('following you') ||
                                            finalTrimmedText.includes('互相关注') ||
                                            finalTrimmedText.includes('following and muting');
                    
                    if (finalIsFollowing) {
                      console.log(`🎉 刷新后最终检查确认成功关注用户: @${username}`);
                      followSuccess = true;
                      break;
                    }
                  }
                } catch (reloadError) {
                  console.log(`⚠️ 页面刷新超时或失败: ${reloadError.message}，继续其他验证策略...`);
                  
                  // 如果刷新失败，检查当前页面状态
                  try {
                    const currentButton = await page.$(selector);
                    if (currentButton) {
                      const currentButtonText = await currentButton.innerText();
                      const currentTrimmedText = currentButtonText.trim().toLowerCase();
                      console.log(`🔄 刷新失败后检查当前按钮文本: "${currentButtonText}"`);
                      
                      const currentIsFollowing = currentTrimmedText.includes('正在关注') || 
                                                currentTrimmedText.includes('following') ||
                                                currentTrimmedText.includes('following you') ||
                                                currentTrimmedText.includes('互相关注') ||
                                                currentTrimmedText.includes('following and muting');
                      
                      if (currentIsFollowing) {
                        console.log(`🎉 刷新失败后基于当前状态确认成功关注用户: @${username}`);
                        followSuccess = true;
                        break;
                      }
                    }
                  } catch (currentCheckError) {
                    console.log(`⚠️ 刷新失败后状态检查出错: ${currentCheckError.message}`);
                  }
                }
                
                // 验证策略4: 检查是否存在其他状态指示器
                console.log(`🔍 检查页面中是否存在关注成功的其他指示器...`);
                
                try {
                  // 检查页面上是否有"正在关注"或"Following"文本（不局限于按钮）
                  const followingTexts = await page.$$eval('*', elements => 
                    elements.map(el => el.textContent?.trim().toLowerCase()).filter(text => 
                      text && (text.includes('following') || text.includes('正在关注'))
                    ).slice(0, 5)
                  );
                  
                  if (followingTexts.length > 0) {
                    console.log(`🎯 在页面中找到关注状态文本:`, followingTexts);
                    console.log(`🎉 基于页面文本确认成功关注用户: @${username}`);
                    followSuccess = true;
                    break;
                  }
                } catch (textCheckError) {
                  console.log(`⚠️ 页面文本检查失败: ${textCheckError.message}`);
                }
                
                // 验证策略5: 检查关注页面确认是否真正关注成功（最可靠的验证）
                console.log(`🔍 尝试通过访问关注页面来验证是否真正关注...`);
                try {
                  const currentProfileUrl = page.url();
                  const followingUrl = currentProfileUrl.includes('/status/') 
                    ? currentProfileUrl.split('/status/')[0] + '/following'
                    : currentProfileUrl + '/following';
                  
                  console.log(`🔗 访问关注页面: ${followingUrl}`);
                  await page.goto(followingUrl, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 10000 
                  });
                  await page.waitForTimeout(3000);
                  
                  // 在关注页面中搜索目标用户名
                  const followingUsers = await page.$$eval('a[href*="/"]', links => 
                    links.map(link => {
                      const href = link.getAttribute('href');
                      const text = link.textContent?.trim();
                      return { href, text };
                    }).filter(item => 
                      item.href && item.href.includes('@') && item.text
                    ).slice(0, 20)
                  );
                  
                  const targetFound = followingUsers.some(user => 
                    user.text?.toLowerCase().includes(username.toLowerCase()) ||
                    user.href?.includes(`/${username}`)
                  );
                  
                  if (targetFound) {
                    console.log(`🎉 在关注页面中找到 @${username}，确认关注成功！`);
                    followSuccess = true;
                    break;
                  } else {
                    console.log(`⚠️ 在关注页面中未找到 @${username}，可能关注失败`);
                  }
                  
                  // 返回原页面
                  await page.goto(currentProfileUrl, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 8000 
                  });
                  await page.waitForTimeout(2000);
                  
                } catch (followingPageError) {
                  console.log(`⚠️ 关注页面验证失败: ${followingPageError.message}`);
                }
                
                // 如果所有验证都失败，记录详细日志并抛出错误
                console.log(`❌ 所有验证策略都未确认关注成功，可能原因:`);
                console.log(`   - Twitter反自动化机制阻止状态更新`);
                console.log(`   - 需要更长时间等待状态更新`);
                console.log(`   - 关注操作可能被限制`);
                
                // 重要：明确设置followSuccess为false
                followSuccess = false;
                
              } catch (error) {
                console.log(`⚠️ 增强验证过程出错:`, error.message);
                followSuccess = false;
              }
            } else {
              console.log(`❌ 按钮文本不是关注按钮或已关注状态: "${buttonText}"`);
              followSuccess = false;
            }
          } else {
            console.log(`❌ 选择器未找到元素: ${selector}`);
            followSuccess = false;
          }
        } catch (error) {
          console.log(`❌ 选择器 ${selector} 尝试失败:`, error.message);
          followSuccess = false;
        }
      }

      // 重要检查：只有在确认followSuccess为true时才返回成功
      if (!followSuccess) {
        console.log(`❌ 关注验证失败，未能确认成功状态，用户: @${username}`);
        
        // 记录失败操作
        this.operationHistory.push({
          type: 'follow',
          target: username,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: '未能通过验证策略确认关注成功'
        });

        throw new Error(`关注用户 @${username} 失败：未能通过验证策略确认关注成功。可能被Twitter反自动化机制阻止。`);
      }

      // 只有在验证成功后才记录成功操作
      console.log(`🎉 验证确认：成功关注用户 @${username}`);
      
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