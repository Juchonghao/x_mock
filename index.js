const TwitterService = require('./src/services/twitterService');
const config = require('./src/config');
const { log } = require('./src/utils');

let twitterService = null;
let autoReplyInterval = null;

async function initialize() {
  try {
    log('Initializing X (Twitter) auto-reply bot...');
    
    // Create and initialize Twitter service
    twitterService = new TwitterService();
    await twitterService.initialize();
    
    log('Bot initialized successfully!');
    return true;
  } catch (error) {
    log(`Initialization failed: ${error.message}`, 'error');
    return false;
  }
}

async function runAutoReply() {
  try {
    log('Running auto-reply cycle...');
    
    // Perform auto-reply
    await twitterService.autoReply();
    
    log(`Auto-reply cycle completed. Next run in ${config.autoReply.checkInterval / 1000 / 60} minutes.`);
  } catch (error) {
    log(`Auto-reply cycle failed: ${error.message}`, 'error');
  }
}

async function start() {
  try {
    // Initialize the bot
    const isInitialized = await initialize();
    if (!isInitialized) {
      log('Exiting due to initialization failure', 'error');
      process.exit(1);
    }
    
    // Run first auto-reply immediately
    await runAutoReply();
    
    // Set up interval for recurring auto-reply
    autoReplyInterval = setInterval(runAutoReply, config.autoReply.checkInterval);
    
    log('Bot started successfully! Auto-reply is running at regular intervals.');
    
  } catch (error) {
    log(`Failed to start bot: ${error.message}`, 'error');
    await cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  log('Cleaning up resources...');
  
  // Clear interval
  if (autoReplyInterval) {
    clearInterval(autoReplyInterval);
  }
  
  // Close Twitter service
  if (twitterService) {
    await twitterService.close();
  }
  
  log('Resources cleaned up successfully');
}

// Handle process termination
process.on('SIGINT', async () => {
  log('Received SIGINT. Shutting down bot...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM. Shutting down bot...');
  await cleanup();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
  // Don't exit immediately, let the cleanup handle it
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
  log(error.stack, 'error');
  // Don't exit immediately, let the cleanup handle it
});

// Start the bot when the script is run
if (require.main === module) {
  start();
}

module.exports = {
  start,
  cleanup,
  runAutoReply
};
