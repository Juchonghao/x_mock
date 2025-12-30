const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class PlaywrightInteractionService {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.proxyUrl = options.proxyUrl || null;
    this.userDataDir = options.userDataDir || path.join(process.cwd(), 'sessions');
    this.sessionDir = options.sessionDir || path.join(process.cwd(), 'sessions');
    this.headless = options.headless || false;
    this.debug = options.debug || false;
    
    // 预设的随机评论内容
    this.randomComments = [
      'Great post! 👍',
      'Thanks for sharing! 🚀',
      'Interesting perspective! 💡',
      'Love this! ❤️',
      'Amazing work! ⭐',
      'Well said! 🙌',
      'This is helpful! 🔥',
      'Brilliant idea! 💯',
      'Keep it up! 💪',
      'Fantastic! 🎉',
      '很棒的内容！👍',
      '谢谢分享！🚀',
      '很有趣的观点！💡',
      '喜欢这个！❤️',
      '很棒的工作！⭐'
    ];
  }

  // 初始化浏览器
  async initialize() {
    try {
      console.log('🚀 初始化互动服务...');
      
      const launchOptions = {
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      };

      if (this.proxyUrl) {
        launchOptions.proxy = { server: this.proxyUrl };
      }

      this.browser = await chromium.launch(launchOptions);
      
      // 加载cookies
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      await this.loadCookies();
      
      this.page = await this.context.newPage();
      
      // 隐藏webdriver特征
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      console.log('✅ 互动服务初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 互动服务初始化失败:', error.message);
      return false;
    }
  }

  // 加载cookies
  async loadCookies() {
    try {
      const cookieFiles = fs.readdirSync(this.sessionDir)
        .filter(file => file.includes('cookies') && file.endsWith('.json'));
      
      if (cookieFiles.length > 0) {
        const latestCookieFile = cookieFiles
          .sort((a, b) => fs.statSync(path.join(this.sessionDir, b)).mtime - 
                        fs.statSync(path.join(this.sessionDir, a)).mtime)[0];
        
        const cookies = JSON.parse(
          fs.readFileSync(path.join(this.sessionDir, latestCookieFile), 'utf8')
        );
        
        // 确保cookies是数组格式
        if (Array.isArray(cookies)) {
          await this.context.addCookies(cookies);
          console.log('✅ 已加载cookies');
        } else {
          console.log('⚠️ cookies文件格式不正确');
        }
      } else {
        console.log('ℹ️ 未找到cookies文件');
      }
    } catch (error) {
      console.log('⚠️ 加载cookies失败:', error.message);
    }
  }

  // 人类行为延迟
  async humanDelay(min = 2000, max = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 检查登录状态
  async checkLoginStatus() {
    try {
      // 访问主页检查登录状态
      await this.page.goto('https://x.com', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      await this.humanDelay(2000, 3000);
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/flow/login')) {
        console.log('❌ 当前在登录页面');
        return false;
      }
      
      // 检查页面标题
      const pageTitle = await this.page.title();
      console.log(`📄 页面标题: ${pageTitle}`);
      
      // 检查页面内容
      const pageContent = await this.page.content();
      const loginIndicators = [
        'Log in',
        '登录',
        'Sign in',
        'Create account'
      ];
      
      const hasLoginIndicators = loginIndicators.some(indicator => 
        pageContent.includes(indicator)
      );
      
      const isLoggedIn = !hasLoginIndicators && !currentUrl.includes('/login');
      
      console.log(isLoggedIn ? '✅ 已登录' : '❌ 未登录');
      return isLoggedIn;
      
    } catch (error) {
      console.error('❌ 检查登录状态失败:', error.message);
      console.log('⚠️ 页面访问失败，假设已登录');
      return true;
    }
  }

  // 访问用户页面
  async visitUserProfile(username) {
    try {
      console.log(`🔗 访问用户页面: @${username}`);
      
      await this.page.goto(`https://x.com/${username}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      await this.humanDelay(3000, 5000);
      
      // 拍摄页面截图
      await this.page.screenshot({ 
        path: `sessions/interaction-user-${username}-page.png`,
        fullPage: true 
      });
      
      console.log(`📸 用户页面截图已保存: @${username}`);
      return true;
      
    } catch (error) {
      console.error(`❌ 访问用户 ${username} 页面失败:`, error.message);
      return false;
    }
  }

  // 查找帖子
  async findTweets() {
    try {
      console.log('🔍 查找用户帖子...');
      
      const tweetSelectors = [
        'article[data-testid="tweet"]',
        '[data-testid="tweet"]',
        'article',
        '[data-testid="cellInnerDiv"]'
      ];
      
      const tweets = [];
      
      for (const selector of tweetSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          
          for (const element of elements) {
            try {
              if (await element.isVisible()) {
                // 检查是否包含推文内容
                const textContent = await element.textContent();
                if (textContent && textContent.length > 20) {
                  // 获取推文ID
                  const tweetLink = await element.locator('a[href*="/status/"]').first();
                  let tweetUrl = null;
                  
                  if (await tweetLink.isVisible()) {
                    tweetUrl = await tweetLink.getAttribute('href');
                  }
                  
                  tweets.push({
                    element: element,
                    text: textContent.substring(0, 100),
                    url: tweetUrl
                  });
                }
              }
            } catch (e) {
              continue;
            }
          }
          
          if (tweets.length > 0) break;
        } catch (e) {
          continue;
        }
      }
      
      console.log(`✅ 找到 ${tweets.length} 个帖子`);
      return tweets.slice(0, 5); // 返回最多5个帖子
      
    } catch (error) {
      console.error('❌ 查找帖子失败:', error.message);
      return [];
    }
  }

  // 点赞帖子
  async likeTweet(tweetElement, tweetText = '') {
    try {
      console.log('👍 尝试点赞帖子...');
      
      // 查找点赞按钮
      const likeButtonSelectors = [
        '[data-testid="like"]',
        'button[data-testid="like"]',
        'div[role="button"][aria-label*="Like"]',
        '[aria-label*="Like"]',
        'button:has-text("Like")',
        'button:has-text("赞")'
      ];
      
      for (const selector of likeButtonSelectors) {
        try {
          const likeButton = await tweetElement.locator(selector).first();
          
          if (await likeButton.isVisible()) {
            const buttonText = await likeButton.textContent();
            const ariaLabel = await likeButton.getAttribute('aria-label');
            
            console.log(`✅ 找到点赞按钮: ${selector}`);
            console.log(`   文本: "${buttonText}"`);
            console.log(`   Aria: "${ariaLabel}"`);
            
            // 检查点赞状态
            const isAlreadyLiked = this.isTweetLiked(ariaLabel, buttonText);
            
            if (isAlreadyLiked) {
              console.log('ℹ️ 帖子已经点赞');
              return true;
            }
            
            console.log('🎯 执行点赞操作...');
            
            // 先滚动到按钮位置
            try {
              await likeButton.scrollIntoViewIfNeeded();
              await this.humanDelay(500, 1000);
            } catch (e) {
              console.log('⚠️ 滚动失败，继续操作');
            }
            
            // 多种点击方法
            let clickSuccess = false;
            
            try {
              // 方法1: 普通点击
              await likeButton.click({ force: true });
              clickSuccess = true;
              console.log('✅ 普通点击成功');
            } catch (clickError) {
              console.log(`⚠️ 普通点击失败: ${clickError.message}`);
              
              try {
                // 方法2: JavaScript点击
                await likeButton.evaluate(button => {
                  button.click();
                });
                clickSuccess = true;
                console.log('✅ JavaScript点击成功');
              } catch (jsClickError) {
                console.log(`⚠️ JavaScript点击失败: ${jsClickError.message}`);
                
                try {
                  // 方法3: 键盘操作
                  await likeButton.focus();
                  await this.page.keyboard.press('Enter');
                  clickSuccess = true;
                  console.log('✅ 键盘点击成功');
                } catch (keyboardError) {
                  console.log(`⚠️ 键盘点击失败: ${keyboardError.message}`);
                }
              }
            }
            
            if (!clickSuccess) {
              console.log('❌ 所有点击方法都失败');
              continue; // 尝试下一个选择器
            }
            
            // 等待状态更新
            await this.humanDelay(3000, 5000);
            
            // 验证点赞是否成功
            try {
              const updatedAriaLabel = await likeButton.getAttribute('aria-label');
              const updatedButtonText = await likeButton.textContent();
              
              console.log(`🔍 点击后状态检查:`);
              console.log(`   更新后Aria: "${updatedAriaLabel}"`);
              console.log(`   更新后文本: "${updatedButtonText}"`);
              
              const isNowLiked = this.isTweetLiked(updatedAriaLabel, updatedButtonText);
              
              if (isNowLiked) {
                console.log('✅ 点赞成功！');
                return true;
              } else {
                console.log('⚠️ 点击后状态未变化，尝试下一个选择器');
                continue;
              }
            } catch (verifyError) {
              console.log(`⚠️ 验证点赞状态失败: ${verifyError.message}`);
              // 如果点击成功但验证失败，假设点赞生效
              return true;
            }
          }
        } catch (e) {
          console.log(`⚠️ 选择器 "${selector}" 失败: ${e.message}`);
          continue;
        }
      }
      
      console.log('❌ 未找到有效的点赞按钮');
      return false;
      
    } catch (error) {
      console.error('❌ 点赞帖子失败:', error.message);
      return false;
    }
  }

  // 检查推文是否已点赞
  isTweetLiked(ariaLabel, buttonText) {
    if (!ariaLabel && !buttonText) return false;
    
    const text = `${ariaLabel || ''} ${buttonText || ''}`.toLowerCase();
    
    console.log(`🔍 检查点赞状态: "${text}"`);
    
    // 检查点赞状态的各种模式
    const isLiked = text.includes('liked') || 
                   text.includes('unlike') || 
                   text.includes('已点赞') ||
                   text.includes('loved') ||
                   text.includes('heart');
    
    console.log(`   点赞状态检查结果: ${isLiked ? '已点赞' : '未点赞'}`);
    return isLiked;
  }

  // 评论帖子
  async commentOnTweet(tweetElement, tweetText = '') {
    try {
      console.log('💬 尝试评论帖子...');
      
      // 查找评论按钮
      const commentButtonSelectors = [
        '[data-testid="reply"]',
        'button[data-testid="reply"]',
        'div[role="button"][aria-label*="Reply"]',
        '[aria-label*="Reply"]',
        'button:has-text("Reply")',
        'button:has-text("回复")'
      ];
      
      for (const selector of commentButtonSelectors) {
        try {
          const commentButton = await tweetElement.locator(selector).first();
          
          if (await commentButton.isVisible()) {
            console.log(`✅ 找到评论按钮: ${selector}`);
            
            // 点击评论按钮
            await commentButton.click();
            await this.humanDelay(2000, 3000);
            
            // 查找评论输入框
            const commentInputSelectors = [
              '[data-testid="tweetTextarea_0"]',
              '[data-testid="tweetTextarea"]',
              'textarea[placeholder*="Tweet your reply"]',
              'textarea[placeholder*="发一条回复"]',
              'div[contenteditable="true"]'
            ];
            
            let commentInput = null;
            for (const inputSelector of commentInputSelectors) {
              try {
                commentInput = await this.page.locator(inputSelector).first();
                if (await commentInput.isVisible()) {
                  console.log(`✅ 找到评论输入框: ${inputSelector}`);
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            if (commentInput) {
              // 随机选择评论内容
              const randomComment = this.randomComments[
                Math.floor(Math.random() * this.randomComments.length)
              ];
              
              console.log(`💭 评论内容: "${randomComment}"`);
              
              // 输入评论
              await commentInput.click();
              await this.humanDelay(500, 1000);
              await commentInput.type(randomComment);
              await this.humanDelay(1000, 2000);
              
              // 查找发送按钮
              const sendButtonSelectors = [
                '[data-testid="tweetButtonInline"]',
                '[data-testid="tweetButton"]',
                'button:has-text("Tweet")',
                'button:has-text("发送")',
                'button[type="submit"]'
              ];
              
              for (const sendSelector of sendButtonSelectors) {
                try {
                  const sendButton = await this.page.locator(sendSelector).first();
                  
                  if (await sendButton.isVisible()) {
                    console.log(`✅ 找到发送按钮: ${sendSelector}`);
                    
                    // 点击发送
                    await sendButton.click();
                    await this.humanDelay(3000, 5000);
                    
                    console.log('✅ 评论发送成功');
                    return true;
                  }
                } catch (e) {
                  continue;
                }
              }
              
              console.log('❌ 未找到发送按钮');
              return false;
            } else {
              console.log('❌ 未找到评论输入框');
              return false;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('❌ 未找到评论按钮');
      return false;
      
    } catch (error) {
      console.error('❌ 评论帖子失败:', error.message);
      return false;
    }
  }

  // 与用户帖子互动
  async interactWithUserTweets(username) {
    try {
      console.log(`\n🎯 开始与用户 @${username} 的帖子互动...`);
      
      // 访问用户页面
      const visitSuccess = await this.visitUserProfile(username);
      if (!visitSuccess) {
        console.log(`❌ 无法访问用户 ${username} 的页面`);
        return false;
      }
      
      // 查找帖子
      const tweets = await this.findTweets();
      
      if (tweets.length === 0) {
        console.log(`⚠️ 用户 ${username} 没有找到可互动的帖子`);
        return false;
      }
      
      let successCount = 0;
      
      for (let i = 0; i < tweets.length; i++) {
        try {
          const tweet = tweets[i];
          console.log(`\n📝 处理帖子 ${i + 1}/${tweets.length}`);
          console.log(`📄 帖子内容: ${tweet.text}...`);
          
          // 随机选择互动类型：点赞或评论
          const shouldLike = Math.random() > 0.3; // 70% 概率点赞
          const shouldComment = Math.random() > 0.6; // 40% 概率评论
          
          let interactionSuccess = false;
          
          if (shouldLike) {
            console.log('👍 尝试点赞...');
            const likeSuccess = await this.likeTweet(tweet.element, tweet.text);
            if (likeSuccess) {
              interactionSuccess = true;
              successCount++;
            }
            await this.humanDelay(2000, 3000);
          }
          
          if (shouldComment) {
            console.log('💬 尝试评论...');
            const commentSuccess = await this.commentOnTweet(tweet.element, tweet.text);
            if (commentSuccess) {
              interactionSuccess = true;
              successCount++;
            }
            await this.humanDelay(3000, 5000);
          }
          
          if (!interactionSuccess && !shouldLike && !shouldComment) {
            console.log('ℹ️ 跳过此帖子（随机跳过）');
          }
          
        } catch (error) {
          console.log(`❌ 处理帖子 ${i + 1} 失败:`, error.message);
        }
      }
      
      console.log(`✅ 与用户 ${username} 的互动完成，成功 ${successCount} 次`);
      return successCount > 0;
      
    } catch (error) {
      console.error(`❌ 与用户 ${username} 互动失败:`, error.message);
      return false;
    }
  }

  // 对多个用户进行互动
  async interactWithMultipleUsers(usernames) {
    try {
      console.log(`🎯 开始对 ${usernames.length} 个用户进行互动...`);
      
      const results = [];
      
      for (const username of usernames) {
        try {
          console.log(`\n${'='.repeat(50)}`);
          console.log(`👤 处理用户: @${username}`);
          console.log(`${'='.repeat(50)}`);
          
          const success = await this.interactWithUserTweets(username);
          results.push({ username, success });
          
          // 用户间延迟
          if (username !== usernames[usernames.length - 1]) {
            console.log(`⏳ 等待5秒后处理下一个用户...`);
            await this.humanDelay(5000, 8000);
          }
          
        } catch (error) {
          console.error(`❌ 处理用户 ${username} 失败:`, error.message);
          results.push({ username, success: false });
        }
      }
      
      // 保存结果
      await this.saveInteractionResults(results);
      
      console.log(`\n🎉 批量互动任务完成！`);
      console.log(`📊 结果统计:`);
      results.forEach(result => {
        console.log(`   @${result.username}: ${result.success ? '✅ 成功' : '❌ 失败'}`);
      });
      
      return results;
      
    } catch (error) {
      console.error('❌ 批量互动失败:', error.message);
      return [];
    }
  }

  // 保存互动结果
  async saveInteractionResults(results) {
    try {
      const result = {
        timestamp: new Date().toISOString(),
        totalUsers: results.length,
        successfulUsers: results.filter(r => r.success).length,
        results: results
      };
      
      const filename = `interaction-results-${Date.now()}.json`;
      const filepath = path.join(this.sessionDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
      console.log('💾 互动结果已保存:', filepath);
      
      return filepath;
    } catch (error) {
      console.error('❌ 保存互动结果失败:', error.message);
    }
  }

  // 清理资源
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('🔚 浏览器已关闭');
      }
    } catch (error) {
      console.error('❌ 清理资源失败:', error.message);
    }
  }
}

module.exports = PlaywrightInteractionService;