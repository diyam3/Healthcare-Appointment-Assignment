'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

async function startWorkers() {
  try {
    require('./workers/emailWorker');
    require('./workers/reminderWorker');
    const { worker: holdWorker, scheduleHoldExpirySweeper } = require('./workers/holdExpiryWorker');
    await scheduleHoldExpirySweeper();
    console.log('All background workers started');
  } catch (err) {
    console.error('Failed to start workers:', err.message);
  }
}

module.exports = { startWorkers };
