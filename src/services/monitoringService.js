const express = require('express');
const IPManager = require('../services/ipManager');
const { log } = require('../utils');

class MonitoringService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3005;
    this.ipManager = new IPManager();
    this.setupRoutes();
    this.botInstances = new Map();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'monitoring',
        timestamp: new Date().toISOString()
      });
    });

    // Get IP pool status
    this.app.get('/api/ip-status', (req, res) => {
      try {
        const status = this.ipManager.getIPStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get all bot instances status
    this.app.get('/api/bot-instances', (req, res) => {
      const instances = Array.from(this.botInstances.entries()).map(([id, info]) => ({
        id,
        ...info
      }));
      res.json(instances);
    });

    // Register a bot instance
    this.app.post('/api/register-bot', (req, res) => {
      const { containerId, containerName, ip, status, lastSeen } = req.body;
      
      this.botInstances.set(containerId, {
        containerId,
        containerName,
        ip,
        status: status || 'active',
        lastSeen: lastSeen || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      log(`Registered bot instance: ${containerName} (${containerId})`);
      res.json({ success: true, message: 'Bot registered successfully' });
    });

    // Update bot instance status
    this.app.put('/api/bot-instances/:id', (req, res) => {
      const { id } = req.params;
      const updates = req.body;
      
      if (this.botInstances.has(id)) {
        const existing = this.botInstances.get(id);
        this.botInstances.set(id, { ...existing, ...updates });
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Bot instance not found' });
      }
    });

    // Get dashboard data
    this.app.get('/api/dashboard', (req, res) => {
      const ipStatus = this.ipManager.getIPStatus();
      const botInstances = Array.from(this.botInstances.entries()).map(([id, info]) => ({
        id,
        ...info
      }));

      const dashboard = {
        timestamp: new Date().toISOString(),
        summary: {
          totalBots: botInstances.length,
          activeBots: botInstances.filter(bot => bot.status === 'active').length,
          totalIPs: ipStatus.total,
          availableIPs: ipStatus.available,
          inUseIPs: ipStatus.inUse
        },
        bots: botInstances,
        ipUsage: ipStatus.usageStats
      };

      res.json(dashboard);
    });

    // WebSocket for real-time updates (simplified)
    this.app.get('/api/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Send initial data
      const dashboard = this.getDashboardData();
      res.write(`data: ${JSON.stringify(dashboard)}\n\n`);

      // Set up periodic updates
      const interval = setInterval(() => {
        const data = this.getDashboardData();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }, 5000);

      req.on('close', () => {
        clearInterval(interval);
      });
    });
  }

  getDashboardData() {
    const ipStatus = this.ipManager.getIPStatus();
    const botInstances = Array.from(this.botInstances.entries()).map(([id, info]) => ({
      id,
      ...info
    }));

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalBots: botInstances.length,
        activeBots: botInstances.filter(bot => bot.status === 'active').length,
        totalIPs: ipStatus.total,
        availableIPs: ipStatus.available,
        inUseIPs: ipStatus.inUse
      },
      bots: botInstances,
      ipUsage: ipStatus.usageStats
    };
  }

  start() {
    this.app.listen(this.port, () => {
      log(`Monitoring service started on port ${this.port}`);
      log(`Dashboard available at http://localhost:${this.port}/api/dashboard`);
    });
  }

  // Method to check and clean up stale bot instances
  cleanupStaleInstances() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [id, info] of this.botInstances.entries()) {
      const lastSeen = new Date(info.lastSeen);
      if (now - lastSeen > staleThreshold) {
        log(`Removing stale bot instance: ${id}`);
        this.botInstances.delete(id);
      }
    }
  }
}

module.exports = MonitoringService;