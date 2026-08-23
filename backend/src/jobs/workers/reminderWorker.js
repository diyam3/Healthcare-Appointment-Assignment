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

// Handles both appointment and medication reminders from reminderQueue
const worker = new Worker(
  'reminder',
  async (job) => {
    const { to, subject, html, recipientId, type } = job.data;
    const transport = createTransport();

    await transport.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, html });

    // Mark reminder as sent in DB if linked to a reminder row
    if (job.data.reminderId) {
      await prisma.reminder.update({
        where: { id: job.data.reminderId },
        data: { sent: true },
      }).catch(() => {});
    }

    await prisma.notificationLog.updateMany({
      where: { userId: recipientId, type, status: 'pending' },
      data: { status: 'sent', sentAt: new Date() },
    }).catch(() => {});
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Reminder job ${job.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Reminder worker error:', err.message);
});

module.exports = worker;
