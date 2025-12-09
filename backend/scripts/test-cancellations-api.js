#!/usr/bin/env node

/**
 * Test Arbox Cancellation/Registration API
 *
 * Looking for ways to detect cancellations so we can notify waitlisted users
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testCancellationsAPI() {
  console.log('🔍 Searching for cancellation/registration data...\n');

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const startDate = today.toISOString().split('T')[0];
  const endDate = nextWeek.toISOString().split('T')[0];
  const pastDate = yesterday.toISOString().split('T')[0];

  // Endpoints to test for registration/cancellation data
  const endpoints = [
    // Schedule with different params - might include registrations
    { url: '/schedule', params: { fDate: startDate, tDate: endDate } },
    { url: '/schedule', params: { fDate: startDate, tDate: endDate, includeUsers: true } },
    { url: '/schedule', params: { fDate: startDate, tDate: endDate, withRegistrations: true } },

    // Possible registration endpoints
    { url: '/registrations', params: { fDate: startDate, tDate: endDate } },
    { url: '/bookings', params: { fDate: startDate, tDate: endDate } },
    { url: '/schedule/registrations', params: { fDate: startDate, tDate: endDate } },
    { url: '/schedule/bookings', params: { fDate: startDate, tDate: endDate } },

    // Cancellation specific
    { url: '/cancellations', params: { fDate: pastDate, tDate: endDate } },
    { url: '/schedule/cancellations', params: { fDate: pastDate, tDate: endDate } },

    // Trial bookings (documented endpoint)
    { url: '/schedule/booking/trial', params: {} },
    { url: '/schedule/booking/trial', params: { fDate: startDate, tDate: endDate } },

    // Reports that might have this data
    { url: '/reports/registrations', params: { fDate: startDate, tDate: endDate } },
    { url: '/reports/cancellations', params: { fDate: pastDate, tDate: endDate } },
    { url: '/reports/attendance', params: { fDate: pastDate, tDate: endDate } },
    { url: '/reports/schedule', params: { fDate: startDate, tDate: endDate } },

    // Schedules box (worked before)
    { url: '/schedulesBox', params: { fDate: startDate, tDate: endDate } },

    // User-related
    { url: '/users/registrations', params: { fDate: startDate, tDate: endDate } },
    { url: '/users/bookings', params: { fDate: startDate, tDate: endDate } },

    // Logs/history
    { url: '/logs', params: { fDate: pastDate, tDate: endDate } },
    { url: '/history', params: { fDate: pastDate, tDate: endDate } },
    { url: '/schedule/history', params: { fDate: pastDate, tDate: endDate } },
  ];

  const successfulEndpoints = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Testing: GET ${endpoint.url}`);
      console.log(`Params: ${JSON.stringify(endpoint.params)}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const response = await arboxService.client.get(endpoint.url, { params: endpoint.params });
      const data = response.data;

      console.log(`✅ SUCCESS! Status: ${response.status}`);

      if (Array.isArray(data)) {
        console.log(`Records: ${data.length}`);

        if (data.length > 0) {
          const sample = data[0];
          console.log('\n📋 Sample record fields:');
          Object.keys(sample).forEach(key => {
            const value = sample[key];
            const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
            console.log(`   - ${key}: ${type}`);
          });

          // Look for cancellation/registration related fields
          const relevantFields = Object.keys(sample).filter(k => {
            const lower = k.toLowerCase();
            return lower.includes('cancel') ||
                   lower.includes('registr') ||
                   lower.includes('book') ||
                   lower.includes('attend') ||
                   lower.includes('user') ||
                   lower.includes('capacity') ||
                   lower.includes('max') ||
                   lower.includes('limit') ||
                   lower.includes('available') ||
                   lower.includes('spot') ||
                   lower.includes('slot');
          });

          if (relevantFields.length > 0) {
            console.log('\n🎯 Relevant fields found:', relevantFields.join(', '));
            relevantFields.forEach(field => {
              const value = sample[field];
              if (value !== null && value !== undefined) {
                const preview = typeof value === 'object'
                  ? JSON.stringify(value).substring(0, 200)
                  : value;
                console.log(`   ${field}: ${preview}`);
              }
            });
          }

          // Show full sample if it looks useful
          const sampleStr = JSON.stringify(sample, null, 2);
          if (sampleStr.length < 1500) {
            console.log('\n📄 Full sample:');
            console.log(sampleStr);
          }

          successfulEndpoints.push({
            url: endpoint.url,
            params: endpoint.params,
            recordCount: data.length,
            fields: Object.keys(sample)
          });
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log('Response is object');
        console.log(JSON.stringify(data, null, 2).substring(0, 1000));
        successfulEndpoints.push({
          url: endpoint.url,
          params: endpoint.params,
          type: 'object'
        });
      }

    } catch (error) {
      const status = error.response?.status;
      console.log(`❌ FAILED: ${status || error.message}`);
    }
    console.log('\n');
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 SUCCESSFUL ENDPOINTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  if (successfulEndpoints.length > 0) {
    successfulEndpoints.forEach(ep => {
      console.log(`✅ ${ep.url}`);
      console.log(`   Records: ${ep.recordCount || ep.type || 'N/A'}`);
      if (ep.fields) {
        console.log(`   Fields: ${ep.fields.slice(0, 10).join(', ')}${ep.fields.length > 10 ? '...' : ''}`);
      }
      console.log('');
    });
  } else {
    console.log('❌ No successful endpoints found');
  }
}

// Run
if (require.main === module) {
  testCancellationsAPI()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = testCancellationsAPI;
