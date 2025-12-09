#!/usr/bin/env node

/**
 * Test Arbox Schedule API
 *
 * Tests the schedule endpoint with proper parameters
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testScheduleAPI() {
  console.log('🔍 Testing Arbox Schedule API...\n');

  // Get a 7-day date range (today + 6 days)
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 6);

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Date range: ${startDateStr} to ${endDateStr} (7 days)\n`);

  const testEndpoints = [
    `/schedule?fDate=${startDateStr}&tDate=${endDateStr}`,
    `/schedule?from=${startDateStr}&to=${endDateStr}`,
    `/schedule?startDate=${startDateStr}&endDate=${endDateStr}`,
    `/schedulesBox?fDate=${startDateStr}&tDate=${endDateStr}`,
    `/schedulesBox?from=${startDateStr}&to=${endDateStr}`,
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Testing: ${endpoint}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const response = await arboxService.client.get(endpoint);
      const data = response.data;

      console.log(`✅ SUCCESS!`);
      console.log(`Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      console.log(`Records: ${Array.isArray(data) ? data.length : 'N/A'}`);

      if (Array.isArray(data) && data.length > 0) {
        console.log(`\n📋 First 3 records:\n`);
        data.slice(0, 3).forEach((item, idx) => {
          console.log(`Record ${idx + 1}:`);
          console.log(JSON.stringify(item, null, 2));
          console.log('');
        });
      } else if (typeof data === 'object' && data !== null) {
        console.log(`\n📋 Response structure:`);
        console.log(JSON.stringify(data, null, 2).substring(0, 2000));
      }

      // Success! Let's analyze the structure
      console.log('\n✨ Found working endpoint! Analyzing structure...\n');

      if (Array.isArray(data) && data.length > 0) {
        const sample = data[0];
        console.log('📊 Available fields in schedule data:');
        Object.keys(sample).forEach(key => {
          console.log(`   - ${key}: ${typeof sample[key]}`);
        });
      }

      return { endpoint, data };

    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`Error:`, JSON.stringify(error.response.data));
      }
    }
    console.log('\n');
  }

  console.log('❌ No successful endpoint found for schedule data\n');
  return null;
}

// Run the script
if (require.main === module) {
  testScheduleAPI()
    .then(result => {
      if (result) {
        console.log(`\n✅ Schedule API working with endpoint: ${result.endpoint}`);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = testScheduleAPI;
