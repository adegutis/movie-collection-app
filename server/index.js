// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const config = require('./config');
const photoWatcher = require('./services/photoWatcher');

const moviesRouter = require('./routes/movies');
const importRouter = require('./routes/import');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/movies', moviesRouter);
app.use('/api/import', importRouter);

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Get local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
app.listen(config.port, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('');
  console.log('  Movie Collection Manager');
  console.log('  ========================');
  console.log('');
  console.log(`  Local:   http://localhost:${config.port}`);
  console.log(`  Network: http://${localIP}:${config.port}`);
  console.log('');

  // Start photo watcher
  if (config.anthropicApiKey) {
    photoWatcher.start();
    console.log('  Photo import: ENABLED');
    console.log('  Drop photos in sources/ folder to import');
  } else {
    console.log('  Photo import: DISABLED (set ANTHROPIC_API_KEY in .env)');
  }
  console.log('');
});
