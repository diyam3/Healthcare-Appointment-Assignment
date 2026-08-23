'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env') });
const { Worker, Queue } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { connection } = require('../queues');

const prisma = new PrismaClient();

// Register a repeating job that sweeps every 60 seconds
async function scheduleHoldExpirySweeper() {
  const holdExpiryQueue = new Queue('holdExpiry', { connection });
  await holdExpiryQueue.add(
    'sweep',
    {},
    { repeat: { every: 60000 }, jobId: 'hold-expiry-sweeper' }
  );
  console.log('Hold expiry sweeper scheduled (every 60s)');
}

const worker = new Worker(
  'holdExpiry',
  async () => {
    const deleted = await prisma.slotHold.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (deleted.count > 0) {
      console.log(`Hold expiry sweeper: removed ${deleted.count} expired hold(s)`);
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error('Hold expiry sweep failed:', err.message);
});

worker.on('error', (err) => {
  console.error('Hold expiry worker error:', err.message);
});

module.exports = { worker, scheduleHoldExpirySweeper };
