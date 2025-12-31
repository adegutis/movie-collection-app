// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const config = require('./config');
const photoWatcher = require('./services/photoWatcher');

const moviesRouter = require('./routes/movies');
const importRouter = require('./routes/import');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Password protection middleware (only active if APP_PASSWORD is set)
const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) cookies[name] = value;
    });
  }
  return cookies;
}

function authMiddleware(req, res, next) {
  // Skip if no password configured (local development)
  if (!config.appPassword) {
    return next();
  }

  // Allow login page and login API
  if (req.path === '/login' || req.path === '/api/auth/login') {
    return next();
  }

  // Check session cookie
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['session'];

  if (sessionId && sessions.has(sessionId)) {
    return next();
  }

  // Not authenticated - redirect to login or return 401 for API
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  return res.redirect('/login');
}

app.use(authMiddleware);

// Login page
app.get('/login', (req, res) => {
  if (!config.appPassword) {
    return res.redirect('/');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - Movie Collection</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1a1a2e;
          color: #eee;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-box {
          background: #16213e;
          padding: 40px;
          border-radius: 8px;
          width: 100%;
          max-width: 400px;
          margin: 20px;
        }
        h1 { margin-bottom: 24px; font-size: 1.5rem; text-align: center; }
        .error { background: #e74c3c; padding: 12px; border-radius: 4px; margin-bottom: 16px; }
        input {
          width: 100%;
          padding: 12px 16px;
          font-size: 1rem;
          border: 1px solid #2a2a4a;
          border-radius: 8px;
          background: #0f1729;
          color: #eee;
          margin-bottom: 16px;
        }
        input:focus { outline: none; border-color: #4a9eff; }
        button {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
          font-weight: 500;
          border: none;
          border-radius: 8px;
          background: #4a9eff;
          color: #fff;
          cursor: pointer;
        }
        button:hover { background: #3a8eef; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>Movie Collection</h1>
        ${req.query.error ? '<div class="error">Invalid password</div>' : ''}
        <form method="POST" action="/api/auth/login">
          <input type="password" name="password" placeholder="Enter password" autofocus required>
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Login API
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;

  if (password === config.appPassword) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { created: Date.now() });

    // Set cookie (30 days expiry)
    res.setHeader('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; Max-Age=${30 * 24 * 60 * 60}; SameSite=Strict`);
    return res.redirect('/');
  }

  return res.redirect('/login?error=1');
});

// Logout API
app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['session'];

  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login');
});

// Static files (after auth middleware)
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
