// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const config = require('./config');
const photoWatcher = require('./services/photoWatcher');

const moviesRouter = require('./routes/movies');
const importRouter = require('./routes/import');

const app = express();

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production';

// Security: Add security headers with helmet
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  } : false, // Disable CSP in development to avoid issues
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true
  } : false,
  crossOriginEmbedderPolicy: false // Can cause issues with some resources
}));

// Security: Configure CORS properly
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: isProduction ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Security: Strict rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management with expiration
const sessions = new Map();
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Security: Timing-safe password comparison
function timingSafePasswordCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a comparison to maintain constant time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Security: Check if session is valid
function isSessionValid(session) {
  return session && (Date.now() - session.created) < SESSION_DURATION;
}

// Security: Clean up expired sessions periodically
setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    if (!isSessionValid(session)) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

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
    const session = sessions.get(sessionId);
    if (isSessionValid(session)) {
      return next();
    }
    // Clean up expired session
    sessions.delete(sessionId);
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
  // Security: Only check for presence of error param, don't reflect any user input
  const hasError = Object.hasOwn(req.query, 'error');
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
        ${hasError ? '<div class="error">Invalid password</div>' : ''}
        <form method="POST" action="/api/auth/login">
          <input type="password" name="password" placeholder="Enter password" autofocus required>
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Login API with rate limiting
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { password } = req.body;

  // Security: Use timing-safe comparison
  if (timingSafePasswordCompare(password, config.appPassword)) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { created: Date.now() });

    // Security: Build cookie with Secure flag in production
    const cookieParts = [
      `session=${sessionId}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${30 * 24 * 60 * 60}`,
      'SameSite=Strict'
    ];

    if (isProduction) {
      cookieParts.push('Secure');
    }

    res.setHeader('Set-Cookie', cookieParts.join('; '));
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

// Security: Allow configuring host binding (default to all interfaces for backward compatibility)
const HOST = process.env.HOST || '0.0.0.0';

// Start server with async initialization for Azure Key Vault
async function startServer() {
  // Initialize config with Azure Key Vault secrets if available
  const { initializeConfig } = require('./config');
  await initializeConfig();

  app.listen(config.port, HOST, () => {
    const localIP = getLocalIP();
    console.log('');
    console.log('  Movie Collection Manager');
    console.log('  ========================');
    console.log('');
    console.log(`  Local:   http://localhost:${config.port}`);
    if (HOST === '0.0.0.0') {
      console.log(`  Network: http://${localIP}:${config.port}`);
    }
    console.log('');
    console.log(`  Environment: ${isProduction ? 'production' : 'development'}`);
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
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
