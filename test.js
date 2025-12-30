const TwitterService = require('./src/services/twitterService');
const config = require('./src/config');
const { log } = require('./src/utils');

async function testBot() {
  let twitterService = null;
  
  try {
    log('Starting X (Twitter) auto-reply bot test...');
    
    // Validate configuration
    if (!config.twitter.cookies) {
      log('ERROR: No Twitter cookies found in .env file!', 'error');
      log('Please follow the instructions in README.md to get and configure your Twitter cookies.');
      return false;
    }
    
    // Create and initialize Twitter service
    twitterService = new TwitterService();
    await twitterService.initialize();
    
    log('✓ Browser initialized successfully');
    
    // Test 1: Inject cookies and navigate to Twitter
    try {
      await twitterService.browserService.injectCookies('https://x.com');
      await twitterService.browserService.screenshot('twitter_home.png');
      log('✓ Twitter navigation and cookie injection successful');
    } catch (error) {
      log('✗ Failed to navigate to Twitter or inject cookies:', error.message, 'error');
      return false;
    }
    
    // Test 2: Get mentions
    try {
      log('Testing mention detection...');
      const mentions = await twitterService.getMentions();
      
      if (mentions.length > 0) {
        log(`✓ Found ${mentions.length} mentions:`);
        mentions.forEach((mention, index) => {
          log(`  ${index + 1}. @${mention.username}: ${mention.tweetText.substring(0, 50)}...`);
        });
      } else {
        log('ℹ No new mentions found for testing');
      }
    } catch (error) {
      log('✗ Failed to get mentions:', error.message, 'error');
      return false;
    }
    
    // Test 3: Keyword filtering
    try {
      const testMentions = [
        { tweetId: '1', username: 'testuser1', tweetText: 'Hello there!' },
        { tweetId: '2', username: 'testuser2', tweetText: 'How are you?' },
        { tweetId: '3', username: 'testuser3', tweetText: 'yingyu' }
      ];
      
      const filteredMentions = await twitterService.filterMentionsByKeywords(testMentions);
      log(`✓ Keyword filtering test: ${filteredMentions.length} out of ${testMentions.length} mentions matched keywords`);
      filteredMentions.forEach(mention => {
        log(`  - @${mention.username}: ${mention.tweetText}`);
      });
    } catch (error) {
      log('✗ Keyword filtering test failed:', error.message, 'error');
      return false;
    }
    
    // Test 4: Reply functionality (commented out for safety)
    log('ℹ Reply functionality test is commented out for safety.');
    log('  To test actual replies, uncomment the code in test.js and provide a valid tweet URL.');
    
    // Uncomment the following lines to test actual replies:
    /*
    try {
      const testTweetUrl = 'https://x.com/yourusername/status/1234567890';
      const testReplyMessage = 'This is a test reply from the bot!';
      
      log(`Testing reply to tweet: ${testTweetUrl}`);
      await twitterService.replyToTweet(testTweetUrl, testReplyMessage);
      log('✓ Reply functionality test successful');
    } catch (error) {
      log('✗ Reply functionality test failed:', error.message, 'error');
      return false;
    }
    */
    
    log('\n🎉 All tests completed successfully!');
    log('Your X (Twitter) auto-reply bot is ready to use.');
    log('\nNext steps:');
    log('1. Start the bot with: npm start');
    log('2. Monitor the logs for auto-reply activity');
    log('3. Check the sessions folder for screenshots (if HEADLESS=false)');
    
    return true;
    
  } catch (error) {
    log(`✗ Test failed with unexpected error: ${error.message}`, 'error');
    log(error.stack);
    return false;
  } finally {
    // Cleanup
    if (twitterService) {
      await twitterService.close();
    }
    log('Test completed. Resources cleaned up.');
  }
}

// Run the test
testBot().catch(error => {
  log(`Test execution failed: ${error.message}`, 'error');
  process.exit(1);
});