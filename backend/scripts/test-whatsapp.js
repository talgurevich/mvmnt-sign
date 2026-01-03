/**
 * Test WhatsApp notification
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const NotificationOrchestrator = require('../src/services/notifications/NotificationOrchestrator');

async function testWhatsApp() {
  console.log('Testing WhatsApp notification...\n');

  const orchestrator = new NotificationOrchestrator();

  // Check if WhatsApp channel is configured
  const whatsappChannel = orchestrator.channels.whatsapp;
  console.log('WhatsApp configured:', whatsappChannel.isConfigured());
  console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing');
  console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing');
  console.log('From Number:', process.env.TWILIO_WHATSAPP_FROM || 'Missing');
  console.log('');

  // Run all detectors
  console.log('Running notification orchestrator...\n');
  const result = await orchestrator.run();

  console.log('\nResult:', JSON.stringify(result, null, 2));
}

testWhatsApp()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
