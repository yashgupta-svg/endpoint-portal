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

app.use(
  cors({
    origin:
      config.corsOrigin === '*'
        ? true
        : config.corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

app.use(cookieParser());

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url}`
  );
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'endpoint-portal-api',
  });
});

// Authentication
app.use('/api', authRoutes);

// Existing APIs
app.use('/api', agentRoutes);
app.use('/api', metricsRoutes);
app.use('/api', groupRoutes);
app.use('/api', reportRoutes);
app.use('/api', fileEventRoutes);
app.use('/api', filePolicyRoutes);
app.use('/api', usbEventRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} was not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message =
    err.message || 'Internal server error';

  res.status(statusCode).json({
    error: 'Server error',
    message,
  });
});

async function startServer() {
  try {
    const dbReady = await testConnection();

    if (!dbReady) {
      console.warn(
        'Database is not reachable, but the API will still start.'
      );
    } else {
      await initializeDatabase();
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `Endpoint Portal API running on http://192.168.1.42:${PORT}`
      );
    });
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