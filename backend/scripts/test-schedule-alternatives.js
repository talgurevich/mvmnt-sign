#!/usr/bin/env node

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function test() {
  console.log('Testing alternative schedule endpoints...\n');

  // First get waiting list to find schedule IDs
  console.log('Step 1: Get waiting list for schedule references...');
  let waitlistData = [];
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const res = await arboxService.client.get('/schedule/entryFromWaitingList', {
      params: { fDate: today, tDate: nextWeek }
    });
    waitlistData = res.data || [];
    console.log(`Found ${waitlistData.length} waitlist entries`);

    if (waitlistData.length > 0) {
      console.log('\nWaitlist entry fields:');
      console.log(Object.keys(waitlistData[0]).join(', '));
      console.log('\nFirst entry:', JSON.stringify(waitlistData[0], null, 2));
    }
  } catch (e) {
    console.log('Waitlist failed:', e.message);
  }

  // Try to get specific schedule by ID if we have one
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2: Try other schedule-related endpoints...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Get user_fk from waitlist to try user-specific endpoints
  const userFk = waitlistData[0]?.user_fk;

  const endpoints = [
    // Box categories might give us class types
    { method: 'GET', url: '/schedule/boxCategories', data: { locations_box_fk: 12222 } },
    { method: 'GET', url: '/schedule/boxCategories', params: { locations_box_fk: 12222 } },

    // Maybe classes endpoint
    { method: 'GET', url: '/classes', data: { fDate: today, tDate: tomorrow } },

    // User-specific schedule
    { method: 'GET', url: `/users/${userFk}/schedule`, params: { fDate: today, tDate: tomorrow } },

    // Reports
    { method: 'GET', url: '/reports/active-members', params: {} },

    // Get location details
    { method: 'GET', url: '/locations', params: {} },
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\nTrying: ${ep.method} ${ep.url}`);
      if (ep.data) console.log('  Body:', JSON.stringify(ep.data));
      if (ep.params) console.log('  Params:', JSON.stringify(ep.params));

      const res = await arboxService.client.request({
        method: ep.method,
        url: ep.url,
        data: ep.data,
        params: ep.params
      });

      const data = res.data;

      if (data.statusCode && data.statusCode !== 200) {
        console.log('  API Error:', data.error?.description || data.error);
        continue;
      }

      if (Array.isArray(data)) {
        console.log(`  ✅ Got ${data.length} records`);
        if (data.length > 0) {
          console.log('  Fields:', Object.keys(data[0]).slice(0, 20).join(', '));

          // Check for schedule/capacity related fields
          const sample = data[0];
          const scheduleFields = Object.keys(sample).filter(k => {
            const lower = k.toLowerCase();
            return lower.includes('schedule') ||
                   lower.includes('class') ||
                   lower.includes('session') ||
                   lower.includes('capacity') ||
                   lower.includes('max') ||
                   lower.includes('limit') ||
                   lower.includes('registered');
          });

          if (scheduleFields.length > 0) {
            console.log('  🎯 Schedule-related fields:', scheduleFields.join(', '));
            scheduleFields.forEach(f => {
              console.log(`     ${f}: ${JSON.stringify(sample[f]).substring(0, 100)}`);
            });
          }
        }
      } else if (typeof data === 'object') {
        console.log('  Response type: object');
        console.log('  Keys:', Object.keys(data).slice(0, 20).join(', '));

        if (data.data && Array.isArray(data.data)) {
          console.log(`  data.data has ${data.data.length} records`);
        }
      }

    } catch (e) {
      console.log(`  ❌ ${e.response?.status || 'Error'}:`, e.response?.data?.error || e.message);
    }
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nThe waiting list gives us:');
  console.log('  - date, time, event_name (to identify the session)');
  console.log('  - phone, name (to contact the person)');
  console.log('\nWe still need a way to check if that session has available spots.');
}

test().then(() => process.exit(0)).catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
