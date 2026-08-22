'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env') });
const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { connection } = require('../queues');

const prisma = new PrismaClient();

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const worker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html, recipientId, type } = job.data;
    const transport = createTransport();

    try {
      await transport.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, html });
      // Update log to sent
      await prisma.notificationLog.updateMany({
        where: { userId: recipientId, type, status: 'pending' },
        data: { status: 'sent', sentAt: new Date() },
      });
    } catch (err) {
      // On final failure after all retries, log as failed
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        await prisma.notificationLog.updateMany({
          where: { userId: recipientId, type, status: 'pending' },
          data: { status: 'failed', errorMessage: err.message },
        }).catch(() => {});
      }
      throw err; // Re-throw so BullMQ retries
    }
  },
  {
    connection,
    // Exponential backoff: attempt 1→1min, 2→5min, 3→30min
    settings: { backoffStrategy: (attemptsMade) => [60000, 300000, 1800000][Math.min(attemptsMade, 2)] },
  }
);

worker.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

module.exports = worker;
