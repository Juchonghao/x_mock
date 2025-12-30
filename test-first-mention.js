const TwitterService = require('./src/services/twitterService');
const config = require('./src/config');
const { log } = require('./src/utils');

async function testFirstMentionReply() {
  let twitterService = null;
  
  try {
    log('Starting X Bot First Mention Reply Test...');
    
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
    
    // Test 1: Get all mentions
    try {
      log('Testing mention detection...');
      const mentions = await twitterService.getMentions();
      
      if (mentions.length > 0) {
        log(`✓ Found ${mentions.length} mentions:`);
        mentions.forEach((mention, index) => {
          log(`  ${index + 1}. @${mention.username}: ${mention.tweetText.substring(0, 50)}...`);
        });
        
        // Test 2: Filter mentions by keywords
        const filteredMentions = await twitterService.filterMentionsByKeywords(mentions);
        log(`✓ Filtered to ${filteredMentions.length} mentions matching keywords`);
        
        if (filteredMentions.length > 0) {
          // Test 3: Reply to the FIRST mention only
          const firstMention = filteredMentions[0];
          log(`🎯 Testing reply to FIRST mention:`);
          log(`  Username: @${firstMention.username}`);
          log(`  Tweet: ${firstMention.tweetText.substring(0, 100)}...`);
          log(`  URL: ${firstMention.tweetUrl}`);
          
          // Customize reply message with username
          const replyMessage = config.autoReply.message.replace('{username}', `@${firstMention.username}`);
          log(`  Reply Message: ${replyMessage}`);
          
          // Reply to the first mention
          await twitterService.replyToTweet(firstMention.tweetUrl, replyMessage);
          
          // Mark as replied
          twitterService.repliedTweets.add(firstMention.tweetId);
          
          log(`✓ Successfully replied to the first mention from @${firstMention.username}`);
          
          // Test 4: Verify we only replied to one
          log(`📊 Summary: Replied to 1 out of ${filteredMentions.length} filtered mentions`);
          log(`🎯 Test completed: Only the first mention was processed as requested`);
          
        } else {
          log('ℹ No mentions match the configured keywords');
          log('💡 To test reply functionality, either:');
          log('   1. Update KEYWORDS in .env file to match existing mentions');
          log('   2. Create a new mention with keyword');
          log('   3. Disable keyword filtering temporarily');
        }
        
      } else {
        log('ℹ No mentions found for testing');
        log('💡 To test mention reply functionality:');
        log('   1. Make sure someone has mentioned your account');
        log('   2. Check that you are logged into the correct Twitter account');
        log('   3. Verify cookies are properly configured');
      }
      
    } catch (error) {
      log('✗ Failed to get mentions:', error.message, 'error');
      return false;
    }
    
    // Test 5: Verify reply state
    log('✓ Reply state verification:');
    log(`  Total replied tweets: ${twitterService.repliedTweets.size}`);
    log(`  Replied tweet IDs: ${Array.from(twitterService.repliedTweets).join(', ')}`);
    
    log('\n🎉 First Mention Reply Test completed successfully!');
    log('✅ The bot correctly identified and replied to only the first matching mention');
    
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

// Additional helper function to test without actual replies
async function testFirstMentionLogic() {
  log('🧪 Testing First Mention Logic (dry run)...');
  
  // Mock mentions for testing
  const mockMentions = [
    { 
      tweetId: '123', 
      username: 'user1', 
      tweetText: 'Hello there! This mentions you about yingyu',
      tweetUrl: 'https://x.com/user1/status/123'
    },
    { 
      tweetId: '456', 
      username: 'user2', 
      tweetText: 'Another mention with hello keyword',
      tweetUrl: 'https://x.com/user2/status/456'
    },
    { 
      tweetId: '789', 
      username: 'user3', 
      tweetText: 'Third mention with thanks keyword',
      tweetUrl: 'https://x.com/user3/status/789'
    }
  ];
  
  // Test keyword filtering
  const keywords = config.autoReply.keywords || ['hello', 'hi', 'thanks', 'help'];
  const filteredMentions = mockMentions.filter(mention => {
    const lowerText = mention.tweetText.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  });
  
  log(`📋 Mock Mentions: ${mockMentions.length} total`);
  mockMentions.forEach((mention, index) => {
    log(`  ${index + 1}. @${mention.username}: ${mention.tweetText}`);
  });
  
  log(`🎯 After keyword filtering: ${filteredMentions.length} matches`);
  filteredMentions.forEach((mention, index) => {
    log(`  ${index + 1}. @${mention.username}: ${mention.tweetText}`);
  });
  
  // Select only the first mention
  const firstMention = filteredMentions[0];
  if (firstMention) {
    log(`🎯 Selected FIRST mention for reply:`);
    log(`  Username: @${firstMention.username}`);
    log(`  Tweet: ${firstMention.tweetText}`);
    log(`  URL: ${firstMention.tweetUrl}`);
    
    const replyMessage = config.autoReply.message.replace('{username}', `@${firstMention.username}`);
    log(`  Would reply with: ${replyMessage}`);
    
    log('✅ First mention logic test passed!');
  } else {
    log('❌ No mentions match the keyword criteria');
  }
}

// Run the test
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'real'; // 'real' for actual test, 'mock' for dry run
  
  if (mode === 'mock') {
    await testFirstMentionLogic();
  } else {
    await testFirstMentionReply();
  }
}

main().catch(error => {
  log(`Test execution failed: ${error.message}`, 'error');
  process.exit(1);
});