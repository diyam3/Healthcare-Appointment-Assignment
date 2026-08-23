'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const app = require('./app');

const PORT = process.env.PORT || 3001;

// Prevent unhandled promise rejections (e.g. Redis DNS failures) from crashing the process
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (non-fatal):', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  // Only log — don't exit, so the HTTP server keeps serving requests
  console.error('Uncaught exception (non-fatal):', err.message);
});

const server = app.listen(PORT, async () => {
  console.log(`Healthcare Appointment API running on port ${PORT}`);
  // Start background workers (non-blocking — failures are logged, not thrown)
  try {
    const { startWorkers } = require('./jobs/startWorkers');
    await startWorkers();
  } catch (err) {
    console.warn('Background workers could not start (Redis may be unavailable):', err.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

module.exports = server;
