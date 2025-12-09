#!/usr/bin/env node

/**
 * Test Arbox Waiting List API
 *
 * Explores the /schedule/entryFromWaitingList endpoint to understand:
 * 1. How to retrieve waiting list entries
 * 2. What user data is included (for messaging purposes)
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testWaitlistAPI() {
  console.log('🔍 Testing Arbox Waiting List API...\n');

  // Date ranges to test
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const lastMonth = new Date();
  lastMonth.setMonth(today.getMonth() - 1);

  const startDate = today.toISOString().split('T')[0];
  const endDate = nextWeek.toISOString().split('T')[0];
  const pastStart = lastMonth.toISOString().split('T')[0];

  console.log(`Testing date range: ${startDate} to ${endDate}\n`);

  // Different endpoint/parameter combinations to try
  const testCases = [
    // GET with query params
    { method: 'GET', url: '/schedule/entryFromWaitingList', params: { fDate: startDate, tDate: endDate } },
    { method: 'GET', url: '/schedule/entryFromWaitingList', params: { from: startDate, to: endDate } },
    { method: 'GET', url: '/schedule/entryFromWaitingList', params: { startDate, endDate } },
    { method: 'GET', url: '/schedule/entryFromWaitingList', params: {} },

    // Try past dates (more likely to have data)
    { method: 'GET', url: '/schedule/entryFromWaitingList', params: { fDate: pastStart, tDate: startDate } },

    // GET with body (unusual but documented)
    { method: 'GET', url: '/schedule/entryFromWaitingList', body: { fDate: startDate, tDate: endDate } },

    // POST variant (in case GET doesn't work)
    { method: 'POST', url: '/schedule/entryFromWaitingList', body: { fDate: startDate, tDate: endDate } },

    // Alternative endpoint names
    { method: 'GET', url: '/schedule/waitingList', params: { fDate: startDate, tDate: endDate } },
    { method: 'GET', url: '/schedule/standby', params: { fDate: startDate, tDate: endDate } },
    { method: 'GET', url: '/waitingList', params: { fDate: startDate, tDate: endDate } },
  ];

  let successfulResponse = null;

  for (const testCase of testCases) {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Testing: ${testCase.method} ${testCase.url}`);
      if (testCase.params) console.log(`Params: ${JSON.stringify(testCase.params)}`);
      if (testCase.body) console.log(`Body: ${JSON.stringify(testCase.body)}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let response;
      if (testCase.method === 'GET') {
        response = await arboxService.client.get(testCase.url, {
          params: testCase.params,
          data: testCase.body // Some APIs accept body with GET
        });
      } else {
        response = await arboxService.client.post(testCase.url, testCase.body);
      }

      const data = response.data;
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);

      if (Array.isArray(data)) {
        console.log(`Records found: ${data.length}`);

        if (data.length > 0) {
          console.log('\n📋 Sample waiting list entry:');
          console.log(JSON.stringify(data[0], null, 2));

          // Analyze fields for user contact info
          console.log('\n📊 Available fields:');
          Object.keys(data[0]).forEach(key => {
            const value = data[0][key];
            const type = Array.isArray(value) ? 'array' : typeof value;
            console.log(`   - ${key}: ${type}`);
          });

          // Look for user/contact info
          const sample = data[0];
          const contactFields = ['phone', 'email', 'user', 'userId', 'user_id', 'firstName', 'lastName', 'mobile'];
          const foundContacts = contactFields.filter(f => sample[f] || (sample.user && sample.user[f]));
          if (foundContacts.length > 0) {
            console.log('\n📱 Contact info fields found:', foundContacts.join(', '));
          }

          successfulResponse = { testCase, data };
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log('\n📋 Response object:');
        console.log(JSON.stringify(data, null, 2).substring(0, 2000));
        successfulResponse = { testCase, data };
      }

      // If we got a successful response with data, we can stop
      if (successfulResponse && (Array.isArray(successfulResponse.data) ? successfulResponse.data.length > 0 : true)) {
        console.log('\n✨ Found working endpoint!\n');
        break;
      }

    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      console.log(`❌ FAILED: ${status || 'No response'} - ${message}`);

      if (error.response?.data) {
        console.log('Error details:', JSON.stringify(error.response.data).substring(0, 300));
      }
    }
    console.log('\n');
  }

  // Also test the regular schedule endpoint to see if it includes waitlist data
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 Checking if regular /schedule includes waitlist data...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const scheduleResponse = await arboxService.client.get('/schedule', {
      params: { fDate: startDate, tDate: endDate }
    });

    const schedules = scheduleResponse.data;
    console.log(`Found ${Array.isArray(schedules) ? schedules.length : 0} scheduled events`);

    if (Array.isArray(schedules) && schedules.length > 0) {
      const sample = schedules[0];
      console.log('\n📋 Sample schedule fields:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
        const preview = typeof value === 'string' ? value.substring(0, 50) : '';
        console.log(`   - ${key}: ${type} ${preview}`);
      });

      // Look for waitlist-related fields
      const waitlistFields = Object.keys(sample).filter(k =>
        k.toLowerCase().includes('wait') ||
        k.toLowerCase().includes('standby') ||
        k.toLowerCase().includes('queue')
      );

      if (waitlistFields.length > 0) {
        console.log('\n🎯 Waitlist-related fields found:', waitlistFields.join(', '));
        waitlistFields.forEach(field => {
          console.log(`\n${field}:`, JSON.stringify(sample[field], null, 2));
        });
      }

      // Check for nested user data
      if (sample.users || sample.registrations || sample.attendees) {
        console.log('\n👥 Found user/registration data in schedule!');
      }
    }

  } catch (error) {
    console.log(`❌ Schedule check failed: ${error.response?.status || error.message}`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  if (successfulResponse) {
    console.log('✅ Working endpoint found!');
    console.log(`   ${successfulResponse.testCase.method} ${successfulResponse.testCase.url}`);
    console.log(`   Params: ${JSON.stringify(successfulResponse.testCase.params || successfulResponse.testCase.body)}`);
  } else {
    console.log('❌ No working waitlist endpoint found with tested parameters');
    console.log('\nPossible reasons:');
    console.log('   1. No one is currently on a waiting list');
    console.log('   2. Different parameter format required');
    console.log('   3. Endpoint requires specific schedule/event ID');
  }
}

// Run the script
if (require.main === module) {
  testWaitlistAPI()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = testWaitlistAPI;
