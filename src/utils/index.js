const fs = require('fs');
const path = require('path');

// Random delay to mimic human behavior
function randomDelay(min = 1000, max = 3000) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}

// Log with timestamp
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logMessage);
  return logMessage;
}

// Save data to JSON file
function saveToJson(data, filename, dir = './data') {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    log(`Data saved to ${filePath}`);
    return filePath;
  } catch (error) {
    log(`Failed to save data to JSON: ${error.message}`, 'error');
    throw error;
  }
}

// Load data from JSON file
function loadFromJson(filename, dir = './data') {
  try {
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) {
      log(`JSON file not found: ${filePath}`, 'warn');
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    log(`Data loaded from ${filePath}`);
    return data;
  } catch (error) {
    log(`Failed to load data from JSON: ${error.message}`, 'error');
    throw error;
  }
}

// Format date for logging
function formatDate(date = new Date()) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

module.exports = {
  randomDelay,
  log,
  saveToJson,
  loadFromJson,
  formatDate
};
