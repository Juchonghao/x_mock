const http = require('http');

function healthCheck(serviceType = 'bot') {
  const port = process.env.PORT || 3000;
  
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/health',
    method: 'GET',
    timeout: 3000
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('Health check passed');
      process.exit(0);
    } else {
      console.log(`Health check failed with status: ${res.statusCode}`);
      process.exit(1);
    }
  });

  req.on('error', (err) => {
    console.log(`Health check failed: ${err.message}`);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.log('Health check timed out');
    req.destroy();
    process.exit(1);
  });

  req.end();
}

if (require.main === module) {
  healthCheck();
}

module.exports = healthCheck;