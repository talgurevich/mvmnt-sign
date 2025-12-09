#!/usr/bin/env node

/**
 * Test Arbox Schedule API with Box ID
 *
 * Tests the schedule endpoint with box_fk parameter
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testScheduleWithBox() {
  console.log('🔍 Testing Arbox Schedule API with Box ID...\n');

  // First, get a user to extract the box_fk
  console.log('Step 1: Getting box_fk from users...\n');
  const users = await arboxService.getUsers();
  const boxFk = users[0]?.box_fk;
  const locationsBoxFk = users[0]?.locations_box_fk;

  console.log(`Found box_fk: ${boxFk}`);
  console.log(`Found locations_box_fk: ${locationsBoxFk}\n`);

  // Get a 6-day date range (to be safe, less than 7)
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 5);

  const startDateStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Date range: ${startDateStr} to ${endDateStr}\n`);

  const testEndpoints = [
    `/schedule?from=${startDateStr}&to=${endDateStr}&box_fk=${boxFk}`,
    `/schedule?from=${startDateStr}&to=${endDateStr}&boxFk=${boxFk}`,
    `/schedule?from=${startDateStr}&to=${endDateStr}&box=${boxFk}`,
    `/schedulesBox?from=${startDateStr}&to=${endDateStr}&box_fk=${boxFk}`,
    `/schedulesBox/${boxFk}?from=${startDateStr}&to=${endDateStr}`,
    `/schedule/${boxFk}?from=${startDateStr}&to=${endDateStr}`,
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

      if (Array.isArray(data)) {
        console.log(`Records: ${data.length}`);
        if (data.length > 0) {
          console.log(`\n📋 First record:\n`);
          console.log(JSON.stringify(data[0], null, 2).substring(0, 1500));
          console.log('\n...\n');
          return { endpoint, data };
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log(`\n📋 Response:`);
        console.log(JSON.stringify(data, null, 2).substring(0, 1500));

        // Check if it's a success response with data inside
        if (data.data && Array.isArray(data.data)) {
          console.log(`\nFound data array inside response! Count: ${data.data.length}`);
          if (data.data.length > 0) {
            console.log(`\n📋 First record from data.data:\n`);
            console.log(JSON.stringify(data.data[0], null, 2).substring(0, 1500));
            return { endpoint, data: data.data };
          }
        }

        if (!data.error && Object.keys(data).length > 0) {
          return { endpoint, data };
        }
      }

    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        const errorStr = JSON.stringify(error.response.data);
        console.log(`Error:`, errorStr.substring(0, 300));
      }
    }
    console.log('\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Trying alternative approaches...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Try getting user-specific bookings
  const userId = users[0]?.id;
  const alternativeEndpoints = [
    `/users/${userId}/bookings`,
    `/users/${userId}/schedule`,
    `/box/${boxFk}/schedule?from=${startDateStr}&to=${endDateStr}`,
  ];

  for (const endpoint of alternativeEndpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await arboxService.client.get(endpoint);
      const data = response.data;

      console.log(`✅ SUCCESS! Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Records: ${data.length}`);
        console.log(JSON.stringify(data[0], null, 2).substring(0, 1000));
        return { endpoint, data };
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status || error.message}`);
    }
    console.log('');
  }

  console.log('\n❌ No successful endpoint found for schedule data\n');
  return null;
}

// Run the script
if (require.main === module) {
  testScheduleWithBox()
    .then(result => {
      if (result) {
        console.log(`\n✅ Schedule API working with endpoint: ${result.endpoint}`);
        console.log(`Found ${Array.isArray(result.data) ? result.data.length : 'N/A'} records`);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = testScheduleWithBox;
