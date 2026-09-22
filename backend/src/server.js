const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config/env');

const {
  testConnection,
  initializeDatabase,
} = require('./db/postgres');

const agentRoutes = require('./routes/agentRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const groupRoutes = require('./routes/groupRoutes');
const reportRoutes = require('./routes/reportRoutes');
const fileEventRoutes = require('./routes/fileEventRoutes');
const filePolicyRoutes = require('./routes/filePolicyRoutes');
const usbEventRoutes = require('./routes/usbEventRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

const PORT = config.port;

/* =====================================================
   CORS
===================================================== */

const allowedOrigins = (config.corsOrigin || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header
      // and requests from configured origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },
    credentials: true,
  })
);

/* =====================================================
   BODY PARSING
===================================================== */

app.use(
  express.json({
    limit: '1mb',
  })
);

/* =====================================================
   COOKIE
===================================================== */

app.use(cookieParser());

/* =====================================================
   REQUEST LOGGING
===================================================== */

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url}`
  );

  next();
});

/* =====================================================
   ROOT ROUTE
===================================================== */

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'endpoint-portal-api',
    message: 'Endpoint Portal API is running',
  });
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'endpoint-portal-api',
  });
});

/* =====================================================
   AUTHENTICATION
===================================================== */

app.use('/api', authRoutes);

/* =====================================================
   EXISTING APIs
===================================================== */

app.use('/api', agentRoutes);

app.use('/api', metricsRoutes);

app.use('/api', groupRoutes);

app.use('/api', reportRoutes);

app.use('/api', fileEventRoutes);

app.use('/api', filePolicyRoutes);

app.use('/api', usbEventRoutes);

/* =====================================================
   404 HANDLER
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} was not found`,
  });
});

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use((err, req, res, next) => {
  console.error(
    'Unhandled error:',
    err
  );

  const statusCode =
    err.statusCode || 500;

  const message =
    err.message ||
    'Internal server error';

  res.status(statusCode).json({
    error: 'Server error',
    message,
  });
});

/* =====================================================
   START SERVER
===================================================== */

async function startServer() {
  try {
    const dbReady =
      await testConnection();

    if (!dbReady) {
      console.warn(
        'Database is not reachable, but the API will still start.'
      );
    } else {
      await initializeDatabase();
    }

    app.listen(
      PORT,
      '0.0.0.0',
      () => {
        console.log(
          `Endpoint Portal API running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      'Failed to start server:',
      error.message
    );

    process.exit(1);
  }
}

startServer();

module.exports = app;