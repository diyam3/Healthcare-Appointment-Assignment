'use strict';
const { Queue } = require('bullmq');
const { Redis } = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
});

// Prevent unhandled error events from crashing the process
connection.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

const emailQueue = new Queue('email', { connection });
const reminderQueue = new Queue('reminder', { connection });

module.exports = { emailQueue, reminderQueue, connection };
