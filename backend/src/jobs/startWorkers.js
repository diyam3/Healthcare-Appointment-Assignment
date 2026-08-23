'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

async function startWorkers() {
  try {
    require('./workers/emailWorker');
    require('./workers/reminderWorker');

    try {
      const { scheduleHoldExpirySweeper } = require('./workers/holdExpiryWorker');
      await scheduleHoldExpirySweeper();
    } catch (redisErr) {
      console.warn('Hold expiry sweeper could not start (Redis unavailable):', redisErr.message);
    }

    console.log('All background workers started');
  } catch (err) {
    console.warn('Background workers could not start:', err.message);
  }
}

module.exports = { startWorkers };
