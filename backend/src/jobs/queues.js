'use strict';
const { Queue } = require('bullmq');
const { Redis } = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

const emailQueue = new Queue('email', { connection });
const reminderQueue = new Queue('reminder', { connection });

module.exports = { emailQueue, reminderQueue, connection };
