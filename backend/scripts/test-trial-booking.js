#!/usr/bin/env node

/**
 * Test trial booking endpoint to understand session data
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testTrialBooking() {
  console.log('Testing trial booking endpoint...\n');

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 7);

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Try various ways to get trial bookings
  const tests = [
    // GET trial bookings
    { method: 'GET', url: '/schedule/booking/trial', params: {} },
    { method: 'GET', url: '/schedule/booking/trial', params: { fDate: startDateStr, tDate: endDateStr } },
    { method: 'GET', url: '/schedule/booking/trial', data: { fDate: startDateStr, tDate: endDateStr } },

    // Try getting bookings in general
    { method: 'GET', url: '/bookings', params: { fDate: startDateStr, tDate: endDateStr } },
    { method: 'GET', url: '/schedule/bookings', params: { fDate: startDateStr, tDate: endDateStr } },

    // Try registrations
    { method: 'GET', url: '/registrations', params: { fDate: startDateStr, tDate: endDateStr } },
    { method: 'GET', url: '/schedule/registrations', params: { fDate: startDateStr, tDate: endDateStr } },

    // Maybe there's an endpoint for checking availability
    { method: 'GET', url: '/schedule/availability', params: { fDate: startDateStr, tDate: endDateStr } },
    { method: 'GET', url: '/availability', params: { fDate: startDateStr, tDate: endDateStr } },

    // Check if there's a schedule_user or similar
    { method: 'GET', url: '/schedule_users', params: { fDate: startDateStr, tDate: endDateStr } },
    { method: 'GET', url: '/scheduleUsers', params: { fDate: startDateStr, tDate: endDateStr } },
  ];

  for (const test of tests) {
    try {
      console.log(`${test.method} ${test.url}`);
      if (test.params && Object.keys(test.params).length > 0) console.log(`  Params: ${JSON.stringify(test.params)}`);
      if (test.data) console.log(`  Body: ${JSON.stringify(test.data)}`);

      const config = {
        method: test.method,
        url: test.url,
        params: test.params,
        data: test.data
      };

      const res = await arboxService.client.request(config);
      const data = res.data;

      if (data.statusCode && data.statusCode !== 200) {
        console.log(`  API Error: ${data.error?.description || JSON.stringify(data.error)}`);
        continue;
      }

      if (Array.isArray(data)) {
        console.log(`  ✅ Got ${data.length} records`);
        if (data.length > 0) {
          console.log(`  Fields: ${Object.keys(data[0]).join(', ')}`);
          console.log(`  Sample: ${JSON.stringify(data[0], null, 2).substring(0, 800)}`);
          return { test, data };
        }
      } else if (typeof data === 'object') {
        console.log(`  Response: ${JSON.stringify(data).substring(0, 300)}`);
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log(`  data.data has ${data.data.length} records`);
          console.log(`  Sample: ${JSON.stringify(data.data[0], null, 2).substring(0, 800)}`);
          return { test, data: data.data };
        }
      }

    } catch (e) {
      console.log(`  ❌ ${e.response?.status || 'Error'}: ${e.response?.data?.error || e.message}`);
    }
    console.log('');
  }

  console.log('\n❌ No working endpoint found for bookings/registrations');
}

testTrialBooking()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
