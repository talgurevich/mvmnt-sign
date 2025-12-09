#!/usr/bin/env node

/**
 * Test Schedule API with correct date format and parameters
 * Based on official Arbox API documentation
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testScheduleCorrect() {
  console.log('Testing Schedule API with correct format...\n');

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 6); // Max 7 days

  // Format as dd-mm-YYYY (European format)
  const formatDate = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const fromDate = formatDate(today);
  const toDate = formatDate(endDate);

  console.log(`Date range: ${fromDate} to ${toDate} (dd-mm-YYYY format)\n`);

  // Test with different parameter combinations
  const tests = [
    // Basic request with correct date format
    {
      desc: 'Basic schedule (dd-mm-YYYY)',
      body: { from: fromDate, to: toDate }
    },
    // With bookings count
    {
      desc: 'With bookings count',
      body: { from: fromDate, to: toDate, bookings: true }
    },
    // With waiting list count
    {
      desc: 'With waiting list',
      body: { from: fromDate, to: toDate, waiting_list: true }
    },
    // With both bookings and waiting list
    {
      desc: 'With bookings + waiting list',
      body: { from: fromDate, to: toDate, bookings: true, waiting_list: true }
    },
    // With booked users details
    {
      desc: 'With booked users details',
      body: { from: fromDate, to: toDate, bookings: true, waiting_list: true, booked_users: true }
    },
    // Try mm-dd-YYYY format
    {
      desc: 'mm-dd-YYYY format',
      body: {
        from: `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`,
        to: `${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}-${endDate.getFullYear()}`
      }
    },
    // With location
    {
      desc: 'With location 12222',
      body: { from: fromDate, to: toDate, bookings: true, waiting_list: true, location: 12222 }
    },
  ];

  for (const test of tests) {
    try {
      console.log('━'.repeat(60));
      console.log(`Testing: ${test.desc}`);
      console.log(`Body: ${JSON.stringify(test.body)}`);
      console.log('━'.repeat(60));

      const response = await arboxService.client.request({
        method: 'GET',
        url: '/schedule',
        data: test.body
      });

      const data = response.data;

      // Check for API error
      if (data.statusCode && data.statusCode !== 200) {
        console.log(`API Error: ${data.error?.description || JSON.stringify(data.error)}`);
        console.log('');
        continue;
      }

      // Check if response has data array
      const schedules = data.data || data;

      if (Array.isArray(schedules)) {
        console.log(`✅ SUCCESS! Got ${schedules.length} sessions`);

        if (schedules.length > 0) {
          const sample = schedules[0];
          console.log('\nFields available:');
          Object.keys(sample).forEach(key => {
            const value = sample[key];
            const display = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value;
            console.log(`   ${key}: ${display}`);
          });

          // Look for capacity-related fields
          const capacityFields = ['maxMembers', 'bookings', 'waiting_list', 'booked_users', 'registrations'];
          console.log('\n🎯 Capacity fields:');
          capacityFields.forEach(field => {
            if (sample[field] !== undefined) {
              console.log(`   ${field}: ${JSON.stringify(sample[field])}`);
            }
          });

          // Show a couple of full samples
          console.log('\n📋 Sample sessions:');
          schedules.slice(0, 2).forEach((s, i) => {
            console.log(`\n--- Session ${i + 1} ---`);
            console.log(JSON.stringify(s, null, 2));
          });

          // If we got capacity data, we're done!
          if (sample.maxMembers !== undefined || sample.bookings !== undefined) {
            console.log('\n✨ Found capacity data! This is the working configuration.');
            return { test, schedules };
          }
        }
      } else {
        console.log('Response:', JSON.stringify(data).substring(0, 500));
      }

    } catch (error) {
      const status = error.response?.status;
      const errMsg = error.response?.data?.error || error.response?.data?.error_body || error.message;
      console.log(`❌ ${status || 'Error'}: ${errMsg}`);
    }
    console.log('');
  }

  console.log('\n❌ Could not get schedule with capacity data');
}

testScheduleCorrect()
  .then(result => {
    if (result) {
      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS! Schedule API working with:');
      console.log(JSON.stringify(result.test.body, null, 2));
    }
    process.exit(0);
  })
  .catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
