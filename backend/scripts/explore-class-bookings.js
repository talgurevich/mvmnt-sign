#!/usr/bin/env node

/**
 * Explore Arbox Class Booking API
 *
 * Tests various endpoints to find class booking and attendance data
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function exploreClassBookings() {
  console.log('🔍 Exploring Arbox Class Booking endpoints...\n');

  // Get current date range (this month)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = firstDay.toISOString().split('T')[0];
  const endDate = lastDay.toISOString().split('T')[0];

  console.log(`Date range: ${startDate} to ${endDate}\n`);

  const endpointsToTest = [
    // Classes and schedules
    { url: '/classes', description: 'All classes' },
    { url: '/schedules', description: 'Class schedules' },
    { url: '/schedule', description: 'Schedule' },
    { url: '/boxes/schedules', description: 'Box schedules' },

    // Bookings and registrations
    { url: '/bookings', description: 'All bookings' },
    { url: '/registrations', description: 'Class registrations' },
    { url: '/appointments', description: 'Appointments' },
    { url: '/reservations', description: 'Reservations' },

    // Reports
    { url: '/reports/classes', description: 'Classes report' },
    { url: '/reports/attendance', description: 'Attendance report' },
    { url: '/reports/bookings', description: 'Bookings report' },

    // With date parameters
    { url: `/classes?startDate=${startDate}&endDate=${endDate}`, description: 'Classes with date range' },
    { url: `/bookings?startDate=${startDate}&endDate=${endDate}`, description: 'Bookings with date range' },
    { url: `/schedules?startDate=${startDate}&endDate=${endDate}`, description: 'Schedules with date range' },

    // API v2 endpoints
    { url: '/api/v2/classes', description: 'V2 Classes' },
    { url: '/api/v2/bookings', description: 'V2 Bookings' },
    { url: '/api/v2/schedules', description: 'V2 Schedules' },

    // User-specific bookings
    { url: '/users/bookings', description: 'User bookings' },
    { url: '/users/classes', description: 'User classes' },

    // Calendar and schedule box
    { url: '/schedulesBox', description: 'Schedule box' },
    { url: '/calendar', description: 'Calendar' },
    { url: `/calendar?from=${startDate}&to=${endDate}`, description: 'Calendar with dates' },
  ];

  let successfulEndpoints = [];

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Testing: ${endpoint.url}`);
      console.log(`Description: ${endpoint.description}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const response = await arboxService.client.get(endpoint.url);
      const data = response.data;

      console.log(`✅ SUCCESS!`);
      console.log(`Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      console.log(`Records: ${Array.isArray(data) ? data.length : 'N/A'}`);

      if (Array.isArray(data) && data.length > 0) {
        console.log(`\nSample record (first item):`);
        console.log(JSON.stringify(data[0], null, 2).substring(0, 1000));
        if (JSON.stringify(data[0], null, 2).length > 1000) {
          console.log('... (truncated)');
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log(`\nResponse object:`);
        console.log(JSON.stringify(data, null, 2).substring(0, 1000));
      }

      successfulEndpoints.push({
        url: endpoint.url,
        description: endpoint.description,
        recordCount: Array.isArray(data) ? data.length : 'N/A'
      });

    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`Error details:`, JSON.stringify(error.response.data).substring(0, 200));
      }
    }
    console.log('\n');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏁 SUMMARY - Successful Endpoints');
  console.log('═══════════════════════════════════════════════════════\n');

  if (successfulEndpoints.length > 0) {
    successfulEndpoints.forEach(ep => {
      console.log(`✅ ${ep.url}`);
      console.log(`   ${ep.description}`);
      console.log(`   Records: ${ep.recordCount}`);
      console.log('');
    });
  } else {
    console.log('❌ No successful endpoints found');
  }
}

// Run the script
if (require.main === module) {
  exploreClassBookings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = exploreClassBookings;
