'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const app = require('./app');

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Required for Render — must bind to all interfaces

// Prevent unhandled promise rejections (e.g. Redis DNS failures) from crashing the process
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (non-fatal):', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (non-fatal):', err.message);
});

const server = app.listen(PORT, HOST, async () => {
  console.log(`Healthcare Appointment API running on ${HOST}:${PORT}`);
  // Start background workers (non-blocking — failures are logged, not thrown)
  try {
    const { startWorkers } = require('./jobs/startWorkers');
    await startWorkers();
  } catch (err) {
    console.warn('Background workers could not start (Redis may be unavailable):', err.message);
  }
});

// Graceful shutdown — Render sends SIGTERM when shutting down a deployment.
// We stop accepting new connections but DO NOT call process.exit() — Render
// will forcibly terminate the process after its drain timeout (30s).
process.on('SIGTERM', () => {
  console.log('SIGTERM received — stopping gracefully');
  server.close(() => {
    console.log('Server drained. Exiting.');
    process.exit(0);
  });
  // Safety: force exit after 25s if connections don't drain
  setTimeout(() => {
    console.warn('Force exit after drain timeout');
    process.exit(0);
  }, 25000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Exiting.');
  process.exit(0);
});

module.exports = server;
