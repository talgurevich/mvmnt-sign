#!/usr/bin/env node

/**
 * Test /schedule/booking/trial endpoint
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testTrialEndpoint() {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 14);

  const formatDateForArbox = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log('Testing /schedule/booking/trial endpoint...');
  console.log('Date range:', startDateStr, 'to', endDateStr);
  console.log('');

  // Try various parameter formats
  const tests = [
    // Body with from/to like schedule endpoint
    { method: 'GET', url: '/schedule/booking/trial', data: { from: formatDateForArbox(today), to: formatDateForArbox(endDate) } },
    // Body with fDate/tDate
    { method: 'GET', url: '/schedule/booking/trial', data: { fDate: startDateStr, tDate: endDateStr } },
    // Query params
    { method: 'GET', url: '/schedule/booking/trial', params: { from: formatDateForArbox(today), to: formatDateForArbox(endDate) } },
    { method: 'GET', url: '/schedule/booking/trial', params: { fDate: startDateStr, tDate: endDateStr } },
    // Empty body
    { method: 'GET', url: '/schedule/booking/trial', data: {} },
    // No params at all
    { method: 'GET', url: '/schedule/booking/trial' },
  ];

  for (const test of tests) {
    try {
      console.log(`Trying: ${test.method} ${test.url}`);
      if (test.data) console.log('  Body:', JSON.stringify(test.data));
      if (test.params) console.log('  Params:', JSON.stringify(test.params));

      const res = await arboxService.client.request(test);
      const data = res.data;

      if (data && data.statusCode && data.statusCode !== 200) {
        console.log('  Error:', data.error?.description || JSON.stringify(data.error));
        console.log('');
        continue;
      }

      const arr = data?.data || data;
      if (Array.isArray(arr)) {
        console.log('  ✅ Got', arr.length, 'trial bookings');
        if (arr.length > 0) {
          console.log('  Fields:', Object.keys(arr[0]).join(', '));
          console.log('  Sample:', JSON.stringify(arr[0], null, 2));
        }
        console.log('');
        return arr;
      } else if (typeof data === 'object') {
        console.log('  Response type:', typeof data);
        console.log('  Keys:', Object.keys(data).join(', '));
        console.log('  Content:', JSON.stringify(data).substring(0, 600));
      }
    } catch (e) {
      console.log('  ❌', e.response?.status || 'Error:', e.message.substring(0, 100));
    }
    console.log('');
  }

  return null;
}

testTrialEndpoint()
  .then(result => {
    if (result) {
      console.log('\n✅ Found working endpoint!');
    } else {
      console.log('\n❌ No working configuration found');
    }
    process.exit(0);
  })
  .catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
