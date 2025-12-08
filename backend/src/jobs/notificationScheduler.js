#!/usr/bin/env node

/**
 * Notification Scheduler Job
 * Entry point for Heroku Scheduler
 * Run with: node src/jobs/notificationScheduler.js
 */

require('dotenv').config();
const NotificationOrchestrator = require('../services/notifications/NotificationOrchestrator');

async function runScheduledJob() {
  console.log('='.repeat(60));
  console.log('Notification Scheduler - Starting');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log('='.repeat(60));

  const orchestrator = new NotificationOrchestrator();

  try {
    const result = await orchestrator.run();

    console.log('\n' + '='.repeat(60));
    console.log('Job completed successfully');
    console.log(`Events detected: ${result.eventsDetected}`);
    console.log(`Notifications sent: ${result.notificationsSent}`);
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('Job failed:', error.message);
    console.error(error.stack);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runScheduledJob();
}

module.exports = { runScheduledJob };
