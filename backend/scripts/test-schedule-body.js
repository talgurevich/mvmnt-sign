#!/usr/bin/env node

/**
 * Test Arbox Schedule API with body parameters
 *
 * The API documentation shows the schedule endpoint expects a request body
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testScheduleWithBody() {
  console.log('🔍 Testing Arbox Schedule API with body params...\n');

  // Get box_fk from users first
  const users = await arboxService.getUsers();
  const boxFk = users[0]?.box_fk;
  const locationsBoxFk = users[0]?.locations_box_fk;

  console.log(`box_fk: ${boxFk}`);
  console.log(`locations_box_fk: ${locationsBoxFk}\n`);

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 7);

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Date range: ${startDateStr} to ${endDateStr}\n`);

  // Different body parameter combinations
  const testCases = [
    // GET with body (as documented)
    {
      method: 'GET',
      url: '/schedule',
      body: { fDate: startDateStr, tDate: endDateStr, box_fk: boxFk }
    },
    {
      method: 'GET',
      url: '/schedule',
      body: { from: startDateStr, to: endDateStr, box_fk: boxFk }
    },
    {
      method: 'GET',
      url: '/schedule',
      body: { fDate: startDateStr, tDate: endDateStr, locations_box_fk: locationsBoxFk }
    },
    {
      method: 'GET',
      url: '/schedule',
      body: { fDate: startDateStr, tDate: endDateStr }
    },

    // POST variant
    {
      method: 'POST',
      url: '/schedule',
      body: { fDate: startDateStr, tDate: endDateStr, box_fk: boxFk }
    },

    // Try schedule/boxCategories first to see if we need category IDs
    {
      method: 'GET',
      url: '/schedule/boxCategories',
      body: {}
    },
  ];

  for (const testCase of testCases) {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`${testCase.method} ${testCase.url}`);
      console.log(`Body: ${JSON.stringify(testCase.body)}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let response;
      if (testCase.method === 'GET') {
        // Try both as query params AND as body
        response = await arboxService.client.request({
          method: 'GET',
          url: testCase.url,
          data: testCase.body,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        response = await arboxService.client.post(testCase.url, testCase.body);
      }

      const data = response.data;
      console.log(`✅ Status: ${response.status}`);

      if (data.statusCode && data.statusCode !== 200) {
        console.log(`API Error: ${data.error?.description || JSON.stringify(data.error)}`);
        continue;
      }

      if (Array.isArray(data)) {
        console.log(`Records: ${data.length}`);
        if (data.length > 0) {
          console.log('\n📋 Sample record:');
          console.log(JSON.stringify(data[0], null, 2));

          // Look for registration/capacity fields
          const sample = data[0];
          const relevantFields = Object.keys(sample).filter(k => {
            const lower = k.toLowerCase();
            return lower.includes('regist') ||
                   lower.includes('capacity') ||
                   lower.includes('max') ||
                   lower.includes('limit') ||
                   lower.includes('users') ||
                   lower.includes('attend') ||
                   lower.includes('book') ||
                   lower.includes('spots') ||
                   lower.includes('available') ||
                   lower.includes('waitlist') ||
                   lower.includes('standby');
          });

          if (relevantFields.length > 0) {
            console.log('\n🎯 Registration/capacity fields:');
            relevantFields.forEach(field => {
              console.log(`   ${field}: ${JSON.stringify(sample[field])}`);
            });
          }

          return { testCase, data };
        }
      } else if (typeof data === 'object') {
        console.log('Response object:');
        console.log(JSON.stringify(data, null, 2).substring(0, 1500));

        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log('\n📋 Sample from data.data:');
          console.log(JSON.stringify(data.data[0], null, 2));
          return { testCase, data: data.data };
        }
      }

    } catch (error) {
      console.log(`❌ ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(JSON.stringify(error.response.data).substring(0, 300));
      }
    }
    console.log('\n');
  }

  console.log('No working schedule endpoint found');
}

if (require.main === module) {
  testScheduleWithBody()
    .then(result => {
      if (result) {
        console.log('\n✅ Found working configuration!');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal:', error);
      process.exit(1);
    });
}
