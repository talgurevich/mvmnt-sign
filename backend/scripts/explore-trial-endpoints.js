#!/usr/bin/env node

/**
 * Explore Arbox API for trial/registration endpoints
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function exploreTrialEndpoints() {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 7);

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const formatDateForArbox = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  console.log('Exploring Arbox API for trial/registration data...\n');
  console.log(`Date range: ${startDateStr} to ${endDateStr}\n`);

  const tests = [
    // scheduleUsers might have registration data
    { url: '/scheduleUsers', data: { from: formatDateForArbox(today), to: formatDateForArbox(endDate) } },
    { url: '/schedule_users', data: { from: formatDateForArbox(today), to: formatDateForArbox(endDate) } },
    { url: '/scheduleUsers', params: { fDate: startDateStr, tDate: endDateStr } },

    // Try intro/trial specific
    { url: '/intro', params: { fDate: startDateStr, tDate: endDateStr } },
    { url: '/introClasses', params: { fDate: startDateStr, tDate: endDateStr } },
    { url: '/trials', params: { fDate: startDateStr, tDate: endDateStr } },

    // Memberships/subscriptions might indicate trial
    { url: '/membershipTypes', params: {} },

    // Get schedule with users included
    { url: '/schedule', data: { from: formatDateForArbox(today), to: formatDateForArbox(endDate), users: true } },
    { url: '/schedule', data: { from: formatDateForArbox(today), to: formatDateForArbox(endDate), registrations: true } },

    // User bookings
    { url: '/userBookings', params: { fDate: startDateStr, tDate: endDateStr } },
    { url: '/bookings/users', params: { fDate: startDateStr, tDate: endDateStr } },
  ];

  for (const test of tests) {
    try {
      const config = { method: 'GET', url: test.url };
      if (test.params) config.params = test.params;
      if (test.data) config.data = test.data;

      console.log(`Testing: ${test.url}`);
      const res = await arboxService.client.request(config);
      const data = res.data;

      if (data && data.statusCode && data.statusCode !== 200) {
        console.log(`  Error: ${data.error?.description || JSON.stringify(data.error)}`);
        continue;
      }

      const arr = data?.data || data;
      if (Array.isArray(arr) && arr.length > 0) {
        console.log(`  ✅ Got ${arr.length} records`);
        console.log(`  Fields: ${Object.keys(arr[0]).slice(0, 15).join(', ')}`);
        console.log(`  Sample: ${JSON.stringify(arr[0]).substring(0, 400)}`);
        console.log('');
      } else if (typeof data === 'object' && !data.statusCode) {
        console.log(`  ✅ Got object with keys: ${Object.keys(data).slice(0, 10).join(', ')}`);
      } else {
        console.log(`  Empty or error response`);
      }
    } catch (e) {
      console.log(`  ❌ ${e.response?.status || 'Error'}: ${e.message.substring(0, 80)}`);
    }
    console.log('');
  }
}

exploreTrialEndpoints()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
