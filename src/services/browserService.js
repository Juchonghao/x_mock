const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const IPManager = require('./ipManager');

class BrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionDir = config.session.dir;
    this.currentProxy = null;
    this.ipManager = null;
    
    // Create session directory if it doesn't exist
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    // Initialize IP Manager if running in containerized environment
    if (process.env.SERVICE_TYPE === 'bot') {
      this.ipManager = new IPManager();
    }
  }

  async initialize() {
    try {
      // Get IP from IP Manager if available
      if (this.ipManager) {
        this.currentProxy = this.ipManager.getAvailableIP();
        if (this.currentProxy) {
          console.log(`Using proxy: ${this.currentProxy}`);
        }
      } else if (config.proxy.url) {
        this.currentProxy = config.proxy.url;
        console.log(`Using configured proxy: ${this.currentProxy}`);
      }

      const browserOptions = {
        headless: config.browser.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
      };

      // Add proxy if configured
      if (this.currentProxy) {
        browserOptions.args.push(`--proxy-server=${this.currentProxy}`);
      }

      // Add executable path if specified
      if (config.browser.executablePath) {
        browserOptions.executablePath = config.browser.executablePath;
      }

      this.browser = await puppeteer.launch(browserOptions);
      this.page = await this.browser.newPage();

      // Set user agent to mimic real browser
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      console.log('Browser initialized successfully with proxy:', this.currentProxy || 'none');
      return this;
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async injectCookies(url) {
    try {
      if (!config.twitter.cookies) {
        console.warn('No cookies provided. Please update .env file.');
        return;
      }

      // Navigate to a blank page first
      await this.page.goto('about:blank');

      // Parse cookies from string
      const cookies = JSON.parse(config.twitter.cookies);
      
      // Inject cookies
      await this.page.setCookie(...cookies);
      console.log('Cookies injected successfully');

      // Verify by visiting X (Twitter)
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      console.log('Navigated to', url);

    } catch (error) {
      console.error('Failed to inject cookies:', error);
      throw error;
    }
  }

  async screenshot(filename) {
    try {
      const filePath = path.join(this.sessionDir, filename);
      await this.page.screenshot({ path: filePath, fullPage: true });
      console.log('Screenshot saved:', filePath);
      return filePath;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  async scrollToBottom() {
    try {
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      console.log('Scrolled to bottom of page');
    } catch (error) {
      console.error('Failed to scroll to bottom:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('Browser closed successfully');
      }
    } catch (error) {
      console.error('Failed to close browser:', error);
      throw error;
    }
  }

  // Random delay to mimic human behavior
  async humanDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Rotate to a new IP address
  async rotateIP() {
    try {
      console.log('Rotating IP address...');
      
      // Close current browser
      if (this.browser) {
        await this.close();
      }

      // Get new IP from IP Manager
      if (this.ipManager && this.currentProxy) {
        this.ipManager.releaseIP(this.currentProxy);
        this.currentProxy = this.ipManager.getAvailableIP();
      }

      // Reinitialize browser with new IP
      await this.initialize();
      
      console.log(`Successfully rotated to new IP: ${this.currentProxy || 'none'}`);
      return true;
    } catch (error) {
      console.error('Failed to rotate IP:', error);
      return false;
    }
  }

  // Get current IP info
  getCurrentIPInfo() {
    return {
      proxy: this.currentProxy,
      ipManager: !!this.ipManager,
      containerId: process.env.CONTAINER_ID || 'unknown'
    };
  }
}

module.exports = BrowserService;
