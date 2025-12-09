#!/usr/bin/env node

/**
 * Test finding session capacity/availability
 *
 * Goal: For each waitlist entry, find if there's space in that session
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testSessionCapacity() {
  console.log('Testing session capacity detection...\n');

  // First get the waiting list
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 7);

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log('Step 1: Get waiting list entries...');
  const waitlistRes = await arboxService.client.get('/schedule/entryFromWaitingList', {
    params: { fDate: startDateStr, tDate: endDateStr }
  });

  const waitlist = waitlistRes.data || [];
  console.log(`Found ${waitlist.length} waitlist entries\n`);

  if (waitlist.length === 0) {
    console.log('No waitlist entries to check');
    return;
  }

  // Get unique session info from waitlist
  const sessions = {};
  waitlist.forEach(entry => {
    const key = `${entry.date}_${entry.time}_${entry.event_name}`;
    if (!sessions[key]) {
      sessions[key] = {
        date: entry.date,
        time: entry.time,
        event_name: entry.event_name,
        coach: entry.coach,
        waitlist_count: 0
      };
    }
    sessions[key].waitlist_count++;
  });

  console.log('Sessions with waitlists:');
  Object.values(sessions).forEach(s => {
    console.log(`  ${s.date} ${s.time} - ${s.event_name} (${s.waitlist_count} waiting)`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('Step 2: Try to find capacity data...');
  console.log('='.repeat(60) + '\n');

  // Try various endpoints to find capacity
  const endpointsToTry = [
    // Schedule with different date formats
    { url: '/schedule', method: 'GET', data: { fDate: startDateStr, tDate: startDateStr } },

    // Try schedulesBox
    { url: '/schedulesBox', method: 'GET', params: { fDate: startDateStr, tDate: startDateStr } },

    // Try with locations_box_fk
    { url: '/schedule', method: 'GET', data: { fDate: startDateStr, tDate: startDateStr, locations_box_fk: 12222 } },

    // Try box categories
    { url: '/schedule/boxCategories', method: 'GET', data: { locations_box_fk: 12222 } },

    // Try classes endpoint
    { url: '/classes', method: 'GET', params: { fDate: startDateStr, tDate: startDateStr } },

    // Try sessions endpoint
    { url: '/sessions', method: 'GET', params: { fDate: startDateStr, tDate: startDateStr } },

    // Try events endpoint
    { url: '/events', method: 'GET', params: { fDate: startDateStr, tDate: startDateStr } },

    // Try box schedule
    { url: '/box/schedule', method: 'GET', params: { fDate: startDateStr, tDate: startDateStr } },

    // Try schedule/sessions
    { url: '/schedule/sessions', method: 'GET', params: { fDate: startDateStr, tDate: startDateStr } },

    // Try user schedule (might show capacity)
    { url: '/users/schedule', method: 'GET', params: { fDate: startDateStr, tDate: startDateStr } },

    // Try reports
    { url: '/reports/schedule', method: 'GET', data: { fDate: startDateStr, tDate: startDateStr } },
    { url: '/reports/classes', method: 'GET', data: { fDate: startDateStr, tDate: startDateStr } },
  ];

  for (const endpoint of endpointsToTry) {
    try {
      console.log(`Testing: ${endpoint.method} ${endpoint.url}`);

      const config = {
        method: endpoint.method,
        url: endpoint.url,
      };

      if (endpoint.data) config.data = endpoint.data;
      if (endpoint.params) config.params = endpoint.params;

      const response = await arboxService.client.request(config);
      const data = response.data;

      // Check for API error response
      if (data.statusCode && data.statusCode !== 200) {
        console.log(`  API Error: ${data.error?.description || JSON.stringify(data.error)}`);
        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        console.log(`  ✅ SUCCESS! Got ${data.length} records`);

        // Show fields
        const fields = Object.keys(data[0]);
        console.log(`  Fields: ${fields.slice(0, 15).join(', ')}`);

        // Look for capacity-related fields
        const capacityFields = fields.filter(f => {
          const lower = f.toLowerCase();
          return lower.includes('max') ||
                 lower.includes('limit') ||
                 lower.includes('capacity') ||
                 lower.includes('registered') ||
                 lower.includes('booked') ||
                 lower.includes('available') ||
                 lower.includes('spots') ||
                 lower.includes('count') ||
                 lower.includes('users');
        });

        if (capacityFields.length > 0) {
          console.log(`  🎯 CAPACITY FIELDS: ${capacityFields.join(', ')}`);

          // Show sample values
          const sample = data[0];
          capacityFields.forEach(field => {
            console.log(`     ${field}: ${JSON.stringify(sample[field])}`);
          });
        }

        // Show first record
        console.log('\n  First record:');
        console.log(JSON.stringify(data[0], null, 2).split('\n').map(l => '  ' + l).join('\n').substring(0, 1500));

        return { endpoint, data };
      } else if (typeof data === 'object' && !data.error) {
        console.log(`  Response: ${JSON.stringify(data).substring(0, 200)}`);
      }

    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error || error.message;
      console.log(`  ❌ ${status || 'Error'}: ${msg}`);
    }
    console.log('');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Step 3: Check the waiting list entry for any session IDs...');
  console.log('='.repeat(60) + '\n');

  // Maybe there's a schedule_id in the waitlist we missed
  console.log('Full waitlist entry structure:');
  console.log(JSON.stringify(waitlist[0], null, 2));

  // Check all numeric fields that might be IDs
  const entry = waitlist[0];
  const possibleIds = Object.entries(entry)
    .filter(([k, v]) => typeof v === 'number')
    .map(([k, v]) => ({ field: k, value: v }));

  console.log('\nPossible ID fields:', possibleIds);

  // Try to fetch schedule by these IDs
  for (const idField of possibleIds) {
    if (idField.field === 'user_fk') continue; // Skip user ID

    console.log(`\nTrying to get schedule by ${idField.field}=${idField.value}...`);

    const tryEndpoints = [
      `/schedule/${idField.value}`,
      `/schedules/${idField.value}`,
      `/schedule?id=${idField.value}`,
      `/schedule?schedule_id=${idField.value}`,
    ];

    for (const url of tryEndpoints) {
      try {
        const res = await arboxService.client.get(url);
        if (res.data && !res.data.error) {
          console.log(`  ✅ ${url} worked!`);
          console.log(JSON.stringify(res.data, null, 2).substring(0, 500));
          return { url, data: res.data };
        }
      } catch (e) {
        // Silent fail
      }
    }
  }

  console.log('\n❌ Could not find a way to get session capacity data');
}

testSessionCapacity()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
