const fs = require('fs');
const path = require('path');
const config = require('../config');

class IPManager {
  constructor() {
    this.ipPool = [];
    this.usedIPs = new Set();
    this.currentIndex = 0;
    this.ipFile = path.join(__dirname, '../../data/ip-pool.json');
    this.loadIPPools();
  }

  loadIPPools() {
    try {
      if (fs.existsSync(this.ipFile)) {
        const data = fs.readFileSync(this.ipFile, 'utf8');
        this.ipPool = JSON.parse(data);
      } else {
        this.ipPool = [
          {
            url: config.proxy.url,
            type: 'http',
            status: 'available',
            lastUsed: null,
            usageCount: 0,
            location: 'US-East',
            containerId: null
          }
        ];
        this.saveIPPools();
      }
      console.log(`Loaded ${this.ipPool.length} IP addresses`);
    } catch (error) {
      console.error('Failed to load IP pool:', error);
      this.ipPool = [];
    }
  }

  saveIPPools() {
    try {
      const dataDir = path.dirname(this.ipFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.ipFile, JSON.stringify(this.ipPool, null, 2));
    } catch (error) {
      console.error('Failed to save IP pool:', error);
    }
  }

  getAvailableIP() {
    const availableIPs = this.ipPool.filter(ip => 
      ip.status === 'available' && 
      (!ip.containerId || ip.containerId === process.env.CONTAINER_ID)
    );

    if (availableIPs.length === 0) {
      console.warn('No available IPs found');
      return null;
    }

    // Round-robin selection
    const selectedIP = availableIPs[this.currentIndex % availableIPs.length];
    this.currentIndex++;

    // Mark as in use
    selectedIP.status = 'in-use';
    selectedIP.containerId = process.env.CONTAINER_ID || 'unknown';
    selectedIP.lastUsed = new Date().toISOString();
    selectedIP.usageCount++;
    
    this.usedIPs.add(selectedIP.url);
    this.saveIPPools();

    console.log(`Assigned IP ${selectedIP.url} to container ${selectedIP.containerId}`);
    return selectedIP.url;
  }

  releaseIP(proxyUrl) {
    const ip = this.ipPool.find(item => item.url === proxyUrl);
    if (ip) {
      ip.status = 'available';
      ip.containerId = null;
      ip.lastReleased = new Date().toISOString();
      this.usedIPs.delete(proxyUrl);
      this.saveIPPools();
      console.log(`Released IP ${proxyUrl}`);
    }
  }

  getIPStatus() {
    return {
      total: this.ipPool.length,
      available: this.ipPool.filter(ip => ip.status === 'available').length,
      inUse: this.ipPool.filter(ip => ip.status === 'in-use').length,
      usageStats: this.ipPool.map(ip => ({
        url: ip.url,
        status: ip.status,
        usageCount: ip.usageCount,
        lastUsed: ip.lastUsed,
        containerId: ip.containerId,
        location: ip.location
      }))
    };
  }

  addIP(ipConfig) {
    this.ipPool.push({
      ...ipConfig,
      status: 'available',
      usageCount: 0,
      lastUsed: null,
      containerId: null
    });
    this.saveIPPools();
    console.log(`Added new IP: ${ipConfig.url}`);
  }

  rotateIP(currentProxy) {
    if (currentProxy) {
      this.releaseIP(currentProxy);
    }
    return this.getAvailableIP();
  }
}

module.exports = IPManager;