#!/usr/bin/env node

/**
 * Notification Scheduler Job
 * Entry point for Heroku Scheduler
 * Run with: node src/jobs/notificationScheduler.js
 */

require('dotenv').config();
const NotificationOrchestrator = require('../services/notifications/NotificationOrchestrator');
const { isAutomationEnabled, updateLastRun } = require('../controllers/automationsController');

// Map automation IDs to detector names
const AUTOMATION_DETECTORS = {
  'waitlist_capacity_notifications': 'waitlist_capacity',
  'birthday_notifications': 'birthday_notifications',
  'new_lead_notifications': 'new_lead_notifications',
  'trial_notifications': 'trial_notifications',
  'membership_expiry_notifications': 'membership_expiry_notifications',
  'new_membership_notifications': 'new_membership_notifications'
};

async function runScheduledJob() {
  console.log('='.repeat(60));
  console.log('Notification Scheduler - Starting');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log('='.repeat(60));

  // Check which automations are enabled
  const enabledDetectors = [];

  for (const [automationId, detectorName] of Object.entries(AUTOMATION_DETECTORS)) {
    const enabled = await isAutomationEnabled(automationId);
    console.log(`[Scheduler] ${automationId}: ${enabled ? 'ENABLED' : 'DISABLED'}`);

    if (enabled) {
      enabledDetectors.push({ automationId, detectorName });
    }
  }

  if (enabledDetectors.length === 0) {
    console.log('\n[Scheduler] No automations enabled - skipping');
    console.log('='.repeat(60));
    process.exit(0);
  }

  console.log(`\n[Scheduler] Running ${enabledDetectors.length} enabled automation(s)...\n`);

  const orchestrator = new NotificationOrchestrator();

  try {
    // Run only enabled detectors
    const detectorNames = enabledDetectors.map(d => d.detectorName);
    const result = await orchestrator.run(detectorNames);

    // Update last run timestamps for enabled automations
    for (const { automationId } of enabledDetectors) {
      await updateLastRun(automationId);
    }

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
