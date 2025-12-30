const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

module.exports = {
  // Twitter Configuration
  twitter: {
    cookies: process.env.TWITTER_COOKIES || '',
  },
  
  // Browser Configuration
  browser: {
    headless: process.env.HEADLESS !== 'false',
    type: process.env.BROWSER_TYPE || 'chromium',
    executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
  },
  
  // Proxy Settings
  proxy: {
    url: process.env.PROXY_URL || '',
  },
  
  // Auto-reply Configuration
  autoReply: {
    keywords: process.env.KEYWORDS ? JSON.parse(process.env.KEYWORDS) : [], // 空的关键词列表，处理所有mentions
    message: process.env.REPLY_MESSAGE || 'Thank you for your message!',
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 300000, // 5 minutes default
    maxRepliesPerRun: parseInt(process.env.MAX_REPLIES_PER_RUN) || 10,
  },
  
  // Session Configuration
  session: {
    dir: process.env.SESSION_DIR || './sessions',
  },
};
