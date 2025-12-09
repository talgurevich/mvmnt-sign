#!/usr/bin/env node

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function test() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const in3days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  console.log('Today:', today);
  console.log('Tomorrow:', tomorrow);
  console.log('');

  const tests = [
    // With locations_box_fk
    { fDate: today, tDate: today, locations_box_fk: 12222 },
    { fDate: today, tDate: tomorrow, locations_box_fk: 12222 },

    // With both box params
    { fDate: today, tDate: today, box_fk: 15324, locations_box_fk: 12222 },
    { fDate: today, tDate: in3days, box_fk: 15324, locations_box_fk: 12222 },

    // Without box params
    { fDate: today, tDate: today },
    { fDate: today, tDate: in3days },

    // Try European date format
    { fDate: today.split('-').reverse().join('/'), tDate: today.split('-').reverse().join('/') },
  ];

  for (const body of tests) {
    try {
      console.log('Testing:', JSON.stringify(body));
      const res = await arboxService.client.request({
        method: 'GET',
        url: '/schedule',
        data: body
      });

      if (res.data.statusCode && res.data.statusCode !== 200) {
        console.log('  Error:', res.data.error?.description || res.data.error);
      } else if (Array.isArray(res.data)) {
        console.log('  ✅ SUCCESS! Got', res.data.length, 'records');
        if (res.data.length > 0) {
          console.log('  Fields:', Object.keys(res.data[0]).slice(0, 15).join(', '));

          // Check for capacity fields
          const sample = res.data[0];
          const capacityFields = Object.keys(sample).filter(k =>
            k.toLowerCase().includes('max') ||
            k.toLowerCase().includes('limit') ||
            k.toLowerCase().includes('capacity') ||
            k.toLowerCase().includes('registered') ||
            k.toLowerCase().includes('booked')
          );
          if (capacityFields.length > 0) {
            console.log('  📊 Capacity fields:', capacityFields.join(', '));
            console.log('  Sample values:', capacityFields.map(f => `${f}=${sample[f]}`).join(', '));
          }
        }
        // Stop on first success
        return res.data;
      } else {
        console.log('  Response:', JSON.stringify(res.data).substring(0, 200));
      }
    } catch (e) {
      console.log('  FAILED:', e.response?.status, e.response?.data?.error || e.message);
    }
    console.log('');
  }

  return null;
}

test()
  .then(data => {
    if (data && data.length > 0) {
      console.log('\n━━━ FULL SAMPLE RECORD ━━━');
      console.log(JSON.stringify(data[0], null, 2));
    }
    process.exit(0);
  })
  .catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
