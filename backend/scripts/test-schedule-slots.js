#!/usr/bin/env node

/**
 * Test if we can detect available slots in scheduled sessions
 *
 * Goal: Find sessions that have BOTH:
 * 1. People on waiting list
 * 2. Available spots (registrations < capacity)
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testScheduleSlots() {
  console.log('🔍 Testing schedule capacity detection...\n');

  // Use 6-day range (under 7-day limit)
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 6);

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Date range: ${startDateStr} to ${endDateStr} (6 days)\n`);

  // Step 1: Get waiting list
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 1: Get waiting list');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let waitingList = [];
  try {
    const waitlistResponse = await arboxService.client.get('/schedule/entryFromWaitingList', {
      params: { fDate: startDateStr, tDate: endDateStr }
    });
    waitingList = waitlistResponse.data || [];
    console.log(`✅ Found ${waitingList.length} people on waiting lists\n`);

    if (waitingList.length > 0) {
      console.log('Sessions with waitlists:');
      const sessionsByKey = {};
      waitingList.forEach(entry => {
        const key = `${entry.date} ${entry.time} - ${entry.event_name}`;
        if (!sessionsByKey[key]) {
          sessionsByKey[key] = [];
        }
        sessionsByKey[key].push(entry);
      });

      Object.entries(sessionsByKey).forEach(([session, entries]) => {
        console.log(`   ${session}: ${entries.length} waiting`);
      });
    }
  } catch (error) {
    console.log(`❌ Waiting list failed: ${error.message}`);
  }

  // Step 2: Try to get schedule with capacity info
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2: Get schedule with capacity');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const scheduleTests = [
    // Body with exact 6-day range
    { url: '/schedule', data: { fDate: startDateStr, tDate: endDateStr } },

    // Try getting a single day
    { url: '/schedule', data: { fDate: startDateStr, tDate: startDateStr } },

    // Try tomorrow only
    {
      url: '/schedule',
      data: {
        fDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        tDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      }
    },
  ];

  for (const test of scheduleTests) {
    try {
      console.log(`\nTrying: ${test.url} with ${JSON.stringify(test.data)}`);

      const response = await arboxService.client.request({
        method: 'GET',
        url: test.url,
        data: test.data
      });

      const data = response.data;

      // Check if it's an error response
      if (data.statusCode && data.statusCode !== 200) {
        console.log(`API Error: ${data.error?.description || JSON.stringify(data.error)}`);
        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ Got ${data.length} schedule entries!`);
        console.log('\n📋 First entry fields:');
        Object.keys(data[0]).forEach(key => {
          const value = data[0][key];
          const type = typeof value;
          const preview = type === 'object' ? JSON.stringify(value).substring(0, 100) : value;
          console.log(`   ${key}: (${type}) ${preview}`);
        });

        // Look for capacity/registration fields
        const sample = data[0];
        const capacityFields = Object.keys(sample).filter(k => {
          const lower = k.toLowerCase();
          return lower.includes('max') ||
                 lower.includes('capacity') ||
                 lower.includes('limit') ||
                 lower.includes('regist') ||
                 lower.includes('book') ||
                 lower.includes('users') ||
                 lower.includes('attend') ||
                 lower.includes('count') ||
                 lower.includes('available') ||
                 lower.includes('spots');
        });

        if (capacityFields.length > 0) {
          console.log('\n🎯 CAPACITY-RELATED FIELDS FOUND:');
          capacityFields.forEach(field => {
            console.log(`   ${field}: ${JSON.stringify(sample[field])}`);
          });

          // Show a few more samples
          console.log('\n📊 Sample data from 3 sessions:');
          data.slice(0, 3).forEach((entry, i) => {
            console.log(`\n--- Session ${i + 1} ---`);
            capacityFields.forEach(field => {
              console.log(`   ${field}: ${entry[field]}`);
            });
            if (entry.time) console.log(`   time: ${entry.time}`);
            if (entry.name || entry.title) console.log(`   name: ${entry.name || entry.title}`);
          });
        }

        return data;
      }

    } catch (error) {
      console.log(`❌ Failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }
  }

  console.log('\n❌ Could not get schedule data with capacity info');
  return null;
}

if (require.main === module) {
  testScheduleSlots()
    .then(result => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('SUMMARY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (result) {
        console.log('✅ We can implement the polling approach!');
      } else {
        console.log('❌ Need to find another way to get capacity data');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal:', error);
      process.exit(1);
    });
}
