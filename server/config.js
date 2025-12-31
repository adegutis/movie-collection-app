const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  dataDir: path.join(__dirname, '..', 'data'),
  sourcesDir: path.join(__dirname, '..', 'sources'),
  processedDir: path.join(__dirname, '..', 'sources', 'processed'),
  maxBackups: 10,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  appPassword: process.env.APP_PASSWORD // If set, requires password to access
};
